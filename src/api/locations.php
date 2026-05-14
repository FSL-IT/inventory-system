<?php

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
    requireRole('admin');
    createLocation();
} elseif ($method === 'PUT') {
    requireCsrf();
    requireRole('admin');
    updateLocation($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    requireRole('admin');
    deleteLocation($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchLocations(): void {
    $pdo = getDbConnection();
    $sql = '
        SELECT l.id, l.name, l.created_at,
               COUNT(a.id) AS asset_count
        FROM locations l
        LEFT JOIN assets a ON a.location_id = l.id AND a.deleted_at IS NULL
        GROUP BY l.id, l.name, l.created_at
        ORDER BY l.name ASC
    ';
    sendSuccess($pdo->query($sql)->fetchAll());
}

function createLocation(): void {
    $body = getJsonBody();
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Location name is required.', 422);
    }

    $pdo = getDbConnection();
    $dup = $pdo->prepare('SELECT id FROM locations WHERE name = :name LIMIT 1');
    $dup->execute([':name' => $name]);

    if ($dup->fetch()) {
        sendError('Location already exists.', 409);
    }

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

    $body = getJsonBody();
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
