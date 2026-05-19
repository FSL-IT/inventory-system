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

if ($method === 'GET' && $id) {
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

function fetchAssets(): void
{
    $pdo     = getDbConnection();
    $perPage = getQueryInt('per_page', 10000);

    $whereClause = 'WHERE a.deleted_at IS NULL';

    $countSql  = "SELECT COUNT(*) FROM assets a {$whereClause}";
    $countStmt = $pdo->query($countSql);
    $total     = (int) $countStmt->fetchColumn();

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
        FROM assets a
        LEFT JOIN categories      c  ON a.category_id = c.id
        LEFT JOIN locations       l  ON a.location_id  = l.id
        LEFT JOIN process_owners  o  ON a.owner_id     = o.id
        LEFT JOIN purchase_orders po ON a.po_id        = po.id
        LEFT JOIN vendors         v  ON po.vendor_id   = v.id
        {$whereClause}
        ORDER BY a.created_at DESC
        LIMIT :limit
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->execute();

    sendPaginated($stmt->fetchAll(), $total, 1, $perPage);
}

function createAsset(): void
{
    $body   = json_decode(file_get_contents('php://input'), true);
    $errors = validateRequired(
        ['serial_number', 'description', 'category_id'],
        $body
    );

    if ($errors) {
        sendError(implode(' ', $errors), 422);
    }

    $serial     = sanitizeString($body['serial_number']);
    $desc       = sanitizeString($body['description']);
    $categoryId = (int) $body['category_id'];
    $status     = sanitizeString($body['status'] ?? 'active');
    $locationId = !empty($body['location_id'])
        ? (int) $body['location_id'] : null;
    $ownerId    = !empty($body['owner_id'])
        ? (int) $body['owner_id']    : null;
    $poId       = !empty($body['po_id'])
        ? (int) $body['po_id']       : null;
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
        'after'  => compact('serial', 'desc', 'status', 'categoryId'),
    ]);

    sendSuccess(['id' => $newId], 'Asset created successfully.');
}

/**
 * Bulk insert: accepts an array of serial numbers that all share the
 * same description, category, status, po, location, owner, remarks.
 * Returns counts of inserted vs skipped (duplicate) rows.
 */
function bulkCreateAssets(): void
{
    $body = json_decode(file_get_contents('php://input'), true);

    $serials = $body['serials'] ?? [];
    if (!is_array($serials) || !$serials) {
        sendError('serials array is required.', 422);
    }

    $desc       = sanitizeString($body['description'] ?? '');
    $categoryId = (int) ($body['category_id'] ?? 0);
    $status     = sanitizeString($body['status'] ?? 'active');
    $locationId = !empty($body['location_id'])
        ? (int) $body['location_id'] : null;
    $ownerId    = !empty($body['owner_id'])
        ? (int) $body['owner_id']    : null;
    $poId       = !empty($body['po_id'])
        ? (int) $body['po_id']       : null;
    $remarks    = sanitizeString($body['remarks'] ?? '');

    if (!$desc || !$categoryId) {
        sendError('description and category_id are required.', 422);
    }

    if (!validateEnum($status, ASSET_STATUSES)) {
        sendError('Invalid status value.', 422);
    }

    $pdo = getDbConnection();

    $dupCheck = $pdo->prepare(
        'SELECT id FROM assets WHERE serial_number = :sn LIMIT 1'
    );
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

    sendSuccess(
        ['inserted' => $inserted, 'skipped' => $skipped],
        "{$inserted} asset(s) created."
    );
}

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

    $body       = json_decode(file_get_contents('php://input'), true);
    $serial     = sanitizeString(
        $body['serial_number'] ?? $old['serial_number']
    );
    $desc       = sanitizeString(
        $body['description']   ?? $old['description']
    );
    $categoryId = (int) ($body['category_id'] ?? $old['category_id']);
    $status     = sanitizeString($body['status'] ?? $old['status']);
    $locationId = isset($body['location_id'])
        ? ((int) $body['location_id'] ?: null)
        : $old['location_id'];
    $ownerId    = isset($body['owner_id'])
        ? ((int) $body['owner_id'] ?: null)
        : $old['owner_id'];
    $poId       = isset($body['po_id'])
        ? ((int) $body['po_id'] ?: null)
        : $old['po_id'];
    $remarks    = sanitizeString($body['remarks'] ?? $old['remarks']);

    if (!validateEnum($status, ASSET_STATUSES)) {
        sendError('Invalid status value.', 422);
    }

    $stmt = $pdo->prepare('
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
    $stmt->execute([
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

    logAudit($_SESSION['user_id'], 'UPDATE', 'assets', $id, [
        'before' => $old,
        'after'  => compact(
            'serial', 'desc', 'status', 'categoryId'
        ),
    ]);

    sendSuccess([], 'Asset updated successfully.');
}

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
        $action = 'DELETE (hard)';
    } else {
        $del = $pdo->prepare(
            "UPDATE assets
             SET deleted_at = NOW(), status = 'retired'
             WHERE id = :id"
        );
        $del->execute([':id' => $id]);
        $action = 'DELETE (soft)';
    }

    logAudit($_SESSION['user_id'], 'DELETE', 'assets', $id, [
        'before' => $asset,
        'after'  => ['action' => $action],
    ]);

    sendSuccess([], 'Asset deleted successfully.');
}