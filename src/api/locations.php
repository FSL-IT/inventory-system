<?php
// src/api/locations.php

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
    fetchLocations();
} elseif ($method === 'POST') {
    requireCsrf();
    createLocation();
} elseif ($method === 'PUT') {
    requireCsrf();
    updateLocation($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    deleteLocation($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchLocations(): void {
    $pdo     = getDbConnection();
    $search  = getQueryString('search');
    $sort    = in_array(getQueryString('sort'), ['name','asset_count','created_at']) ? getQueryString('sort') : 'name';
    $dir     = getQueryString('dir') === 'desc' ? 'DESC' : 'ASC';
    $page    = max(1, getQueryInt('page', 1));
    $perPage = min(100, max(5, getQueryInt('per_page', 10)));
    $offset  = ($page - 1) * $perPage;

    $where  = [];
    $params = [];

    if ($search) {
        $where[]           = 'l.name LIKE :search';
        $params[':search'] = "%{$search}%";
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM locations l {$whereClause}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT l.id, l.name, l.created_at,
               COUNT(a.id) AS asset_count
        FROM locations l
        LEFT JOIN assets a ON a.location_id = l.id AND a.deleted_at IS NULL
        {$whereClause}
        GROUP BY l.id
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
function createLocation(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Location name is required.', 422);
    }

    $pdo = getDbConnection();
    $ins = $pdo->prepare('INSERT INTO locations (name) VALUES (:name)');
    $ins->execute([':name' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($_SESSION['user_id'], 'INSERT', 'locations', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    sendSuccess(['id' => $newId], 'Location created.');
}

function updateLocation(int $id): void {
    if (!$id) {
        sendError('Location ID required.', 400);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Name is required.', 422);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM locations WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Location not found.', 404);
    }

    $upd = $pdo->prepare('UPDATE locations SET name = :name WHERE id = :id');
    $upd->execute([':name' => $name, ':id' => $id]);

    logAudit($_SESSION['user_id'], 'UPDATE', 'locations', $id, [
        'before' => $before,
        'after'  => ['name' => $name],
    ]);

    sendSuccess([], 'Location updated.');
}

function deleteLocation(int $id): void {
    if (!$id) {
        sendError('Location ID required.', 400);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM locations WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Location not found.', 404);
    }

    $del = $pdo->prepare('DELETE FROM locations WHERE id = :id');
    $del->execute([':id' => $id]);

    logAudit($_SESSION['user_id'], 'DELETE', 'locations', $id, [
        'before' => $before,
        'after'  => [],
    ]);

    sendSuccess([], 'Location deleted.');
}
