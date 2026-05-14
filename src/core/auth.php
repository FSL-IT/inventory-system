<?php

require_once __DIR__ . '/../../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->safeLoad();

$sessionName = $_ENV['SESSION_NAME'] ?? 'fsl_session';
$sessionLifetime = (int) ($_ENV['SESSION_LIFETIME'] ?? 3600);
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', $isHttps ? '1' : '0');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', (string) $sessionLifetime);
ini_set('session.use_only_cookies', '1');
ini_set('session.use_strict_mode', '1');

session_name($sessionName);
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (
    !empty($_SESSION['last_activity'])
    && time() - $_SESSION['last_activity'] > $sessionLifetime
) {
    destroySession();
}

$_SESSION['last_activity'] = time();

function isLoggedIn(): bool {
    return !empty($_SESSION['user_id']) && !empty($_SESSION['role']);
}

function isAdmin(): bool {
    return ($_SESSION['role'] ?? '') === 'admin';
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        header('Location: /src/views/auth/login.php');
        exit;
    }
}

function requireRole(string $role): void {
    requireLogin();

    if ($_SESSION['role'] !== $role) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access denied. Insufficient permissions.'
        ], JSON_THROW_ON_ERROR);
        exit;
    }
}

function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function validateCsrfToken(): bool {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN']
        ?? $_POST['csrf_token']
        ?? '';

    return hash_equals(
        $_SESSION['csrf_token'] ?? '',
        $token
    );
}

function requireCsrf(): void {
    if (!validateCsrfToken()) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid CSRF token.'
        ], JSON_THROW_ON_ERROR);
        exit;
    }
}

function destroySession(): void {
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'] ?? '',
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();
}
