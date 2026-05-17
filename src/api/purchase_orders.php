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

if ($method === 'GET' && $id) {
    fetchSinglePO($id);
} elseif ($method === 'GET') {
    fetchPOs();
} elseif ($method === 'POST') {
    requireCsrf();
    createPO();
} elseif ($method === 'PUT') {
    requireCsrf();
    updatePO($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
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

function fetchPOs(): void 
{
    $pdo     = getDbConnection();
    // Allow large limits to load all into client memory for the frontend filtering
    $perPage = getQueryInt('per_page', 5000); 

    $whereClause = 'WHERE 1=1';

    $countSql  = "SELECT COUNT(*) FROM purchase_orders po {$whereClause}";
    $countStmt = $pdo->query($countSql);
    $total     = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT
            po.id, po.po_number, po.date_received, po.date_endorsed, po.created_at,
            v.id AS vendor_id, v.name AS vendor_name,
            COUNT(a.id) AS asset_count
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN assets  a ON a.po_id = po.id AND a.deleted_at IS NULL
        {$whereClause}
        GROUP BY po.id, po.po_number, po.date_received,
                 po.date_endorsed, po.created_at, v.id, v.name
        ORDER BY po.created_at DESC
        LIMIT :limit
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->execute();

    // Client-side pagination expects page info, but we bypass server math
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

    $vendorId = !empty($body['vendor_id']) ? (int) $body['vendor_id'] : null;
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
    if (!$id) {
        sendError('PO ID required.', 400);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $pdo  = getDbConnection();
    $old  = $pdo->prepare(
        'SELECT * FROM purchase_orders WHERE id = :id LIMIT 1'
    );
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Purchase order not found.', 404);
    }

    $poNumber = sanitizeString($body['po_number'] ?? $before['po_number']);
    $vendorId = isset($body['vendor_id'])
        ? ((int) $body['vendor_id'] ?: null)
        : $before['vendor_id'];
    $dateReceived = $body['date_received'] ?? $before['date_received'];
    $dateEndorsed = $body['date_endorsed'] ?? $before['date_endorsed'];

    $upd = $pdo->prepare('
        UPDATE purchase_orders
        SET vendor_id = :vendor_id,
            po_number = :po,
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