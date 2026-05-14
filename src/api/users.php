<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

requireRole('admin');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = getQueryInt('id');

if ($method === 'GET') {
    fetchUsers();
} elseif ($method === 'POST') {
    requireCsrf();
    createUser();
} elseif ($method === 'PUT') {
    requireCsrf();
    updateUser($id);
} elseif ($method === 'DELETE') {
    requireCsrf();
    softDeleteUser($id);
} else {
    sendError('Method not allowed.', 405);
}

function fetchUsers(): void {
    $pdo = getDbConnection();
    $sql = '
        SELECT id, username, role, created_at, updated_at
        FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at ASC
    ';
    sendSuccess($pdo->query($sql)->fetchAll());
}

function createUser(): void {
    $body = getJsonBody();
    $username = sanitizeString($body['username'] ?? '');
    $password = $body['password'] ?? '';
    $confirm = $body['confirm_password'] ?? '';
    $role = sanitizeString($body['role'] ?? 'user');

    $errors = validateRequired(
        ['username', 'password', 'confirm_password'],
        compact('username', 'password', 'confirm_password')
    );

    if ($errors) {
        sendError(implode(' ', $errors), 422);
    }

    if (!validatePassword($password)) {
        sendError(
            'Password must be at least 12 characters and include uppercase, '
            . 'lowercase, number, and symbol.',
            422
        );
    }

    if ($password !== $confirm) {
        sendError('Passwords do not match.', 422);
    }

    if (!validateEnum($role, USER_ROLES)) {
        sendError('Invalid role.', 422);
    }

    $pdo = getDbConnection();
    $dup = $pdo->prepare(
        'SELECT id FROM users WHERE username = :u AND deleted_at IS NULL'
    );
    $dup->execute([':u' => $username]);

    if ($dup->fetch()) {
        sendError('Username already exists.', 409);
    }

    $cost = (int) ($_ENV['BCRYPT_COST'] ?? 12);
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => $cost]);

    $ins = $pdo->prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (:u, :h, :r)'
    );
    $ins->execute([':u' => $username, ':h' => $hash, ':r' => $role]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($_SESSION['user_id'], 'INSERT', 'users', $newId, [
        'before' => [],
        'after'  => ['username' => $username, 'role' => $role],
    ]);

    sendSuccess(['id' => $newId], 'User created.');
}

function updateUser(int $id): void {
    if (!$id) {
        sendError('User ID required.', 400);
    }

    $body = getJsonBody();
    $pdo = getDbConnection();

    $old = $pdo->prepare(
        'SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1'
    );
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('User not found.', 404);
    }

    $role = sanitizeString($body['role'] ?? $before['role']);

    if (!validateEnum($role, USER_ROLES)) {
        sendError('Invalid role.', 422);
    }

    $sets = ['role = :role'];
    $params = [':role' => $role, ':id' => $id];

    if (!empty($body['password'])) {
        $pw = $body['password'];

        if (!validatePassword($pw)) {
            sendError(
                'Password must be at least 12 characters and include uppercase, '
                . 'lowercase, number, and symbol.',
                422
            );
        }

        if ($pw !== ($body['confirm_password'] ?? '')) {
            sendError('Passwords do not match.', 422);
        }

        $cost = (int) ($_ENV['BCRYPT_COST'] ?? 12);
        $sets[] = 'password_hash = :hash';
        $params[':hash'] = password_hash($pw, PASSWORD_BCRYPT, ['cost' => $cost]);
    }

    $sql = 'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $upd = $pdo->prepare($sql);
    $upd->execute($params);

    logAudit($_SESSION['user_id'], 'UPDATE', 'users', $id, [
        'before' => ['role' => $before['role']],
        'after'  => ['role' => $role],
    ]);

    sendSuccess([], 'User updated.');
}

function softDeleteUser(int $id): void {
    if (!$id) {
        sendError('User ID required.', 400);
    }

    if ($id === $_SESSION['user_id']) {
        sendError('Cannot delete your own account.', 403);
    }

    $pdo = getDbConnection();
    $old = $pdo->prepare(
        'SELECT * FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1'
    );
    $old->execute([':id' => $id]);
    $before = $old->fetch();

    if (!$before) {
        sendError('User not found.', 404);
    }

    $del = $pdo->prepare(
        'UPDATE users SET deleted_at = NOW() WHERE id = :id'
    );
    $del->execute([':id' => $id]);

    logAudit($_SESSION['user_id'], 'DELETE', 'users', $id, [
        'before' => ['username' => $before['username']],
        'after'  => ['deleted' => true],
    ]);

    sendSuccess([], 'User deactivated.');
}
