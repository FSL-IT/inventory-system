<?php
// src/api/assets.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

requireLogin();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id     = getQueryInt('id');
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $id && $action === 'transfers') {
    fetchTransfers($id);
} elseif ($method === 'GET' && $id) {
    fetchSingleAsset($id);
} elseif ($method === 'GET') {
    fetchAssets();
} elseif ($method === 'POST' && $action === 'bulk') {
    requireCsrf();
    bulkCreateAssets();
} elseif ($method === 'POST') {
    requireCsrf();
    createAsset();
} elseif ($method === 'PUT') {
    requireCsrf();
    updateAsset($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    deleteAsset($id);
} else {
    sendError('Method not allowed.', 405);
}

// ─── TRANSFERS ───────────────────────────────────────────────────
function fetchTransfers(int $assetId): void
{
    $pdo  = getDbConnection();
    $stmt = $pdo->prepare('
        SELECT
            at.transferred_at,
            at.notes,
            u.username           AS transferred_by,
            fl.name              AS from_location,
            tl.name              AS to_location,
            fo.name              AS from_owner,
            too.name             AS to_owner
        FROM asset_transfers at
        LEFT JOIN users          u   ON at.transferred_by   = u.id
        LEFT JOIN locations      fl  ON at.from_location_id = fl.id
        LEFT JOIN locations      tl  ON at.to_location_id   = tl.id
        LEFT JOIN process_owners fo  ON at.from_owner_id    = fo.id
        LEFT JOIN process_owners too ON at.to_owner_id      = too.id
        WHERE at.asset_id = :asset_id
        ORDER BY at.transferred_at DESC
        LIMIT 20
    ');
    $stmt->execute([':asset_id' => $assetId]);
    sendSuccess($stmt->fetchAll());
}

// ─── FETCH SINGLE ────────────────────────────────────────────────
function fetchSingleAsset(int $id): void
{
    $pdo  = getDbConnection();
    $stmt = $pdo->prepare('
        SELECT
            a.id, a.serial_number, a.description,
            a.status, a.remarks,
            a.created_at, a.updated_at,
            c.id   AS category_id,
            c.name AS category_name,
            l.id   AS location_id,
            l.name AS location_name,
            o.id   AS owner_id,
            o.name AS owner_name,
            po.id        AS po_id,
            po.po_number,
            po.date_received,
            po.date_endorsed,
            v.id   AS vendor_id,
            v.name AS vendor_name
        FROM assets a
        LEFT JOIN categories      c  ON a.category_id = c.id
        LEFT JOIN locations       l  ON a.location_id  = l.id
        LEFT JOIN process_owners  o  ON a.owner_id     = o.id
        LEFT JOIN purchase_orders po ON a.po_id        = po.id
        LEFT JOIN vendors         v  ON po.vendor_id   = v.id
        WHERE a.id = :id AND a.deleted_at IS NULL
        LIMIT 1
    ');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        sendError('Asset not found.', 404);
    }

    sendSuccess($row);
}

// ─── FETCH LIST ──────────────────────────────────────────────────
function fetchAssets(): void
{
    // FIX: Release the PHP session lock immediately so this 
    // request isn't blocked by other background network calls.
    session_write_close(); 

    $pdo     = getDbConnection();
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $perPage = max(1, (int)($_GET['per_page'] ?? 25));
    $offset  = ($page - 1) * $perPage;

    $where  = "a.deleted_at IS NULL";
    $params = [];
    $needsJoinsForCount = false;

    if (!empty($_GET['search'])) {
        $term = $_GET['search'];
        
        $where .= " AND (
            a.serial_number = :exact1 
            OR po.po_number = :exact2 
            OR a.serial_number LIKE :start1 
            OR po.po_number LIKE :start2 
            OR a.description LIKE :any1 
            OR v.name LIKE :any2
        )";
        
        $params[':exact1'] = $term;
        $params[':exact2'] = $term;
        $params[':start1'] = $term . '%';
        $params[':start2'] = $term . '%';
        $params[':any1']   = '%' . $term . '%';
        $params[':any2']   = '%' . $term . '%';
        
        $needsJoinsForCount = true; 
    }

    // Dropdown filters
    if (!empty($_GET['status'])) {
        $where .= " AND a.status = :status";
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['category_id'])) {
        $where .= " AND a.category_id = :category_id";
        $params[':category_id'] = (int) $_GET['category_id'];
    }
    if (!empty($_GET['location_id'])) {
        $where .= " AND a.location_id = :location_id";
        $params[':location_id'] = (int) $_GET['location_id'];
    }
    if (!empty($_GET['owner_id'])) {
        $where .= " AND a.owner_id = :owner_id";
        $params[':owner_id'] = (int) $_GET['owner_id'];
    }

    $countFrom = "FROM assets a";
    if ($needsJoinsForCount) {
        $countFrom .= " LEFT JOIN purchase_orders po ON a.po_id = po.id
                        LEFT JOIN vendors v ON po.vendor_id = v.id";
    }

    $countSql  = "SELECT COUNT(*) $countFrom WHERE $where";
    $countStmt = $pdo->prepare($countSql);
    foreach ($params as $key => $val) {
        $countStmt->bindValue($key, $val);
    }
    $countStmt->execute();
    $totalRows = (int) $countStmt->fetchColumn();

    $from = "FROM assets a
        LEFT JOIN categories      c  ON a.category_id = c.id
        LEFT JOIN locations       l  ON a.location_id  = l.id
        LEFT JOIN process_owners  o  ON a.owner_id     = o.id
        LEFT JOIN purchase_orders po ON a.po_id        = po.id
        LEFT JOIN vendors         v  ON po.vendor_id   = v.id";

    $allowedSorts = [
        'a.serial_number', 'a.description', 'c.name', 'po.po_number', 
        'l.name', 'o.name', 'a.status', 'po.date_received', 'a.created_at'
    ];
    $sortCol = $_GET['sort'] ?? 'a.created_at';
    if (!in_array($sortCol, $allowedSorts)) {
        $sortCol = 'a.created_at';
    }
    $sortDir = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

    $sql = "
        SELECT
            a.id, a.serial_number, a.description,
            a.status, a.remarks,
            a.created_at, a.updated_at,
            c.id   AS category_id,
            c.name AS category_name,
            l.id   AS location_id,
            l.name AS location_name,
            o.id   AS owner_id,
            o.name AS owner_name,
            po.id        AS po_id,
            po.po_number,
            po.date_received,
            po.date_endorsed,
            v.id   AS vendor_id,
            v.name AS vendor_name
        $from
        WHERE $where
        ORDER BY $sortCol $sortDir
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    sendPaginated($stmt->fetchAll(), $totalRows, $page, $perPage);
}

// ─── CREATE ──────────────────────────────────────────────────────
function createAsset(): void
{
    $body   = json_decode(file_get_contents('php://input'), true);
    $errors = validateRequired(
        ['serial_number', 'description', 'category_id',
         'location_id', 'owner_id'],
        $body
    );

    if ($errors) {
        sendError(implode(' ', $errors), 422);
    }

    $serial     = sanitizeString($body['serial_number']);
    $desc       = sanitizeString($body['description']);
    $categoryId = (int) $body['category_id'];
    $locationId = (int) $body['location_id'];
    $ownerId    = (int) $body['owner_id'];
    $status     = sanitizeString($body['status'] ?? 'active');
    $poId       = !empty($body['po_id'])
        ? (int) $body['po_id'] : null;
    $remarks    = sanitizeString($body['remarks'] ?? '');

    if (!validateEnum($status, ASSET_STATUSES)) {
        sendError('Invalid status value.', 422);
    }

    $pdo = getDbConnection();
    $dup = $pdo->prepare(
        'SELECT id FROM assets WHERE serial_number = :sn LIMIT 1'
    );
    $dup->execute([':sn' => $serial]);

    if ($dup->fetch()) {
        sendError('Serial number already exists.', 409);
    }

    $stmt = $pdo->prepare('
        INSERT INTO assets
            (serial_number, description, po_id, category_id,
             location_id, owner_id, remarks, status)
        VALUES
            (:sn, :desc, :po_id, :cat_id,
             :loc_id, :owner_id, :remarks, :status)
    ');
    $stmt->execute([
        ':sn'       => $serial,
        ':desc'     => $desc,
        ':po_id'    => $poId,
        ':cat_id'   => $categoryId,
        ':loc_id'   => $locationId,
        ':owner_id' => $ownerId,
        ':remarks'  => $remarks,
        ':status'   => $status,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logAudit($_SESSION['user_id'], 'INSERT', 'assets', $newId, [
        'before' => [],
        'after'  => compact(
            'serial', 'desc', 'status', 'categoryId'
        ),
    ]);

    sendSuccess(['id' => $newId], 'Asset created successfully.');
}

// ─── BULK CREATE ─────────────────────────────────────────────────
function bulkCreateAssets(): void
{
    $body    = json_decode(file_get_contents('php://input'), true);
    $serials = $body['serials'] ?? [];

    if (!is_array($serials) || !$serials) {
        sendError('serials array is required.', 422);
    }

    $desc       = sanitizeString($body['description']  ?? '');
    $categoryId = (int) ($body['category_id']          ?? 0);
    $locationId = (int) ($body['location_id']          ?? 0);
    $ownerId    = (int) ($body['owner_id']             ?? 0);
    $status     = sanitizeString($body['status']       ?? 'active');
    $poId       = !empty($body['po_id']) ? (int) $body['po_id'] : null;
    $remarks    = sanitizeString($body['remarks']      ?? '');

    if (!$desc || !$categoryId || !$locationId || !$ownerId) {
        sendError('description, category, location, and owner are required.', 422);
    }

    if (!validateEnum($status, ASSET_STATUSES)) {
        sendError('Invalid status value.', 422);
    }

    $pdo      = getDbConnection();
    $dupCheck = $pdo->prepare('SELECT id FROM assets WHERE serial_number = :sn LIMIT 1');
    $ins = $pdo->prepare('
        INSERT INTO assets
            (serial_number, description, po_id, category_id,
             location_id, owner_id, remarks, status)
        VALUES
            (:sn, :desc, :po_id, :cat_id,
             :loc_id, :owner_id, :remarks, :status)
    ');

    $inserted = 0;
    $skipped  = [];

    try {
        $pdo->beginTransaction();

        foreach ($serials as $rawSn) {
            $sn = sanitizeString((string) $rawSn);
            if (!$sn) {
                continue;
            }

            $dupCheck->execute([':sn' => $sn]);
            if ($dupCheck->fetch()) {
                $skipped[] = $sn;
                continue;
            }

            $ins->execute([
                ':sn'       => $sn,
                ':desc'     => $desc,
                ':po_id'    => $poId,
                ':cat_id'   => $categoryId,
                ':loc_id'   => $locationId,
                ':owner_id' => $ownerId,
                ':remarks'  => $remarks,
                ':status'   => $status,
            ]);

            $newId = (int) $pdo->lastInsertId();
            logAudit($_SESSION['user_id'], 'INSERT', 'assets', $newId, [
                'before' => [],
                'after'  => [
                    'serial_number' => $sn,
                    'description'   => $desc,
                    'category_id'   => $categoryId,
                    'status'        => $status,
                ],
            ]);

            $inserted++;
        }

        $pdo->commit();

    } catch (Exception $e) {
        $pdo->rollBack();
        sendError('A database error occurred during bulk insert. No assets were saved.', 500);
    }

    sendSuccess(
        ['inserted' => $inserted, 'skipped' => $skipped],
        "{$inserted} asset(s) created."
    );
}

// ─── UPDATE ──────────────────────────────────────────────────────
function updateAsset(int $id): void
{
    if (!$id) {
        sendError('Asset ID is required.', 400);
    }

    $pdo     = getDbConnection();
    $oldStmt = $pdo->prepare(
        'SELECT * FROM assets
         WHERE id = :id AND deleted_at IS NULL LIMIT 1'
    );
    $oldStmt->execute([':id' => $id]);
    $old = $oldStmt->fetch();

    if (!$old) {
        sendError('Asset not found.', 404);
    }

    $body       = json_decode(
        file_get_contents('php://input'), true
    );
    $serial     = sanitizeString(
        $body['serial_number'] ?? $old['serial_number']);
    $desc       = sanitizeString(
        $body['description']   ?? $old['description']);
    $categoryId = (int) ($body['category_id'] ?? $old['category_id']);
    $status     = sanitizeString($body['status'] ?? $old['status']);
    
    $locationId = array_key_exists('location_id', $body)
        ? ($body['location_id'] ? (int) $body['location_id'] : null)
        : $old['location_id'];
        
    $ownerId    = array_key_exists('owner_id', $body)
        ? ($body['owner_id'] ? (int) $body['owner_id'] : null)
        : $old['owner_id'];
        
    $poId       = array_key_exists('po_id', $body)
        ? ($body['po_id'] ? (int) $body['po_id'] : null)
        : $old['po_id'];
        
    $remarks    = sanitizeString($body['remarks'] ?? $old['remarks']);
    
    $transferNote = sanitizeString($body['transfer_note'] ?? '');

    if (!validateEnum($status, ASSET_STATUSES)) {
        sendError('Invalid status value.', 422);
    }

    if ($serial !== $old['serial_number']) {
        $dupChk = $pdo->prepare(
            'SELECT id FROM assets
             WHERE serial_number = :sn
               AND id != :id
             LIMIT 1'
        );
        $dupChk->execute([':sn' => $serial, ':id' => $id]);
        if ($dupChk->fetch()) {
            sendError(
                'Serial number already exists on another asset.',
                409
            );
        }
    }

    $upd = $pdo->prepare('
        UPDATE assets SET
            serial_number = :sn,
            description   = :desc,
            po_id         = :po_id,
            category_id   = :cat_id,
            location_id   = :loc_id,
            owner_id      = :owner_id,
            remarks       = :remarks,
            status        = :status
        WHERE id = :id
    ');
    $upd->execute([
        ':sn'       => $serial,
        ':desc'     => $desc,
        ':po_id'    => $poId,
        ':cat_id'   => $categoryId,
        ':loc_id'   => $locationId,
        ':owner_id' => $ownerId,
        ':remarks'  => $remarks,
        ':status'   => $status,
        ':id'       => $id,
    ]);

    // Log transfer if location or owner changed
    $locationChanged =
        (int) $old['location_id'] !== (int) $locationId;
    $ownerChanged    =
        (int) $old['owner_id']    !== (int) $ownerId;

    if ($locationChanged || $ownerChanged) {
        $ins = $pdo->prepare('
            INSERT INTO asset_transfers
                (asset_id, from_owner_id, to_owner_id,
                 from_location_id, to_location_id,
                 transferred_by, notes)
            VALUES
                (:asset_id, :from_owner, :to_owner,
                 :from_loc, :to_loc, :by, :notes)
        ');
        $ins->execute([
            ':asset_id'   => $id,
            ':from_owner' => $old['owner_id'],
            ':to_owner'   => $ownerId,
            ':from_loc'   => $old['location_id'],
            ':to_loc'     => $locationId,
            ':by'         => $_SESSION['user_id'],
            ':notes'      => $transferNote ?: null,
        ]);
    }

    logAudit($_SESSION['user_id'], 'UPDATE', 'assets', $id, [
        'before' => $old,
        'after'  => compact(
            'serial', 'desc', 'status', 'categoryId'
        ),
    ]);

    sendSuccess([], 'Asset updated successfully.');
}

// ─── DELETE ──────────────────────────────────────────────────────
function deleteAsset(int $id): void
{
    if (!$id) {
        sendError('Asset ID is required.', 400);
    }

    $pdo  = getDbConnection();
    $stmt = $pdo->prepare(
        'SELECT * FROM assets
         WHERE id = :id AND deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute([':id' => $id]);
    $asset = $stmt->fetch();

    if (!$asset) {
        sendError('Asset not found.', 404);
    }

    if (isAdmin()) {
        $del = $pdo->prepare(
            'DELETE FROM assets WHERE id = :id'
        );
        $del->execute([':id' => $id]);
    } else {
        $del = $pdo->prepare(
            "UPDATE assets
             SET deleted_at = NOW(), status = 'retired'
             WHERE id = :id"
        );
        $del->execute([':id' => $id]);
    }

    logAudit($_SESSION['user_id'], 'DELETE', 'assets', $id, [
        'before' => $asset,
        'after'  => [],
    ]);

    sendSuccess([], 'Asset deleted successfully.');
}