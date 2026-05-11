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
    $pdo = getDbConnection();
    $sql = '
        SELECT c.id, c.name, c.created_at,
               COUNT(a.id) AS asset_count
        FROM categories c
        LEFT JOIN assets a ON a.category_id = c.id AND a.deleted_at IS NULL
        GROUP BY c.id, c.name, c.created_at
        ORDER BY c.name ASC
    ';
    $rows = $pdo->query($sql)->fetchAll();
    sendSuccess($rows);
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
