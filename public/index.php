<?php
// public/index.php — App entry point

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

require_once __DIR__ . '/../src/core/auth.php';

if (isLoggedIn()) {
    header('Location: /src/views/dashboard.php');
} else {
    header('Location: /src/views/auth/login.php');
}

exit;
