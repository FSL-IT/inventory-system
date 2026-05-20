<?php
// src/api/reports.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';

requireLogin();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

$type = $_GET['type'] ?? '';

match ($type) {
    'by_location' => fetchByLocation(),
    'by_owner'    => fetchByOwner(),
    default       => sendError('type required: by_location|by_owner', 400),
};

// ─── BY LOCATION ─────────────────────────────────────────────────────────────
function fetchByLocation(): void
{
    $pdo = getDbConnection();

    // All locations with their assets
    $locs = $pdo->query('
        SELECT l.id, l.name AS location_name, COUNT(a.id) AS total
        FROM locations l
        LEFT JOIN assets a
            ON a.location_id = l.id AND a.deleted_at IS NULL
        GROUP BY l.id, l.name
        ORDER BY l.name ASC
    ')->fetchAll();

    $result = [];

    foreach ($locs as $loc) {
        $stmt = $pdo->prepare('
            SELECT
                a.id,
                a.serial_number,
                a.description,
                a.status,
                a.remarks,
                c.name   AS category,
                o.name   AS owner,
                po.po_number,
                po.date_received
            FROM assets a
            LEFT JOIN categories     c  ON a.category_id = c.id
            LEFT JOIN process_owners o  ON a.owner_id    = o.id
            LEFT JOIN purchase_orders po ON a.po_id      = po.id
            WHERE a.location_id   = :loc_id
              AND a.deleted_at IS NULL
            ORDER BY c.name, a.description, a.serial_number
        ');
        $stmt->execute([':loc_id' => $loc['id']]);

        $result[] = [
            'location_id'   => (int) $loc['id'],
            'location_name' => $loc['location_name'],
            'total'         => (int) $loc['total'],
            'assets'        => $stmt->fetchAll(),
        ];
    }

    sendSuccess($result);
}

// ─── BY OWNER ─────────────────────────────────────────────────────────────────
function fetchByOwner(): void
{
    $pdo = getDbConnection();

    $owners = $pdo->query('
        SELECT o.id, o.name AS owner_name, COUNT(a.id) AS total
        FROM process_owners o
        LEFT JOIN assets a
            ON a.owner_id = o.id AND a.deleted_at IS NULL
        GROUP BY o.id, o.name
        ORDER BY o.name ASC
    ')->fetchAll();

    $result = [];

    foreach ($owners as $owner) {
        $stmt = $pdo->prepare('
            SELECT
                a.id,
                a.serial_number,
                a.description,
                a.status,
                a.remarks,
                c.name  AS category,
                l.name  AS location,
                po.po_number,
                po.date_received
            FROM assets a
            LEFT JOIN categories      c  ON a.category_id = c.id
            LEFT JOIN locations       l  ON a.location_id  = l.id
            LEFT JOIN purchase_orders po ON a.po_id        = po.id
            WHERE a.owner_id    = :owner_id
              AND a.deleted_at IS NULL
            ORDER BY c.name, a.description, a.serial_number
        ');
        $stmt->execute([':owner_id' => $owner['id']]);

        $result[] = [
            'owner_id'   => (int) $owner['id'],
            'owner_name' => $owner['owner_name'],
            'total'      => (int) $owner['total'],
            'assets'     => $stmt->fetchAll(),
        ];
    }

    sendSuccess($result);
}