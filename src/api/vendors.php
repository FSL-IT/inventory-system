<?php
// src/api/vendors.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

requireLogin();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = getQueryInt('id');

if ($method === 'GET') {
    fetchVendors();
} elseif ($method === 'POST') {
    requireCsrf();
    createVendor();
} elseif ($method === 'PUT') {
    requireCsrf();
    updateVendor($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    deleteVendor($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchVendors(): void {
    $pdo     = getDbConnection();
    $search  = getQueryString('search');
    $sort    = in_array(getQueryString('sort'), ['name','po_count','created_at']) ? getQueryString('sort') : 'name';
    $dir     = getQueryString('dir') === 'desc' ? 'DESC' : 'ASC';
    $page    = max(1, getQueryInt('page', 1));
    $perPage = min(100, max(5, getQueryInt('per_page', 10)));
    $offset  = ($page - 1) * $perPage;

    $where  = [];
    $params = [];

    if ($search) {
        $where[]          = 'v.name LIKE :search';
        $params[':search'] = "%{$search}%";
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM vendors v {$whereClause}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT v.id, v.name, v.created_at,
               COUNT(po.id) AS po_count
        FROM vendors v
        LEFT JOIN purchase_orders po ON po.vendor_id = v.id
        {$whereClause}
        GROUP BY v.id
        ORDER BY {$sort} {$dir}
        LIMIT :limit OFFSET :offset
    ";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $val) $stmt->bindValue($k, $val);
    $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
    $stmt->execute();

    sendPaginated($stmt->fetchAll(), $total, $page, $perPage);
}

function createVendor(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Vendor name is required.', 422);
    }

    $pdo = getDbConnection();
    $dup = $pdo->prepare(
        'SELECT id FROM vendors WHERE name = :name LIMIT 1'
    );
    $dup->execute([':name' => $name]);

    if ($dup->fetch()) {
        sendError('Vendor already exists.', 409);
    }

    $ins = $pdo->prepare('INSERT INTO vendors (name) VALUES (:name)');
    $ins->execute([':name' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($_SESSION['user_id'], 'INSERT', 'vendors', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    sendSuccess(['id' => $newId], 'Vendor created.');
}

function updateVendor(int $id): void {
    if (!$id) {
        sendError('Vendor ID required.', 400);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Name is required.', 422);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM vendors WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Vendor not found.', 404);
    }

    $upd = $pdo->prepare('UPDATE vendors SET name = :name WHERE id = :id');
    $upd->execute([':name' => $name, ':id' => $id]);

    logAudit($_SESSION['user_id'], 'UPDATE', 'vendors', $id, [
        'before' => $before,
        'after'  => ['name' => $name],
    ]);

    sendSuccess([], 'Vendor updated.');
}

function deleteVendor(int $id): void {
    if (!$id) {
        sendError('Vendor ID required.', 400);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM vendors WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Vendor not found.', 404);
    }

    $del = $pdo->prepare('DELETE FROM vendors WHERE id = :id');
    $del->execute([':id' => $id]);

    logAudit($_SESSION['user_id'], 'DELETE', 'vendors', $id, [
        'before' => $before,
        'after'  => [],
    ]);

    sendSuccess([], 'Vendor deleted.');
}
