<?php
// src/helpers/import_helper.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../helpers/audit_helper.php';
require_once __DIR__ . '/../core/validator.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

function importFromExcel(string $filePath, int $userId): array {
    $pdo = getDbConnection();
    $result = [
        'success' => 0,
        'failed'  => 0,
        'errors'  => [],
    ];

    try {
        $spreadsheet = IOFactory::load($filePath);
    } catch (Exception $e) {
        return array_merge($result, ['errors' => ['Could not read file.']]);
    }

    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray(null, true, true, true);

    $headerRow = array_shift($rows);
    $headers = array_map('strtolower', array_map('trim', $headerRow));

    $required = EXCEL_IMPORT_HEADERS;
    $missing = array_diff($required, $headers);

    if ($missing) {
        return array_merge($result, [
            'errors' => ['Missing headers: ' . implode(', ', $missing)]
        ]);
    }

    $colMap = array_flip($headers);

    foreach ($rows as $rowNum => $row) {
        $line = $rowNum + 2;

        $serial = sanitizeString($row[$colMap['serial_number']] ?? '');
        $desc = sanitizeString($row[$colMap['description']] ?? '');
        $catName = sanitizeString($row[$colMap['category']] ?? '');

        if (!$serial || !$desc || !$catName) {
            $result['failed']++;
            $result['errors'][] = "Row {$line}: serial_number, description, "
                . "and category are required.";
            continue;
        }

        $status = sanitizeString($row[$colMap['status']] ?? 'active');

        if (!validateEnum($status, ASSET_STATUSES)) {
            $status = 'active';
        }

        $categoryId = getOrCreateCategory($pdo, $catName, $userId);
        $vendorId = resolveVendor(
            $pdo,
            sanitizeString($row[$colMap['vendor']] ?? '')
        );
        $locationId = resolveLocation(
            $pdo,
            sanitizeString($row[$colMap['location']] ?? '')
        );
        $ownerId = resolveOwner(
            $pdo,
            sanitizeString($row[$colMap['process_owner']] ?? '')
        );
        $poId = resolvePo(
            $pdo,
            sanitizeString($row[$colMap['po_number']] ?? ''),
            $vendorId
        );

        $dateReceived = sanitizeString($row[$colMap['date_received']] ?? '');
        $dateEndorsed = sanitizeString($row[$colMap['date_endorsed']] ?? '');
        $remarks = sanitizeString($row[$colMap['remarks']] ?? '');

        $existingStmt = $pdo->prepare(
            'SELECT id FROM assets WHERE serial_number = :sn LIMIT 1'
        );
        $existingStmt->execute([':sn' => $serial]);
        $existing = $existingStmt->fetch();

        if ($existing) {
            $result['failed']++;
            $result['errors'][] = "Row {$line}: Serial '{$serial}' already exists.";
            continue;
        }

        try {
            $insertSql = '
                INSERT INTO assets
                    (serial_number, description, po_id, category_id,
                     location_id, owner_id, remarks, status)
                VALUES
                    (:sn, :desc, :po_id, :cat_id,
                     :loc_id, :owner_id, :remarks, :status)
            ';

            $insertStmt = $pdo->prepare($insertSql);
            $insertStmt->execute([
                ':sn'       => $serial,
                ':desc'     => $desc,
                ':po_id'    => $poId ?: null,
                ':cat_id'   => $categoryId,
                ':loc_id'   => $locationId ?: null,
                ':owner_id' => $ownerId ?: null,
                ':remarks'  => $remarks,
                ':status'   => $status,
            ]);

            $newId = (int) $pdo->lastInsertId();
            logAudit($userId, 'INSERT', 'assets', $newId, [
                'before' => [],
                'after'  => compact(
                    'serial', 'desc', 'status', 'categoryId'
                ),
            ]);
            $result['success']++;
        } catch (PDOException $e) {
            $result['failed']++;
            $result['errors'][] = "Row {$line}: DB error — " . $e->getMessage();
        }
    }

    return $result;
}

function getOrCreateCategory(PDO $pdo, string $name, int $userId): int {
    $stmt = $pdo->prepare(
        'SELECT id FROM categories WHERE name = :name LIMIT 1'
    );
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch();

    if ($row) {
        return (int) $row['id'];
    }

    $ins = $pdo->prepare('INSERT INTO categories (name) VALUES (:name)');
    $ins->execute([':name' => $name]);
    $newId = (int) $pdo->lastInsertId();
    logAudit($userId, 'INSERT', 'categories', $newId, [
        'before' => [],
        'after'  => ['name' => $name],
    ]);

    return $newId;
}

function resolveVendor(PDO $pdo, string $name): ?int {
    if (!$name) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM vendors WHERE name = :name LIMIT 1'
    );
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch();

    return $row ? (int) $row['id'] : null;
}

function resolveLocation(PDO $pdo, string $name): ?int {
    if (!$name) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM locations WHERE name = :name LIMIT 1'
    );
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch();

    return $row ? (int) $row['id'] : null;
}

function resolveOwner(PDO $pdo, string $name): ?int {
    if (!$name) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id FROM process_owners WHERE name = :name LIMIT 1'
    );
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch();

    return $row ? (int) $row['id'] : null;
}

function resolvePo(PDO $pdo, string $poNumber, ?int $vendorId): ?int {
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

    $ins = $pdo->prepare(
        'INSERT INTO purchase_orders (vendor_id, po_number) VALUES (:vid, :po)'
    );
    $ins->execute([':vid' => $vendorId, ':po' => $poNumber]);

    return (int) $pdo->lastInsertId();
}
