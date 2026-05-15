<?php
// src/helpers/import_helper.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../helpers/audit_helper.php';
require_once __DIR__ . '/../core/validator.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;

function importFromExcel(string $filePath, int $userId): array
{
    // Raise limits for large spreadsheets
    @ini_set('memory_limit',       '512M');
    @ini_set('max_execution_time', '300');

    $result = ['success' => 0, 'failed' => 0, 'errors' => []];

    try {
        $reader = new XlsxReader();
        $reader->setReadDataOnly(true);
        $reader->setLoadSheetsOnly(null); 
        $spreadsheet = $reader->load($filePath);
    } catch (Throwable $e) {
        $result['errors'][] = 'Could not read file: ' . $e->getMessage();
        return $result;
    }

    $sheet = $spreadsheet->getActiveSheet();

    // Converts "Serial Number" to "serial_number" to match expected template
    $headerRow = [];
    foreach ($sheet->getRowIterator(1, 1) as $row) {
        foreach ($row->getCellIterator() as $cell) {
            $rawVal = strtolower(trim((string) $cell->getValue()));
            $headerRow[] = str_replace(' ', '_', $rawVal);
        }
    }

    $required = EXCEL_IMPORT_HEADERS;
    $missing  = array_diff($required, $headerRow);

    if (!empty($missing)) {
        $result['errors'][] = 'Missing columns: ' . implode(', ', $missing);
        return $result;
    }

    // Build column index map (0-based)
    $colMap = array_flip($headerRow);
    $pdo    = getDbConnection();
    
    $highestRow = $sheet->getHighestDataRow();

    for ($rowNum = 2; $rowNum <= $highestRow; $rowNum++) {
        $rowData = [];
        foreach ($colMap as $colName => $colIdx) {
            // PhpSpreadsheet uses 1-based column index
            $cell = $sheet->getCellByColumnAndRow($colIdx + 1, $rowNum);
            $rowData[$colName] = trim((string) $cell->getValue());
        }

        $serial  = sanitizeString($rowData['serial_number'] ?? '');
        $desc    = sanitizeString($rowData['description']   ?? '');
        $catName = sanitizeString($rowData['category']      ?? '');

        // Skip fully empty rows
        if ($serial === '' && $desc === '' && $catName === '') {
            continue;
        }

        if (!$serial || !$desc || !$catName) {
            $result['failed']++;
            $result['errors'][] = "Row {$rowNum}: serial, desc, and cat req.";
            continue;
        }

        $status = sanitizeString($rowData['status'] ?? 'active');
        if (!validateEnum($status, ASSET_STATUSES)) {
            $status = 'active';
        }

        // Clean string extractions to abide by 80-char limits
        $vendorStr = sanitizeString($rowData['vendor']        ?? '');
        $locStr    = sanitizeString($rowData['location']      ?? '');
        $ownerStr  = sanitizeString($rowData['process_owner'] ?? '');
        $poStr     = sanitizeString($rowData['po_number']     ?? '');
        $remarks   = sanitizeString($rowData['remarks']       ?? '');

        // Resolve relational IDs
        $categoryId = getOrCreateCategory($pdo, $catName, $userId);
        $vendorId   = resolveVendor($pdo, $vendorStr);
        $locationId = resolveLocation($pdo, $locStr);
        $ownerId    = resolveOwner($pdo, $ownerStr);
        $poId       = resolvePo($pdo, $poStr, $vendorId);

        // Check duplicate
        $chk = $pdo->prepare(
            'SELECT id FROM assets WHERE serial_number = :sn LIMIT 1'
        );
        $chk->execute([':sn' => $serial]);
        
        if ($chk->fetch()) {
            $result['failed']++;
            $result['errors'][] = "Row {$rowNum}: SN '{$serial}' exists.";
            continue;
        }

        try {
            $ins = $pdo->prepare('
                INSERT INTO assets
                    (serial_number, description, po_id, category_id,
                     location_id, owner_id, remarks, status)
                VALUES
                    (:sn, :desc, :po_id, :cat_id,
                     :loc_id, :owner_id, :remarks, :status)
            ');
            $ins->execute([
                ':sn'       => $serial,
                ':desc'     => $desc,
                ':po_id'    => $poId       ?: null,
                ':cat_id'   => $categoryId,
                ':loc_id'   => $locationId ?: null,
                ':owner_id' => $ownerId    ?: null,
                ':remarks'  => $remarks,
                ':status'   => $status,
            ]);

            $newId = (int) $pdo->lastInsertId();
            logAudit($userId, 'INSERT', 'assets', $newId, [
                'before' => [],
                'after'  => compact('serial', 'desc', 'status', 'categoryId'),
            ]);
            
            $result['success']++;
        } catch (PDOException $e) {
            $result['failed']++;
            $result['errors'][] = "Row {$rowNum}: DB err - " . $e->getMessage();
        }
    }

    $spreadsheet->disconnectWorksheets();
    unset($spreadsheet);

    return $result;
}

function getOrCreateCategory(PDO $pdo, string $name, int $userId): int
{
    $stmt = $pdo->prepare('SELECT id FROM categories WHERE name = :n LIMIT 1');
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    
    if ($row) return (int) $row['id'];

    $ins = $pdo->prepare('INSERT INTO categories (name) VALUES (:n)');
    $ins->execute([':n' => $name]);
    $newId = (int) $pdo->lastInsertId();
    
    logAudit($userId, 'INSERT', 'categories', $newId, [
        'before' => [], 
        'after'  => ['name' => $name]
    ]);
    
    return $newId;
}

function resolveVendor(PDO $pdo, string $name): ?int
{
    if (!$name) return null;
    $stmt = $pdo->prepare('SELECT id FROM vendors WHERE name = :n LIMIT 1');
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolveLocation(PDO $pdo, string $name): ?int
{
    if (!$name) return null;
    $stmt = $pdo->prepare('SELECT id FROM locations WHERE name = :n LIMIT 1');
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolveOwner(PDO $pdo, string $name): ?int
{
    if (!$name) return null;
    $stmt = $pdo->prepare('
        SELECT id FROM process_owners WHERE name = :n LIMIT 1
    ');
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolvePo(PDO $pdo, string $poNumber, ?int $vendorId): ?int
{
    if (!$poNumber) return null;
    $stmt = $pdo->prepare('
        SELECT id FROM purchase_orders WHERE po_number = :po LIMIT 1
    ');
    $stmt->execute([':po' => $poNumber]);
    $row = $stmt->fetch();
    
    if ($row) return (int) $row['id'];

    $ins = $pdo->prepare('
        INSERT INTO purchase_orders (vendor_id, po_number) 
        VALUES (:vid, :po)
    ');
    $ins->execute([':vid' => $vendorId, ':po' => $poNumber]);
    return (int) $pdo->lastInsertId();
}