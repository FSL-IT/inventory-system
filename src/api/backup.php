<?php
// src/api/backup.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

requireRole('admin');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$action = getQueryString('action');

if ($method === 'POST' && $action === 'backup') {
    requireCsrf();
    createBackup();
} elseif ($method === 'POST' && $action === 'restore') {
    requireCsrf();
    restoreBackup();
} elseif ($method === 'GET') {
    listBackups();
} else {
    sendError('Invalid request.', 400);
}

function createBackup(): void {
    $backupPath = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $timestamp = date('Ymd_His');
    $filename = "fsl_backup_{$timestamp}.sql";
    $filePath = __DIR__ . "/../../{$backupPath}/{$filename}";

    $host = escapeshellarg($_ENV['DB_HOST']);
    $user = escapeshellarg($_ENV['DB_USER']);
    $pass = escapeshellarg($_ENV['DB_PASS']);
    $dbName = escapeshellarg($_ENV['DB_NAME']);
    $filePathEsc = escapeshellarg($filePath);

    $cmd = "mysqldump -h {$host} -u {$user} -p{$pass} {$dbName}"
        . " > {$filePathEsc} 2>&1";

    exec($cmd, $output, $exitCode);

    if ($exitCode !== 0) {
        sendError('Backup failed: ' . implode(' ', $output), 500);
    }

    $size = filesize($filePath);
    logAudit($_SESSION['user_id'], 'INSERT', 'audit_logs', 0, [
        'before' => [],
        'after'  => ['event' => 'backup', 'file' => $filename],
    ]);

    sendSuccess([
        'filename' => $filename,
        'size'     => $size,
        'path'     => "{$backupPath}/{$filename}",
    ], 'Backup created successfully.');
}

function restoreBackup(): void {
    if (empty($_FILES['backup_file'])) {
        sendError('No file uploaded.', 422);
    }

    $file = $_FILES['backup_file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($ext !== 'sql') {
        sendError('Only .sql files are allowed.', 422);
    }

    $host = escapeshellarg($_ENV['DB_HOST']);
    $user = escapeshellarg($_ENV['DB_USER']);
    $pass = escapeshellarg($_ENV['DB_PASS']);
    $dbName = escapeshellarg($_ENV['DB_NAME']);
    $tmpPath = escapeshellarg($file['tmp_name']);

    $cmd = "mysql -h {$host} -u {$user} -p{$pass} {$dbName}"
        . " < {$tmpPath} 2>&1";

    exec($cmd, $output, $exitCode);

    if ($exitCode !== 0) {
        sendError('Restore failed: ' . implode(' ', $output), 500);
    }

    logAudit($_SESSION['user_id'], 'UPDATE', 'audit_logs', 0, [
        'before' => [],
        'after'  => ['event' => 'restore', 'file' => $file['name']],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

function listBackups(): void {
    $backupPath = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $dir = __DIR__ . "/../../{$backupPath}";
    $files = glob("{$dir}/*.sql") ?: [];

    $backups = array_map(function ($f) {
        return [
            'filename' => basename($f),
            'size'     => filesize($f),
            'created'  => date('Y-m-d H:i:s', filemtime($f)),
        ];
    }, $files);

    usort($backups, fn ($a, $b) => strcmp($b['created'], $a['created']));

    sendSuccess($backups);
}
