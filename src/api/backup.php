<?php
// src/api/backup.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;

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
    $path = rtrim($_ENV['BACKUP_PATH'] ?? 'storage/backups', '/');
    $dir  = str_starts_with($path, '/')
        ? $path
        : __DIR__ . "/../../{$path}";

    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    return $dir;
}

// ─── CREATE EXCEL BACKUP ─────────────────────────────────────────
function createBackup(): void
{
    $dir       = getBackupDir();
    $timestamp = date('Ymd_His');
    $filename  = "fsl_backup_{$timestamp}.xlsx";
    $filePath  = "{$dir}/{$filename}";

    $pdo         = getDbConnection();
    $spreadsheet = new Spreadsheet();
    $sheetIndex  = 0;

    foreach (BACKUP_TABLES as $table) {
        if ($sheetIndex > 0) {
            $spreadsheet->createSheet();
        }
        
        $spreadsheet->setActiveSheetIndex($sheetIndex);
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($table);

        $stmt = $pdo->query("SELECT * FROM `{$table}`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            $sheetIndex++;
            continue;
        }

        $headers = array_keys($rows[0]);
        $col     = 'A';
        
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '1', $header);
            $col++;
        }

        $rowNum = 2;
        foreach ($rows as $row) {
            $col = 'A';
            foreach ($row as $val) {
                $sheet->setCellValue($col . $rowNum, $val);
                $col++;
            }
            $rowNum++;
        }
        $sheetIndex++;
    }

    $writer = new Xlsx($spreadsheet);
    
    try {
        $writer->save($filePath);
    } catch (Throwable $e) {
        sendError('Backup failed: ' . $e->getMessage(), 500);
        return;
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
}

// ─── RESTORE FROM UPLOAD ─────────────────────────────────────────
function restoreBackup(): void
{
    if (empty($_FILES['backup_file'])) {
        sendError('No file uploaded.', 422);
        return;
    }

    $file = $_FILES['backup_file'];
    $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($ext !== 'xlsx') {
        sendError('Only .xlsx files are allowed.', 422);
        return;
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendError('Upload error: ' . $file['error'], 422);
        return;
    }

    executeExcelRestore($file['tmp_name']);

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
    $body     = json_decode(file_get_contents('php://input'), true);
    $filename = $body['filename'] ?? '';

    if (!$filename) {
        sendError('No filename provided.', 422);
        return;
    }

    if (!preg_match('/^fsl_backup_[\d_]+\.xlsx$/', $filename)) {
        sendError('Invalid backup filename.', 422);
        return;
    }

    $dir         = getBackupDir();
    $filePath    = realpath("{$dir}/{$filename}");
    $expectedDir = realpath($dir);

    if (!$filePath || !str_starts_with($filePath, $expectedDir)) {
        sendError('Backup file not found.', 404);
        return;
    }

    executeExcelRestore($filePath);

    logAudit($_SESSION['user_id'], 'RESTORE', 'backup', 0, [
        'before' => [],
        'after'  => [
            'event' => 'restore_from_server',
            'file'  => $filename,
        ],
    ]);

    sendSuccess([], 'Database restored successfully.');
}

// ─── EXECUTE EXCEL RESTORE ───────────────────────────────────────
function executeExcelRestore(string $filePath): void
{
    $reader      = new XlsxReader();
    $spreadsheet = null;
    
    try {
        $spreadsheet = $reader->load($filePath);
    } catch (Throwable $e) {
        sendError('Failed to read Excel format.', 500);
        return;
    }

    $pdo = getDbConnection();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    try {
        $pdo->beginTransaction();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

        foreach (BACKUP_TABLES as $table) {
            $sheet = $spreadsheet->getSheetByName($table);
            if (!$sheet) {
                continue;
            }
            
            $pdo->exec("TRUNCATE TABLE `{$table}`");
            
            $rows = $sheet->toArray();
            if (count($rows) <= 1) {
                continue;
            }
            
            $headers      = array_shift($rows);
            $colList      = implode(', ', array_map(
                fn($c) => "`{$c}`", 
                $headers
            ));
            
            $placeholders = implode(', ', array_fill(
                0, 
                count($headers), 
                '?'
            ));
            
            $stmt = $pdo->prepare(
                "INSERT INTO `{$table}` ({$colList}) " .
                "VALUES ({$placeholders})"
            );
            
            foreach ($rows as $row) {
                $stmt->execute($row);
            }
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $pdo->commit();
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        sendError('Restore failed: ' . $e->getMessage(), 500);
        return;
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

    if (!preg_match('/^fsl_backup_[\d_]+\.xlsx$/', $filename)) {
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
        'Content-Disposition: attachment; filename="' . $filename . '"'
    );
    header('Content-Length: ' . filesize($filePath));
    readfile($filePath);
    exit;
}

// ─── LIST ────────────────────────────────────────────────────────
function listBackups(): void
{
    $dir   = getBackupDir();
    $files = glob("{$dir}/*.xlsx") ?: [];

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