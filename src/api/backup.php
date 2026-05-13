<?php
// src/api/backup.php
// Uses pure PHP/PDO — no mysqldump or mysql CLI required (works on Windows too)

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
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

function createBackup(): void
{
    $backupPath = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $dir        = __DIR__ . "/../../{$backupPath}";

    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        sendError('Cannot create backup directory.', 500);
    }

    $timestamp = date('Ymd_His');
    $filename  = "fsl_backup_{$timestamp}.sql";
    $filePath  = "{$dir}/{$filename}";

    try {
        $pdo = getDbConnection();
        $sql = generateSqlDump($pdo);

        if (file_put_contents($filePath, $sql) === false) {
            sendError('Could not write backup file.', 500);
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

    } catch (Throwable $e) {
        sendError('Backup failed: ' . $e->getMessage(), 500);
    }
}

function generateSqlDump(PDO $pdo): string
{
    // Bump limits — large databases need time and memory
    @ini_set('memory_limit',       '512M');
    @ini_set('max_execution_time', '300');

    $dbName = $_ENV['DB_NAME'];
    $out    = '';

    $out .= "-- FSL Inventory SQL Backup\n";
    $out .= "-- Generated : " . date('Y-m-d H:i:s') . "\n";
    $out .= "-- Database  : {$dbName}\n\n";
    $out .= "SET FOREIGN_KEY_CHECKS=0;\n";
    $out .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
    $out .= "SET NAMES utf8mb4;\n\n";

    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        $q = "`{$table}`";

        $createRow = $pdo->query("SHOW CREATE TABLE {$q}")->fetch(PDO::FETCH_NUM);
        $out .= "DROP TABLE IF EXISTS {$q};\n";
        $out .= $createRow[1] . ";\n\n";

        // Stream rows in chunks of 500 to avoid loading entire table into RAM
        $chunkSize = 500;
        $offset    = 0;

        // Get column list once
        $cols    = $pdo->query("SELECT * FROM {$q} LIMIT 0")->fetch(PDO::FETCH_ASSOC);
        $colList = $cols !== false
            ? implode(', ', array_map(fn ($c) => "`{$c}`", array_keys($cols)))
            : null;

        while (true) {
            $rows = $pdo->query("SELECT * FROM {$q} LIMIT {$chunkSize} OFFSET {$offset}")
                        ->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) break;

            if ($colList === null) {
                $colList = implode(', ', array_map(fn ($c) => "`{$c}`", array_keys($rows[0])));
            }

            foreach ($rows as $row) {
                $vals = array_map(function ($v) use ($pdo) {
                    return $v === null ? 'NULL' : $pdo->quote((string) $v);
                }, array_values($row));

                $out .= "INSERT INTO {$q} ({$colList}) VALUES (" . implode(', ', $vals) . ");\n";
            }

            $offset += $chunkSize;
            if (count($rows) < $chunkSize) break;
        }

        $out .= "\n";
    }

    $out .= "SET FOREIGN_KEY_CHECKS=1;\n";
    return $out;
}

function restoreServerBackup(): void
{
    $body     = json_decode(file_get_contents('php://input'), true);
    $filename = $body['filename'] ?? '';

    if (!$filename) sendError('No filename provided.', 422);

    if (!preg_match('/^fsl_backup_[\d_]+\.sql$/', $filename)) {
        sendError('Invalid backup filename.', 422);
    }

    $backupPath  = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $filePath    = realpath(__DIR__ . "/../../{$backupPath}/{$filename}");
    $expectedDir = realpath(__DIR__ . "/../../{$backupPath}");

    if (!$filePath || !str_starts_with($filePath, $expectedDir)) {
        sendError('Backup file not found.', 404);
    }

    executeSqlFile($filePath);

    logAudit($_SESSION['user_id'], 'UPDATE', 'audit_logs', 0, [
        'before' => [],
        'after'  => ['event' => 'restore', 'file' => $filename],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

function restoreBackup(): void
{
    if (empty($_FILES['backup_file'])) sendError('No file uploaded.', 422);

    $file = $_FILES['backup_file'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($ext !== 'sql') sendError('Only .sql files are allowed.', 422);
    if ($file['error'] !== UPLOAD_ERR_OK) sendError('File upload error: ' . $file['error'], 422);

    executeSqlFile($file['tmp_name']);

    logAudit($_SESSION['user_id'], 'UPDATE', 'audit_logs', 0, [
        'before' => [],
        'after'  => ['event' => 'restore', 'file' => $file['name']],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

function executeSqlFile(string $filePath): void
{
    $fileSize = filesize($filePath);
    if ($fileSize === false) sendError('Cannot stat backup file.', 500);

    // Stream large files line-by-line instead of file_get_contents
    // to avoid exhausting memory on multi-MB dumps
    $handle = fopen($filePath, 'r');
    if (!$handle) sendError('Cannot open backup file.', 500);

    // Bump limits for large restores at runtime
    @ini_set('memory_limit',       '512M');
    @ini_set('max_execution_time', '300');

    try {
        $pdo = getDbConnection();
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $pdo->exec('SET NAMES utf8mb4');

        $buffer   = '';
        $errors   = [];
        $inString = false;
        $strChar  = '';

        while (!feof($handle)) {
            $line = fgets($handle, 65536); // 64 KB per read
            if ($line === false) break;

            $line = rtrim($line, "\r\n");

            // Skip pure comment lines and blank lines when not mid-statement
            if (!$inString && (str_starts_with(ltrim($line), '--') || trim($line) === '')) {
                continue;
            }

            // Scan for string boundaries and statement end
            $len = strlen($line);
            for ($i = 0; $i < $len; $i++) {
                $ch = $line[$i];

                if (!$inString && ($ch === '\'' || $ch === '"' || $ch === '`')) {
                    $inString = true;
                    $strChar  = $ch;
                } elseif ($inString && $ch === $strChar) {
                    if (isset($line[$i + 1]) && $line[$i + 1] === $strChar) {
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
                    $stmt = trim($buffer);
                    $buffer = '';
                    if ($stmt !== '') {
                        try {
                            $pdo->exec($stmt);
                        } catch (PDOException $e) {
                            $msg = $e->getMessage();
                            // Suppress harmless warnings (charset vars on older MySQL)
                            if (!str_contains($msg, 'Unknown system variable')) {
                                $errors[] = $msg;
                            }
                        }
                    }
                } else {
                    $buffer .= $ch;
                }
            }

            // Preserve newline in multi-line values
            if ($inString) $buffer .= "\n";
        }

        // Execute any trailing statement without a final semicolon
        $stmt = trim($buffer);
        if ($stmt !== '') {
            try { $pdo->exec($stmt); } catch (PDOException $e) { $errors[] = $e->getMessage(); }
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        fclose($handle);

        if (!empty($errors)) {
            $fatal = array_filter($errors, fn($m) => !str_contains($m, 'Unknown system variable'));
            if (!empty($fatal)) {
                sendError('Restore completed with errors: ' . implode(' | ', array_slice(array_values($fatal), 0, 3)), 500);
            }
        }

    } catch (Throwable $e) {
        fclose($handle);
        sendError('Restore failed: ' . $e->getMessage(), 500);
    }
}

function splitSqlStatements(string $sql): array
{
    $statements = [];
    $current    = '';
    $len        = strlen($sql);
    $inString   = false;
    $strChar    = '';
    $i          = 0;

    while ($i < $len) {
        $ch = $sql[$i];

        if (!$inString && $ch === '-' && isset($sql[$i + 1]) && $sql[$i + 1] === '-') {
            while ($i < $len && $sql[$i] !== "\n") $i++;
            continue;
        }
        if (!$inString && $ch === '/' && isset($sql[$i + 1]) && $sql[$i + 1] === '*') {
            $i += 2;
            while ($i < $len && !($sql[$i] === '*' && isset($sql[$i + 1]) && $sql[$i + 1] === '/')) $i++;
            $i += 2;
            continue;
        }

        if (!$inString && ($ch === '\'' || $ch === '"' || $ch === '`')) {
            $inString = true;
            $strChar  = $ch;
        } elseif ($inString && $ch === $strChar) {
            if (isset($sql[$i + 1]) && $sql[$i + 1] === $strChar) {
                $current .= $ch;
                $i++;
            } else {
                $inString = false;
            }
        } elseif ($inString && $ch === '\\') {
            $current .= $ch . ($sql[$i + 1] ?? '');
            $i += 2;
            continue;
        }

        if (!$inString && $ch === ';') {
            $statements[] = trim($current);
            $current      = '';
        } else {
            $current .= $ch;
        }
        $i++;
    }

    if (trim($current) !== '') $statements[] = trim($current);
    return $statements;
}

function downloadBackup(): void
{
    $filename = getQueryString('filename');
    if (!$filename) { http_response_code(400); echo 'Missing filename.'; exit; }
    if (!preg_match('/^fsl_backup_[\d_]+\.sql$/', $filename)) { http_response_code(400); echo 'Invalid filename.'; exit; }

    $backupPath  = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $filePath    = realpath(__DIR__ . "/../../{$backupPath}/{$filename}");
    $expectedDir = realpath(__DIR__ . "/../../{$backupPath}");

    if (!$filePath || !str_starts_with($filePath, $expectedDir) || !is_file($filePath)) {
        http_response_code(404); echo 'File not found.'; exit;
    }

    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filePath));
    readfile($filePath);
    exit;
}

function listBackups(): void
{
    $backupPath = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups/', '/');
    $dir        = __DIR__ . "/../../{$backupPath}";
    $files      = glob("{$dir}/*.sql") ?: [];

    $backups = array_map(fn ($f) => [
        'filename' => basename($f),
        'size'     => filesize($f),
        'created'  => date('Y-m-d H:i:s', filemtime($f)),
    ], $files);

    usort($backups, fn ($a, $b) => strcmp($b['created'], $a['created']));
    sendSuccess($backups);
}
