<?php
// src/api/purchase_orders.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

requireLogin();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id     = getQueryInt('id');
$action = $_GET['action'] ?? '';

if ($method === 'GET' && $id && $action === 'assets') {
    fetchPOAssets($id);
} elseif ($method === 'GET' && $id) {
    fetchSinglePO($id);
} elseif ($method === 'GET') {
    fetchPOs();
} elseif ($method === 'POST') {
    requireCsrf();
    createPO();
} elseif ($method === 'PUT') {
    requireCsrf();
    if ($action === 'endorse') {
        endorsePO($id);
    } else {
        updatePO($id);
    }
} elseif ($method === 'DELETE') {
    requireCsrf();
    if (!isAdmin()) {
        sendError('Forbidden: Administrative privileges required.', 403);
    }
    deletePO($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchSinglePO(int $id): void
{
    $pdo  = getDbConnection();
    $stmt = $pdo->prepare('
        SELECT po.*, v.id AS vendor_id, v.name AS vendor_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = :id
        LIMIT 1
    ');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        sendError('Purchase order not found.', 404);
    }

    sendSuccess($row);
}

/**
 * Fetch assets for one PO grouped per Excel row structure:
 * Category | Description | Quantity | Location | Owner | Remarks
 */
function fetchPOAssets(int $poId): void
{
    $pdo  = getDbConnection();
    $stmt = $pdo->prepare('
        SELECT
            c.name  AS category,
            a.description,
            COUNT(a.id) AS quantity,
            l.name  AS location,
            o.name  AS owner,
            a.remarks
        FROM assets a
        LEFT JOIN categories     c ON a.category_id = c.id
        LEFT JOIN locations      l ON a.location_id  = l.id
        LEFT JOIN process_owners o ON a.owner_id     = o.id
        WHERE a.po_id = :po_id
          AND a.deleted_at IS NULL
        GROUP BY
            c.name, a.description,
            l.name, o.name, a.remarks
        ORDER BY c.name, a.description
    ');
    $stmt->execute([':po_id' => $poId]);
    sendSuccess($stmt->fetchAll());
}

function fetchPOs(): void
{
    $pdo     = getDbConnection();
    $perPage = getQueryInt('per_page', 5000);

    $conditions = ['1=1'];
    $params     = [];

    $categoryId = getQueryInt('category_id');
    $ownerId    = getQueryInt('owner_id');

    if ($categoryId) {
        $conditions[] =
            'EXISTS (
                SELECT 1 FROM assets a2
                WHERE a2.po_id = po.id
                  AND a2.category_id = :category_id
                  AND a2.deleted_at IS NULL
            )';
        $params[':category_id'] = $categoryId;
    }

    if ($ownerId) {
        $conditions[] =
            'EXISTS (
                SELECT 1 FROM assets a3
                WHERE a3.po_id = po.id
                  AND a3.owner_id = :owner_id
                  AND a3.deleted_at IS NULL
            )';
        $params[':owner_id'] = $ownerId;
    }

    $where = 'WHERE ' . implode(' AND ', $conditions);

    $countSql  = "SELECT COUNT(*) FROM purchase_orders po {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    /*
     * Mirror the Excel columns per PO row:
     * Vendor | PO# | Date Received | Date Endorsed
     * + aggregated: categories, locations, owners, total quantity
     */
    $sql = "
        SELECT
            po.id,
            po.po_number,
            po.date_received,
            po.date_endorsed,
            po.fiscal_year,
            po.created_at,
            CASE
                WHEN po.date_received IS NOT NULL THEN
                    DATEDIFF(CURDATE(), po.date_received)
                ELSE NULL
            END AS days_since_received,
            v.id   AS vendor_id,
            v.name AS vendor_name,
            COUNT(a.id)                                   AS asset_count,
            COALESCE(
                GROUP_CONCAT(
                    DISTINCT c.name
                    ORDER BY c.name
                    SEPARATOR ', '
                ), '—'
            )                                             AS categories,
            COALESCE(
                GROUP_CONCAT(
                    DISTINCT l.name
                    ORDER BY l.name
                    SEPARATOR ', '
                ), '—'
            )                                             AS locations,
            COALESCE(
                GROUP_CONCAT(
                    DISTINCT o.name
                    ORDER BY o.name
                    SEPARATOR ', '
                ), '—'
            )                                             AS owners
        FROM purchase_orders po
        LEFT JOIN vendors        v ON po.vendor_id   = v.id
        LEFT JOIN assets         a ON a.po_id        = po.id
                                  AND a.deleted_at IS NULL
        LEFT JOIN categories     c ON a.category_id  = c.id
        LEFT JOIN locations      l ON a.location_id  = l.id
        LEFT JOIN process_owners o ON a.owner_id     = o.id
        {$where}
        GROUP BY
            po.id, po.po_number, po.date_received,
            po.date_endorsed, po.fiscal_year, po.created_at,
            v.id, v.name
        ORDER BY po.created_at DESC
        LIMIT :limit
    ";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->execute();

    sendPaginated($stmt->fetchAll(), $total, 1, $perPage);
}

function createPO(): void
{
    $body     = json_decode(file_get_contents('php://input'), true);
    $poNumber = sanitizeString($body['po_number'] ?? '');

    if (!$poNumber) {
        sendError('PO number is required.', 422);
    }

    $pdo = getDbConnection();
    $dup = $pdo->prepare(
        'SELECT id FROM purchase_orders WHERE po_number = :po LIMIT 1'
    );
    $dup->execute([':po' => $poNumber]);

    if ($dup->fetch()) {
        sendError('PO number already exists.', 409);
    }

    $vendorId     = !empty($body['vendor_id'])
        ? (int) $body['vendor_id']
        : null;
    $dateReceived = !empty($body['date_received'])
        ? sanitizeString($body['date_received'])
        : null;
    $dateEndorsed = !empty($body['date_endorsed'])
        ? sanitizeString($body['date_endorsed'])
        : null;

    $ins = $pdo->prepare('
        INSERT INTO purchase_orders
            (vendor_id, po_number, date_received, date_endorsed)
        VALUES
            (:vendor_id, :po, :dr, :de)
    ');
    $ins->execute([
        ':vendor_id' => $vendorId,
        ':po'        => $poNumber,
        ':dr'        => $dateReceived,
        ':de'        => $dateEndorsed,
    ]);

    $newId = (int) $pdo->lastInsertId();
    logAudit($_SESSION['user_id'], 'INSERT', 'purchase_orders', $newId, [
        'before' => [],
        'after'  => compact('poNumber', 'vendorId'),
    ]);

    sendSuccess(['id' => $newId], 'Purchase order created.');
}

function updatePO(int $id): void
{
    if (!$id) sendError('PO ID required.', 400);

    $body = json_decode(file_get_contents('php://input'), true);
    $pdo  = getDbConnection();
    
    $old  = $pdo->prepare('SELECT * FROM purchase_orders WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) sendError('Purchase order not found.', 404);

    $poNumber = sanitizeString($body['po_number'] ?? $before['po_number']);
    
    $vendorId = array_key_exists('vendor_id', $body) 
        ? ($body['vendor_id'] ? (int) $body['vendor_id'] : null) 
        : $before['vendor_id'];

    $dateReceived = array_key_exists('date_received', $body) 
        ? ($body['date_received'] ?: null) 
        : $before['date_received'];

    $dateEndorsed = array_key_exists('date_endorsed', $body) 
        ? ($body['date_endorsed'] ?: null) 
        : $before['date_endorsed'];

    $upd = $pdo->prepare('
        UPDATE purchase_orders
        SET vendor_id     = :vendor_id,
            po_number     = :po,
            date_received = :dr,
            date_endorsed = :de
        WHERE id = :id
    ');
    $upd->execute([
        ':vendor_id' => $vendorId,
        ':po'        => $poNumber,
        ':dr'        => $dateReceived,
        ':de'        => $dateEndorsed,
        ':id'        => $id,
    ]);

    logAudit($_SESSION['user_id'], 'UPDATE', 'purchase_orders', $id, [
        'before' => $before,
        'after'  => compact('poNumber', 'vendorId', 'dateReceived', 'dateEndorsed'),
    ]);

    sendSuccess([], 'Purchase order updated.');
}

function endorsePO(int $id): void
{
    if (!$id) sendError('PO ID required.', 400);

    $pdo  = getDbConnection();
    $old  = $pdo->prepare('SELECT * FROM purchase_orders WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) sendError('Purchase order not found.', 404);

    $today = date('Y-m-d');

    $upd = $pdo->prepare('UPDATE purchase_orders SET date_endorsed = :de WHERE id = :id');
    $upd->execute([':de' => $today, ':id' => $id]);

    logAudit($_SESSION['user_id'], 'UPDATE', 'purchase_orders', $id, [
        'before' => $before,
        'after'  => ['date_endorsed' => $today],
    ]);

    sendSuccess(['date_endorsed' => $today], 'PO Endorsed.');
}

function deletePO(int $id): void
{
    if (!$id) {
        sendError('PO ID required.', 400);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare(
        'SELECT * FROM purchase_orders WHERE id = :id LIMIT 1'
    );
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Purchase order not found.', 404);
    }

    $del = $pdo->prepare('DELETE FROM purchase_orders WHERE id = :id');
    $del->execute([':id' => $id]);

    logAudit($_SESSION['user_id'], 'DELETE', 'purchase_orders', $id, [
        'before' => $before,
        'after'  => [],
    ]);

    sendSuccess([], 'Purchase order deleted.');
}