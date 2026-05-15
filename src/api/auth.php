<?php
// src/api/auth.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    handleLogin();
} elseif ($method === 'DELETE') {
    // Require CSRF token to prevent cross-site logout attacks
    requireCsrf();
    handleLogout();
} else {
    sendError('Method not allowed.', 405);
}

function handleLogin(): void 
{
    $body     = json_decode(file_get_contents('php://input'), true);
    $username = sanitizeString($body['username'] ?? '');
    $password = $body['password'] ?? '';

    $errors = validateRequired(['username', 'password'], [
        'username' => $username,
        'password' => $password,
    ]);

    if ($errors) {
        sendError(implode(' ', $errors), 422);
    }

    $pdo  = getDbConnection();
    $stmt = $pdo->prepare('
        SELECT id, username, password_hash, role
        FROM users
        WHERE username = :username AND deleted_at IS NULL
        LIMIT 1
    ');
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendError('Invalid username or password.', 401);
    }

    session_regenerate_id(true);

    $_SESSION['user_id']  = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role']     = $user['role'];

    generateCsrfToken();

    logAudit($user['id'], 'INSERT', 'users', $user['id'], [
        'before' => [],
        'after'  => ['event' => 'login', 'username' => $user['username']],
    ]);

    sendSuccess([
        'user_id'    => $user['id'],
        'username'   => $user['username'],
        'role'       => $user['role'],
        'csrf_token' => $_SESSION['csrf_token'],
    ], 'Login successful.');
}

function handleLogout(): void 
{
    if (isLoggedIn()) {
        logAudit(
            $_SESSION['user_id'], 'DELETE', 'users', $_SESSION['user_id'],
            ['before' => [], 'after' => ['event' => 'logout']]
        );
    }

    // Deep session destruction: clear data and force cookie expiration
    $_SESSION = [];
    
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(), '', time() - 42000,
            $params["path"], $params["domain"], 
            $params["secure"], $params["httponly"]
        );
    }
    
    session_destroy();
    sendSuccess([], 'Logged out.');
}