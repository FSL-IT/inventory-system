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
        $where[]           = 'o.name LIKE :search';
        $params[':search'] = "%{$search}%";
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM process_owners o {$whereClause}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT o.id, o.name, o.created_at,
               COUNT(a.id) AS asset_count
        FROM process_owners o
        LEFT JOIN assets a ON a.owner_id = o.id AND a.deleted_at IS NULL
        {$whereClause}
        GROUP BY o.id
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
