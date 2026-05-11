<?php
// src/api/process_owners.php

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
    fetchOwners();
} elseif ($method === 'POST') {
    requireCsrf();
    createOwner();
} elseif ($method === 'PUT') {
    requireCsrf();
    updateOwner($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    deleteOwner($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchOwners(): void {
    $pdo = getDbConnection();
    $sql = '
        SELECT o.id, o.name, o.created_at,
               COUNT(a.id) AS asset_count
        FROM process_owners o
        LEFT JOIN assets a ON a.owner_id = o.id AND a.deleted_at IS NULL
        GROUP BY o.id, o.name, o.created_at
        ORDER BY o.name ASC
    ';
    sendSuccess($pdo->query($sql)->fetchAll());
}

function createOwner(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Owner name is required.', 422);
    }

    $pdo = getDbConnection();
    $ins = $pdo->prepare('INSERT INTO process_owners (name) VALUES (:name)');
    $ins->execute([':name' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($_SESSION['user_id'], 'INSERT', 'process_owners', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    sendSuccess(['id' => $newId], 'Process owner created.');
}

function updateOwner(int $id): void {
    if (!$id) {
        sendError('Owner ID required.', 400);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Name is required.', 422);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM process_owners WHERE id = :id');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Owner not found.', 404);
    }

    $upd = $pdo->prepare(
        'UPDATE process_owners SET name = :name WHERE id = :id'
    );
    $upd->execute([':name' => $name, ':id' => $id]);

    logAudit($_SESSION['user_id'], 'UPDATE', 'process_owners', $id, [
        'before' => $before,
        'after'  => ['name' => $name],
    ]);

    sendSuccess([], 'Owner updated.');
}

function deleteOwner(int $id): void {
    if (!$id) {
        sendError('Owner ID required.', 400);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM process_owners WHERE id = :id');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Owner not found.', 404);
    }

    $del = $pdo->prepare('DELETE FROM process_owners WHERE id = :id');
    $del->execute([':id' => $id]);

    logAudit($_SESSION['user_id'], 'DELETE', 'process_owners', $id, [
        'before' => $before,
        'after'  => [],
    ]);

    sendSuccess([], 'Owner deleted.');
}
