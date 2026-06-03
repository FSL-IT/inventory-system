<?php
// src/api/backup.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->safeLoad();

requireRole('admin');


if (!defined('BACKUP_TABLES')) {
    define('BACKUP_TABLES', ['purchase_orders', 'assets']);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = getQueryString('action');

if ($method === 'POST' && $action === 'backup') {
    header('Content-Type: application/json');
    requireCsrf();
    createBackup();
} elseif ($method === 'POST' && $action === 'restore') {
    header('Content-Type: application/json');
    requireCsrf();
    restoreBackup();
} elseif ($method === 'POST' && $action === 'restore_server') {
    header('Content-Type: application/json');
    requireCsrf();
    restoreServerBackup();
} elseif ($method === 'GET' && $action === 'download') {
    downloadBackup();
} elseif ($method === 'GET') {
    header('Content-Type: application/json');
    listBackups();
} else {
    header('Content-Type: application/json');
    sendError('Invalid request.', 400);
}

// ─── BACKUP DIR HELPER ───────────────────────────────────────────
function getBackupDir(): string
{
    $path = rtrim(
        $_ENV['BACKUP_PATH'] ?? 'storage/backups', '/'
    );
    $dir = str_starts_with($path, '/')
        ? $path
        : __DIR__ . "/../../{$path}";

    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $dir;
}

// ─── CREATE ──────────────────────────────────────────────────────
function createBackup(): void
{
    try {
        $dir       = getBackupDir();
        $timestamp = date('Ymd_His');
        $filename  = "fsl_backup_{$timestamp}.sql";
        $filePath  = "{$dir}/{$filename}";

        $pdo = getDbConnection();
        $sql = generateSqlDump($pdo);

        if (file_put_contents($filePath, $sql) === false) {
            sendError('Could not write backup file.', 500);
        }

        $size = filesize($filePath);

        logAudit($_SESSION['user_id'], 'BACKUP', 'backup', 0, [
            'before' => [],
            'after'  => [
                'event'  => 'backup_created',
                'file'   => $filename,
                'tables' => BACKUP_TABLES,
                'size'   => $size,
            ],
        ]);

        sendSuccess([
            'filename' => $filename,
            'size'     => $size,
            'tables'   => BACKUP_TABLES,
        ], 'Backup created successfully.');

    } catch (Throwable $e) {
        sendError('Backup failed: ' . $e->getMessage(), 500);
    }
}

// ─── GENERATE SQL DUMP ───────────────────────────────────────────
function generateSqlDump(PDO $pdo): string
{
    @ini_set('memory_limit', '512M');
    @ini_set('max_execution_time', '300');

    $dbName = $_ENV['DB_NAME'] ?? 'fsl_inventory';

    $out  = "-- FSL Inventory SQL Backup\n";
    $out .= "-- Generated : " . date('Y-m-d H:i:s') . "\n";
    $out .= "-- Database  : {$dbName}\n";
    $out .= "-- Tables    : "
        . implode(', ', BACKUP_TABLES) . "\n\n";
    $out .= "SET FOREIGN_KEY_CHECKS=0;\n";
    $out .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
    $out .= "SET NAMES utf8mb4;\n\n";

    foreach (BACKUP_TABLES as $table) {
        $q = "`{$table}`";

        $createRow = $pdo
            ->query("SHOW CREATE TABLE {$q}")
            ->fetch(PDO::FETCH_NUM);

        $out .= "DROP TABLE IF EXISTS {$q};\n";
        $out .= $createRow[1] . ";\n\n";

        $chunkSize = 500;
        $offset    = 0;
        $colList   = null;

        while (true) {
            $rows = $pdo->query(
                "SELECT * FROM {$q}"
                . " LIMIT {$chunkSize} OFFSET {$offset}"
            )->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                break;
            }

            if ($colList === null) {
                $colList = implode(', ', array_map(
                    fn ($c) => "`{$c}`",
                    array_keys($rows[0])
                ));
            }

            foreach ($rows as $row) {
                $vals = array_map(function ($v) use ($pdo) {
                    return $v === null
                        ? 'NULL'
                        : $pdo->quote((string) $v);
                }, array_values($row));

                $out .= "INSERT INTO {$q} ({$colList}) VALUES ("
                    . implode(', ', $vals) . ");\n";
            }

            $offset += $chunkSize;
            if (count($rows) < $chunkSize) {
                break;
            }
        }

        $out .= "\n";
    }

    $out .= "SET FOREIGN_KEY_CHECKS=1;\n";
    return $out;
}

// ─── RESTORE FROM UPLOAD ─────────────────────────────────────────
function restoreBackup(): void
{
    if (empty($_FILES['backup_file'])) {
        sendError('No file uploaded.', 422);
    }

    $file = $_FILES['backup_file'];
    $ext  = strtolower(
        pathinfo($file['name'], PATHINFO_EXTENSION)
    );

    if ($ext !== 'sql') {
        sendError('Only .sql files are allowed.', 422);
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendError('Upload error: ' . $file['error'], 422);
    }

    executeSqlFile($file['tmp_name']);

    logAudit($_SESSION['user_id'], 'RESTORE', 'backup', 0, [
        'before' => [],
        'after'  => [
            'event' => 'restore_from_upload',
            'file'  => $file['name'],
        ],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

// ─── RESTORE FROM SERVER ─────────────────────────────────────────
function restoreServerBackup(): void
{
    $body     = json_decode(
        file_get_contents('php://input'), true
    );
    $filename = $body['filename'] ?? '';

    if (!$filename) {
        sendError('No filename provided.', 422);
    }

    if (!preg_match('/^fsl_backup_[\d_]+\.sql$/', $filename)) {
        sendError('Invalid backup filename.', 422);
    }

    $dir         = getBackupDir();
    $filePath    = realpath("{$dir}/{$filename}");
    $expectedDir = realpath($dir);

    if (
        !$filePath ||
        !str_starts_with($filePath, $expectedDir)
    ) {
        sendError('Backup file not found.', 404);
    }

    executeSqlFile($filePath);

    logAudit($_SESSION['user_id'], 'RESTORE', 'backup', 0, [
        'before' => [],
        'after'  => [
            'event' => 'restore_from_server',
            'file'  => $filename,
        ],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

// ─── EXECUTE SQL FILE ────────────────────────────────────────────
function executeSqlFile(string $filePath): void
{
    $handle = fopen($filePath, 'r');
    if (!$handle) {
        sendError('Cannot open backup file.', 500);
    }

    @ini_set('memory_limit', '512M');
    @ini_set('max_execution_time', '300');

    try {
        $pdo = getDbConnection();
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        $pdo->setAttribute(
            PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION
        );
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $pdo->exec('SET NAMES utf8mb4');

        $buffer   = '';
        $errors   = [];
        $inString = false;
        $strChar  = '';

        while (!feof($handle)) {
            $line = fgets($handle, 65536);
            if ($line === false) {
                break;
            }

            $line  = rtrim($line, "\r\n");
            $ltrim = ltrim($line);

            if (
                !$inString &&
                (str_starts_with($ltrim, '--') ||
                 trim($line) === '')
            ) {
                continue;
            }

            for ($i = 0, $len = strlen($line); $i < $len; $i++) {
                $ch = $line[$i];

                if (
                    !$inString &&
                    ($ch === "'" || $ch === '"' || $ch === '`')
                ) {
                    $inString = true;
                    $strChar  = $ch;
                } elseif ($inString && $ch === $strChar) {
                    if (
                        isset($line[$i + 1]) &&
                        $line[$i + 1] === $strChar
                    ) {
                        $buffer .= $ch;
                        $i++;
                    } else {
                        $inString = false;
                    }
                } elseif ($inString && $ch === '\\') {
                    $buffer .= $ch . ($line[$i + 1] ?? '');
                    $i++;
                    continue;
                }

                if (!$inString && $ch === ';') {
                    $stmt   = trim($buffer);
                    $buffer = '';

                    if ($stmt !== '') {
                        try {
                            $pdo->exec($stmt);
                        } catch (PDOException $e) {
                            $errors[] = $e->getMessage();
                        }
                    }
                } else {
                    $buffer .= $ch;
                }
            }

            if ($inString) {
                $buffer .= "\n";
            }
        }

        $stmt = trim($buffer);
        if ($stmt !== '') {
            try {
                $pdo->exec($stmt);
            } catch (PDOException $e) {
                $errors[] = $e->getMessage();
            }
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        fclose($handle);

        $fatal = array_filter(
            $errors,
            fn ($m) => !str_contains(
                $m, 'Unknown system variable'
            )
        );

        if (!empty($fatal)) {
            sendError(
                'Restore errors: '
                . implode(' | ', array_slice(
                    array_values($fatal), 0, 3
                )),
                500
            );
        }

    } catch (Throwable $e) {
        fclose($handle);
        sendError('Restore failed: ' . $e->getMessage(), 500);
    }
}

// ─── DOWNLOAD ────────────────────────────────────────────────────
function downloadBackup(): void
{
    $filename = getQueryString('filename');

    if (!$filename) {
        http_response_code(400);
        echo 'Missing filename.';
        exit;
    }

    if (!preg_match('/^fsl_backup_[\d_]+\.sql$/', $filename)) {
        http_response_code(400);
        echo 'Invalid filename.';
        exit;
    }

    $dir         = getBackupDir();
    $filePath    = realpath("{$dir}/{$filename}");
    $expectedDir = realpath($dir);

    if (
        !$filePath ||
        !str_starts_with($filePath, $expectedDir) ||
        !is_file($filePath)
    ) {
        http_response_code(404);
        echo 'File not found.';
        exit;
    }

    header('Content-Type: application/octet-stream');
    header(
        'Content-Disposition: attachment; '
        . 'filename="' . $filename . '"'
    );
    header('Content-Length: ' . filesize($filePath));
    readfile($filePath);
    exit;
}

// ─── LIST ────────────────────────────────────────────────────────
function listBackups(): void
{
    $dir   = getBackupDir();
    $files = glob("{$dir}/*.sql") ?: [];

    $backups = array_map(fn ($f) => [
        'filename' => basename($f),
        'size'     => filesize($f),
        'created'  => date('Y-m-d H:i:s', filemtime($f)),
    ], $files);

    usort(
        $backups,
        fn ($a, $b) => strcmp($b['created'], $a['created'])
    );

    sendSuccess($backups);
}