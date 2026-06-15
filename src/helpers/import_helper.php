<?php
// src/helpers/import_helper.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../helpers/audit_helper.php';
require_once __DIR__ . '/../core/validator.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Xlsx as XlsxReader;

// ─── PUBLIC ENTRY POINT ──────────────────────────────────────────────────────

/**
 * Main import router.
 * Detects whether the uploaded file is a PO-native workbook
 * (has category sheets like "Desktop", "Laptop") or a flat
 * template import, then delegates accordingly.
 */
function importFromExcel(string $filePath, int $userId): array
{
    @ini_set('memory_limit',       '512M');
    @ini_set('max_execution_time', '300');

    $result = [
        'success'        => 0,
        'failed'         => 0,
        'errors'         => [],
        'infile_dupes'   => [],
        'db_dupes'       => [],
    ];

    try {
        $reader = new XlsxReader();
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($filePath);
    } catch (Throwable $e) {
        $result['errors'][] = 'Could not read file: ' . $e->getMessage();
        return $result;
    }

    $sheetNames = $spreadsheet->getSheetNames();
    $isPoNative = detectPoNativeFormat($sheetNames);

    if ($isPoNative) {
        $result = importPoNative($spreadsheet, $userId, $result);
    } else {
        $result = importFlatTemplate($spreadsheet, $userId, $result);
    }

    $spreadsheet->disconnectWorksheets();
    unset($spreadsheet);

    return $result;
}

// ─── FORMAT DETECTION ────────────────────────────────────────────────────────

/**
 * Returns true if the workbook contains at least 2 known
 * PO-native category sheet names.
 */
function detectPoNativeFormat(array $sheetNames): bool
{
    $known = array_keys(PO_SHEET_MAP);
    $hits  = array_intersect($known, $sheetNames);
    return count($hits) >= 2;
}

// ─── PO-NATIVE IMPORT ────────────────────────────────────────────────────────

/**
 * Imports from the multi-sheet PO workbook.
 * Smart Logic: 
 * - If Serial Number is provided -> Creates PO and Asset (checks for duplicates).
 * - If Serial Number is blank -> Creates the PO only (No Asset).
 */
function importPoNative(
    $spreadsheet,
    int $userId,
    array $result
): array {
    $pdo        = getDbConnection();
    $sheetMap   = PO_SHEET_MAP;
    $allSerials = [];

    // Pass 1: collect all serials from all sheets to find in-file dupes
    foreach ($sheetMap as $sheetName => $categoryName) {
        $sheet = $spreadsheet->getSheetByName($sheetName);
        if (!$sheet) {
            continue;
        }

        $highest = $sheet->getHighestDataRow();
        for ($r = 2; $r <= $highest; $r++) {
            $sn = trim((string) $sheet
                ->getCellByColumnAndRow(2, $r)
                ->getValue()
            );
            if (!$sn) {
                continue; // We allow blank serials now
            }
            if (isset($allSerials[$sn])) {
                $result['infile_dupes'][] =
                    "{$sn} (appears in multiple sheets)";
                continue;
            }
            $allSerials[$sn] = $sheetName;
        }
    }

    // Pass 2: Process rows (Create POs and Assets)
    foreach ($sheetMap as $sheetName => $categoryName) {
        $sheet = $spreadsheet->getSheetByName($sheetName);
        if (!$sheet) {
            continue;
        }

        $categoryId = getOrCreateCategory($pdo, $categoryName, $userId);
        $highest    = $sheet->getHighestDataRow();

        for ($r = 2; $r <= $highest; $r++) {
            $desc   = trim((string) $sheet->getCellByColumnAndRow(1, $r)->getValue());
            $sn     = trim((string) $sheet->getCellByColumnAndRow(2, $r)->getValue());
            $poStr  = trim((string) $sheet->getCellByColumnAndRow(3, $r)->getValue());
            $center = trim((string) $sheet->getCellByColumnAndRow(4, $r)->getValue());
            $owner  = trim((string) $sheet->getCellByColumnAndRow(5, $r)->getValue());
            $rem    = trim((string) $sheet->getCellByColumnAndRow(6, $r)->getValue());

            // Skip completely empty rows
            if (!$sn && !$poStr && !$desc) {
                continue;
            }

            // 1. ALWAYS process the Purchase Order if provided
            $poId = null;
            if ($poStr) {
                $vendorId = resolveVendorFromPo($pdo, $poStr);
                $poId     = resolvePo($pdo, $poStr, $vendorId);
            }

            // 2. If Serial Number is missing, we ONLY register the PO
            if (!$sn) {
                if ($poStr) {
                    // We successfully created/ensured the PO exists. 
                    // No asset is created because SN is missing.
                    $result['success']++;
                } else {
                    // Data exists, but no SN and no PO.
                    $result['failed']++;
                    $result['errors'][] = "{$sheetName} row {$r}: Missing Serial Number and PO Number.";
                }
                continue;
            }

            // 3. Serial Number IS provided -> Process Asset Creation

            // Check in-file dupe
            if (
                isset($allSerials[$sn]) &&
                in_array(
                    "{$sn} (appears in multiple sheets)",
                    $result['infile_dupes'],
                    true
                )
            ) {
                $result['failed']++;
                continue;
            }

            // Check DB duplicate (STRICT DUPLICATE CHECK)
            $chk = $pdo->prepare(
                'SELECT id FROM assets WHERE serial_number = :sn LIMIT 1'
            );
            $chk->execute([':sn' => $sn]);

            if ($chk->fetch()) {
                $result['db_dupes'][] = $sn;
                $result['failed']++;
                $result['errors'][] = "{$sheetName} row {$r}: Serial Number '{$sn}' already exists (Duplicate).";
                continue;
            }

            // Resolve relationships
            $locationId = resolveOrCreateLocation($pdo, $center, $userId);
            $ownerId    = resolveOrCreateOwner($pdo, $owner, $userId);
            $remarks    = normaliseRemarks($rem);

            try {
                $ins = $pdo->prepare('
                    INSERT INTO assets
                        (serial_number, description, po_id,
                         category_id, location_id, owner_id,
                         remarks, status)
                    VALUES
                        (:sn, :desc, :po_id,
                         :cat_id, :loc_id, :owner_id,
                         :remarks, :status)
                ');
                $ins->execute([
                    ':sn'       => sanitizeString($sn),
                    ':desc'     => sanitizeString($desc),
                    ':po_id'    => $poId       ?: null,
                    ':cat_id'   => $categoryId,
                    ':loc_id'   => $locationId ?: null,
                    ':owner_id' => $ownerId    ?: null,
                    ':remarks'  => $remarks,
                    ':status'   => 'active',
                ]);

                $newId = (int) $pdo->lastInsertId();
                logAudit($userId, 'INSERT', 'assets', $newId, [
                    'before' => [],
                    'after'  => [
                        'serial_number' => $sn,
                        'description'   => $desc,
                        'category'      => $categoryName,
                        'source'        => 'po_native_import',
                    ],
                ]);

                $result['success']++;
            } catch (PDOException $e) {
                $result['failed']++;
                $result['errors'][] =
                    "{$sheetName} row {$r}: Database error - " . $e->getMessage();
            }
        }
    }

    if ($result['success'] === 0 && $result['failed'] === 0 && empty($result['errors'])) {
        $result['errors'][] = 'No valid data found. Did you put your data in the 
            "All" sheet? You MUST enter data into the specific category tabs 
                (e.g., Desktop, Laptop).';
        $result['failed'] = 1; 
    }

    return $result;
}

// ─── FLAT TEMPLATE IMPORT ─────────────────────────────────────────────────────

/**
 * Original flat-template import — unchanged logic, cleaned style.
 */
function importFlatTemplate(
    $spreadsheet,
    int $userId,
    array $result
): array {
    $sheet     = $spreadsheet->getActiveSheet();
    $headerRow = [];

    foreach ($sheet->getRowIterator(1, 1) as $row) {
        foreach ($row->getCellIterator() as $cell) {
            $raw         = strtolower(trim((string) $cell->getValue()));
            $headerRow[] = str_replace(' ', '_', $raw);
        }
    }

    $missing = array_diff(EXCEL_IMPORT_HEADERS, $headerRow);

    if (!empty($missing)) {
        $result['errors'][] =
            'Missing columns: ' . implode(', ', $missing);
        return $result;
    }

    $colMap     = array_flip($headerRow);
    $pdo        = getDbConnection();
    $highestRow = $sheet->getHighestDataRow();
    $allSerials = [];

    // Collect all serials first for in-file dupe check
    for ($r = 2; $r <= $highestRow; $r++) {
        $snCol = $colMap['serial_number'] + 1;
        $sn    = trim((string) $sheet
            ->getCellByColumnAndRow($snCol, $r)->getValue());
        if (!$sn) {
            continue;
        }
        if (isset($allSerials[$sn])) {
            $result['infile_dupes'][] = $sn;
        }
        $allSerials[$sn] = $r;
    }

    for ($rowNum = 2; $rowNum <= $highestRow; $rowNum++) {
        $rowData = [];
        foreach ($colMap as $colName => $colIdx) {
            $cell            = $sheet->getCellByColumnAndRow(
                $colIdx + 1, $rowNum
            );
            $rowData[$colName] = trim((string) $cell->getValue());
        }

        $serial  = sanitizeString($rowData['serial_number'] ?? '');
        $desc    = sanitizeString($rowData['description']   ?? '');
        $catName = sanitizeString($rowData['category']      ?? '');

        if (!$serial && !$desc && !$catName) {
            continue;
        }

        if (!$serial || !$desc || !$catName) {
            $result['failed']++;
            $result['errors'][] =
                "Row {$rowNum}: serial, description, category required.";
            continue;
        }

        if (in_array($serial, $result['infile_dupes'], true)) {
            $result['failed']++;
            continue;
        }

        $status = sanitizeString($rowData['status'] ?? 'active');
        if (!validateEnum($status, ASSET_STATUSES)) {
            $status = 'active';
        }

        $vendorStr = sanitizeString($rowData['vendor']        ?? '');
        $locStr    = sanitizeString($rowData['location']      ?? '');
        $ownerStr  = sanitizeString($rowData['process_owner'] ?? '');
        $poStr     = sanitizeString($rowData['po_number']     ?? '');
        $remarks   = normaliseRemarks(
            sanitizeString($rowData['remarks'] ?? '')
        );

        $categoryId = getOrCreateCategory($pdo, $catName, $userId);
        $vendorId   = resolveVendor($pdo, $vendorStr);
        $locationId = resolveLocation($pdo, $locStr);
        $ownerId    = resolveOwner($pdo, $ownerStr);
        $poId       = resolvePo($pdo, $poStr, $vendorId);

        $chk = $pdo->prepare(
            'SELECT id FROM assets WHERE serial_number = :sn LIMIT 1'
        );
        $chk->execute([':sn' => $serial]);

        if ($chk->fetch()) {
            $result['db_dupes'][] = $serial;
            $result['failed']++;
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
            $result['errors'][] =
                "Row {$rowNum}: DB err — " . $e->getMessage();
        }
    }

    return $result;
}

// ─── RESOLVE / CREATE HELPERS ─────────────────────────────────────────────────

function getOrCreateCategory(PDO $pdo, string $name, int $userId): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM categories WHERE name = :n LIMIT 1'
    );
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['id'];
    }

    $ins = $pdo->prepare('INSERT INTO categories (name) VALUES (:n)');
    $ins->execute([':n' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($userId, 'INSERT', 'categories', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    return $newId;
}

function resolveOrCreateLocation(
    PDO $pdo,
    string $name,
    int $userId
): ?int {
    if (!$name) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM locations WHERE name = :n LIMIT 1'
    );
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['id'];
    }

    $ins = $pdo->prepare('INSERT INTO locations (name) VALUES (:n)');
    $ins->execute([':n' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($userId, 'INSERT', 'locations', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    return $newId;
}

function resolveOrCreateOwner(
    PDO $pdo,
    string $name,
    int $userId
): ?int {
    if (!$name) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM process_owners WHERE name = :n LIMIT 1'
    );
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['id'];
    }

    $ins = $pdo->prepare(
        'INSERT INTO process_owners (name) VALUES (:n)'
    );
    $ins->execute([':n' => $name]);
    $newId = (int) $pdo->lastInsertId();

    logAudit($userId, 'INSERT', 'process_owners', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    return $newId;
}

function resolveVendor(PDO $pdo, string $name): ?int
{
    if (!$name) {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT id FROM vendors WHERE name = :n LIMIT 1'
    );
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolveVendorFromPo(PDO $pdo, string $poNumber): ?int
{
    if (!$poNumber) {
        return null;
    }
    $stmt = $pdo->prepare('
        SELECT v.id
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        WHERE po.po_number = :po
        LIMIT 1
    ');
    $stmt->execute([':po' => $poNumber]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolveLocation(PDO $pdo, string $name): ?int
{
    if (!$name) {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT id FROM locations WHERE name = :n LIMIT 1'
    );
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolveOwner(PDO $pdo, string $name): ?int
{
    if (!$name) {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT id FROM process_owners WHERE name = :n LIMIT 1'
    );
    $stmt->execute([':n' => $name]);
    $row = $stmt->fetch();
    return $row ? (int) $row['id'] : null;
}

function resolvePo(PDO $pdo, string $poNumber, ?int $vendorId): ?int
{
    if (!$poNumber) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM purchase_orders WHERE po_number = :po LIMIT 1'
    );
    $stmt->execute([':po' => $poNumber]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['id'];
    }

    $fy = parseFiscalYear($poNumber);

    $ins = $pdo->prepare('
        INSERT INTO purchase_orders (vendor_id, po_number, fiscal_year)
        VALUES (:vid, :po, :fy)
    ');
    $ins->execute([
        ':vid' => $vendorId,
        ':po'  => $poNumber,
        ':fy'  => $fy,
    ]);

    return (int) $pdo->lastInsertId();
}

// ─── UTILITY HELPERS ─────────────────────────────────────────────────────────

/**
 * Extracts fiscal year from PO number.
 * e.g. "7100/NT/FY25/94426/Q44873" → "FY25"
 */
function parseFiscalYear(string $poNumber): ?string
{
    if (preg_match('/FY\d{2}/i', $poNumber, $m)) {
        return strtoupper($m[0]);
    }
    return null;
}

/**
 * Normalises free-text remarks to a known constant key.
 * Falls back to raw value if nothing matches.
 */
function normaliseRemarks(string $raw): string
{
    $lower = strtolower(trim($raw));

    if (!$lower || $lower === 'na' || $lower === 'n/a') {
        return 'NA';
    }
    if (str_contains($lower, 'pink')) {
        return 'pink_mark';
    }
    if (str_contains($lower, 'orange')) {
        return 'orange_mark';
    }
    if (str_contains($lower, 'no mark')) {
        return 'no_mark';
    }
    if (str_contains($lower, 'monitor')) {
        return 'with_monitor';
    }
    if (str_contains($lower, 'partial') || str_contains($lower, 'only')) {
        return 'partial';
    }

    return $raw;
}