<?php
// src/api/po_hints.php
//
// Returns the most-common location, owner, category, and description
// for assets already linked to a given PO.
// Used by the Add-Asset modal to smart-fill fields on PO selection.

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';

requireLogin();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$poId = getQueryInt('po_id');

if (!$poId) {
    sendError('po_id is required.', 422);
}

$pdo = getDbConnection();

/*
 * Pick the most-used location, owner, category, and description
 * from existing assets on this PO. Uses COUNT + ORDER DESC so the
 * dominant values float to the top — matching how the Excel works
 * (one PO → one Center Delivered → one Process Name).
 */
$stmt = $pdo->prepare('
    SELECT
        l.id                    AS location_id,
        l.name                  AS location_name,
        o.id                    AS owner_id,
        o.name                  AS owner_name,
        c.id                    AS category_id,
        c.name                  AS category_name,
        a.description,
        COUNT(a.id)             AS freq
    FROM assets a
    LEFT JOIN locations      l ON a.location_id  = l.id
    LEFT JOIN process_owners o ON a.owner_id     = o.id
    LEFT JOIN categories     c ON a.category_id  = c.id
    WHERE a.po_id       = :po_id
      AND a.deleted_at IS NULL
    GROUP BY
        l.id, l.name,
        o.id, o.name,
        c.id, c.name,
        a.description
    ORDER BY freq DESC
    LIMIT 1
');
$stmt->execute([':po_id' => $poId]);
$row = $stmt->fetch();

if (!$row) {
    // No assets yet on this PO — also return vendor info
    $poStmt = $pdo->prepare('
        SELECT v.name AS vendor_name
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE po.id = :id
        LIMIT 1
    ');
    $poStmt->execute([':id' => $poId]);
    $po = $poStmt->fetch();

    sendSuccess([
        'location_id'   => null,
        'location_name' => null,
        'owner_id'      => null,
        'owner_name'    => null,
        'category_id'   => null,
        'category_name' => null,
        'description'   => null,
        'vendor_name'   => $po['vendor_name'] ?? null,
    ]);
}

// Also grab vendor name from the PO
$poStmt = $pdo->prepare('
    SELECT v.name AS vendor_name
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    WHERE po.id = :id
    LIMIT 1
');
$poStmt->execute([':id' => $poId]);
$po = $poStmt->fetch();

sendSuccess([
    'location_id'   => $row['location_id'],
    'location_name' => $row['location_name'],
    'owner_id'      => $row['owner_id'],
    'owner_name'    => $row['owner_name'],
    'category_id'   => $row['category_id'],
    'category_name' => $row['category_name'],
    'description'   => $row['description'],
    'vendor_name'   => $po['vendor_name'] ?? null,
]);