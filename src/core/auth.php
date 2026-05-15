<?php
// src/core/auth.php

require_once __DIR__ . '/../../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->safeLoad();

$sessionName = $_ENV['SESSION_NAME'] ?? 'fsl_session';
$sessionLifetime = (int) ($_ENV['SESSION_LIFETIME'] ?? 3600);

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', $sessionLifetime);

session_name($sessionName);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Send security headers on every authenticated request
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

function isLoggedIn(): bool
{
    return !empty($_SESSION['user_id']) && !empty($_SESSION['role']);
}

function isAdmin(): bool
{
    return ($_SESSION['role'] ?? '') === 'admin';
}

function requireLogin(): void
{
    if (isLoggedIn()) {
        return;
    }

    header('Location: /src/views/auth/login.php');
    exit;
}

function requireRole(string $role): void
{
    requireLogin();

    if ($_SESSION['role'] !== $role) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Access denied. Insufficient permissions.',
        ]);
        exit;
    }
}

function generateCsrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function validateCsrfToken(): bool
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN']
        ?? $_POST['csrf_token']
        ?? '';

    return hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

function requireCsrf(): void
{
    if (validateCsrfToken()) {
        return;
    }

    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid CSRF token.',
    ]);
    exit;
}

/**
 * Simple file-based rate limiter for login attempts.
 * Max $maxAttempts per $windowSeconds per IP.
 */
function checkLoginRateLimit(string $ip, int $maxAttempts = 10, int $windowSeconds = 300): void
{
    $dir  = sys_get_temp_dir();
    $key  = 'fsl_rl_' . md5($ip);
    $file = "{$dir}/{$key}.json";

    $data = ['attempts' => 0, 'window_start' => time()];

    if (is_file($file)) {
        $raw = json_decode(file_get_contents($file), true);

        if ($raw && (time() - $raw['window_start']) < $windowSeconds) {
            $data = $raw;
        }
    }

    if ($data['attempts'] >= $maxAttempts) {
        $retry = $windowSeconds - (time() - $data['window_start']);
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'message' => "Too many login attempts. Try again in {$retry}s.",
        ]);
        exit;
    }

    $data['attempts']++;
    file_put_contents($file, json_encode($data), LOCK_EX);
}

function clearLoginRateLimit(string $ip): void
{
    $key  = 'fsl_rl_' . md5($ip);
    $file = sys_get_temp_dir() . "/{$key}.json";

    if (is_file($file)) {
        unlink($file);
    }
}