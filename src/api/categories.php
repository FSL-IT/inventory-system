<?php
// src/api/categories.php

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
    fetchCategories();
} elseif ($method === 'POST') {
    requireCsrf();
    createCategory();
} elseif ($method === 'PUT') {
    requireCsrf();
    updateCategory($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    deleteCategory($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchCategories(): void {
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
        $where[]           = 'c.name LIKE :search';
        $params[':search'] = "%{$search}%";
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM categories c {$whereClause}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT c.id, c.name, c.created_at,
               COUNT(a.id) AS asset_count
        FROM categories c
        LEFT JOIN assets a ON a.category_id = c.id AND a.deleted_at IS NULL
        {$whereClause}
        GROUP BY c.id
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

function createCategory(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Category name is required.', 422);
    }

    $pdo = getDbConnection();
    $dup = $pdo->prepare(
        'SELECT id FROM categories WHERE name = :name LIMIT 1'
    );
    $dup->execute([':name' => $name]);

    if ($dup->fetch()) {
        sendError('Category already exists.', 409);
    }

    $ins = $pdo->prepare('INSERT INTO categories (name) VALUES (:name)');
    $ins->execute([':name' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($_SESSION['user_id'], 'INSERT', 'categories', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    sendSuccess(['id' => $newId], 'Category created.');
}

function updateCategory(int $id): void {
    if (!$id) {
        sendError('Category ID required.', 400);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    $name = sanitizeString($body['name'] ?? '');

    if (!$name) {
        sendError('Name is required.', 422);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare('SELECT * FROM categories WHERE id = :id LIMIT 1');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Category not found.', 404);
    }

    $upd = $pdo->prepare('UPDATE categories SET name = :name WHERE id = :id');
    $upd->execute([':name' => $name, ':id' => $id]);

    logAudit($_SESSION['user_id'], 'UPDATE', 'categories', $id, [
        'before' => $before,
        'after'  => ['name' => $name],
    ]);

    sendSuccess([], 'Category updated.');
}

function deleteCategory(int $id): void {
    if (!$id) {
        sendError('Category ID required.', 400);
    }

    $pdo = getDbConnection();
    $check = $pdo->prepare(
        'SELECT COUNT(*) FROM assets WHERE category_id = :id AND deleted_at IS NULL'
    );
    $check->execute([':id' => $id]);

    if ((int) $check->fetchColumn() > 0) {
        sendError(
            'Cannot delete: assets still use this category.',
            409
        );
    }

    $old = $pdo->prepare('SELECT * FROM categories WHERE id = :id');
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('Category not found.', 404);
    }

    $del = $pdo->prepare('DELETE FROM categories WHERE id = :id');
    $del->execute([':id' => $id]);

    logAudit($_SESSION['user_id'], 'DELETE', 'categories', $id, [
        'before' => $before,
        'after'  => [],
    ]);

    sendSuccess([], 'Category deleted.');
}
