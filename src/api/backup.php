<?php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];
$action = getQueryString('action');

if ($method === 'POST' && $action === 'backup') {
    requireCsrf();
    createBackup();
} elseif ($method === 'POST' && $action === 'restore') {
    requireCsrf();
    restoreBackup();
} elseif ($method === 'POST' && $action === 'restore_server') {
    requireCsrf();
    restoreServerBackup();
} elseif ($method === 'GET' && $action === 'download') {
    downloadBackup();
} elseif ($method === 'GET') {
    listBackups();
} else {
    sendError('Invalid request.', 400);
}

function createBackup(): void {
    $backupDir = getBackupDirectory();
    $backupPath = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $timestamp = date('Ymd_His');
    $filename = "fsl_backup_{$timestamp}.sql";
    $filePath = "{$backupDir}/{$filename}";
    $result = runDatabaseCommand('dump', $filePath);

    if ($result['exit_code'] !== 0) {
        @unlink($filePath);
        sendError('Backup failed. Check database tool configuration.', 500);
    }

    logAudit($_SESSION['user_id'], 'INSERT', 'audit_logs', 0, [
        'before' => [],
        'after'  => ['event' => 'backup', 'file' => $filename],
    ]);

    sendSuccess([
        'filename' => $filename,
        'size'     => filesize($filePath),
        'path'     => "{$backupPath}/{$filename}",
    ], 'Backup created successfully.');
}

function restoreServerBackup(): void {
    $body = getJsonBody();
    $filename = $body['filename'] ?? '';

    if (!$filename) {
        sendError('No filename provided.', 422);
    }

    restoreDatabaseFromFile(resolveBackupFile($filename), $filename);
}

function restoreBackup(): void {
    if (empty($_FILES['backup_file'])) {
        sendError('No file uploaded.', 422);
    }

    $file = $_FILES['backup_file'];
    validateUploadedFile($file, ['sql'], MAX_BACKUP_FILE_BYTES);
    restoreDatabaseFromFile($file['tmp_name'], basename($file['name']));
}

function restoreDatabaseFromFile(string $filePath, string $filename): void {
    $result = runDatabaseCommand('restore', $filePath);

    if ($result['exit_code'] !== 0) {
        sendError('Restore failed. Check database tool configuration.', 500);
    }

    logAudit($_SESSION['user_id'], 'UPDATE', 'audit_logs', 0, [
        'before' => [],
        'after'  => ['event' => 'restore', 'file' => $filename],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

function downloadBackup(): void {
    $filename = getQueryString('filename');

    if (!$filename) {
        http_response_code(400);
        echo 'Missing filename.';
        exit;
    }

    $filePath = resolveBackupFile($filename);

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filePath));
    readfile($filePath);
    exit;
}

function listBackups(): void {
    $dir = getBackupDirectory();
    $files = glob("{$dir}/fsl_backup_*.sql") ?: [];

    $backups = array_map(function ($file) {
        return [
            'filename' => basename($file),
            'size'     => filesize($file),
            'created'  => date('Y-m-d H:i:s', filemtime($file)),
        ];
    }, $files);

    usort($backups, fn ($a, $b) => strcmp($b['created'], $a['created']));

    sendSuccess($backups);
}

function getBackupDirectory(): string {
    $backupPath = trim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $directory = __DIR__ . "/../../{$backupPath}";

    if (!is_dir($directory) && !mkdir($directory, 0750, true)) {
        sendError('Backup directory is not writable.', 500);
    }

    $realDirectory = realpath($directory);

    if (!$realDirectory) {
        sendError('Backup directory is not available.', 500);
    }

    return str_replace('\\', '/', $realDirectory);
}

function resolveBackupFile(string $filename): string {
    if (!preg_match('/^fsl_backup_[0-9]{8}_[0-9]{6}\.sql$/', $filename)) {
        sendError('Invalid backup filename.', 422);
    }

    $backupDir = getBackupDirectory();
    $filePath = realpath("{$backupDir}/{$filename}");

    if (!$filePath) {
        sendError('Backup file not found.', 404);
    }

    $normalizedPath = str_replace('\\', '/', $filePath);

    if (!str_starts_with($normalizedPath, "{$backupDir}/")) {
        sendError('Backup file not found.', 404);
    }

    return $normalizedPath;
}

function runDatabaseCommand(string $mode, string $filePath): array {
    $host = $_ENV['DB_HOST'];
    $port = $_ENV['DB_PORT'];
    $user = $_ENV['DB_USER'];
    $dbName = $_ENV['DB_NAME'];
    $environment = array_merge($_ENV, ['MYSQL_PWD' => $_ENV['DB_PASS']]);

    if ($mode === 'dump') {
        $command = ['mysqldump', '-h', $host, '-P', $port, '-u', $user, $dbName];
        $descriptors = [
            1 => ['file', $filePath, 'w'],
            2 => ['pipe', 'w'],
        ];
    } else {
        $command = ['mysql', '-h', $host, '-P', $port, '-u', $user, $dbName];
        $descriptors = [
            0 => ['file', $filePath, 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
    }

    $process = proc_open($command, $descriptors, $pipes, null, $environment);

    if (!is_resource($process)) {
        return ['exit_code' => 1, 'error' => 'Unable to start database tool.'];
    }

    $errorOutput = '';

    foreach ($pipes as $pipe) {
        $errorOutput .= stream_get_contents($pipe);
        fclose($pipe);
    }

    return [
        'exit_code' => proc_close($process),
        'error'     => $errorOutput,
    ];
}
