<?php
// src/api/dashboard.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';

requireLogin();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

fetchDashboardStats();

function fetchDashboardStats(): void
{
    $pdo = getDbConnection();

    // Total assets
    $total = (int) $pdo
        ->query('SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL')
        ->fetchColumn();

    // By status
    $byStatus = [];
    foreach ($pdo->query('
        SELECT status, COUNT(*) AS count
        FROM assets WHERE deleted_at IS NULL
        GROUP BY status
    ')->fetchAll() as $row) {
        $byStatus[$row['status']] = (int) $row['count'];
    }

    // By category
    $byCategory = $pdo->query('
        SELECT c.id, c.name, COUNT(a.id) AS count
        FROM categories c
        LEFT JOIN assets a
            ON a.category_id = c.id AND a.deleted_at IS NULL
        GROUP BY c.id, c.name
        HAVING count > 0
        ORDER BY count DESC
    ')->fetchAll();

    // By location
    $byLocation = $pdo->query('
        SELECT l.name, COUNT(a.id) AS count
        FROM locations l
        LEFT JOIN assets a
            ON a.location_id = l.id AND a.deleted_at IS NULL
        GROUP BY l.id, l.name
        ORDER BY count DESC
    ')->fetchAll();

    // Top owners
    $topOwners = $pdo->query('
        SELECT o.id, o.name, COUNT(a.id) AS count
        FROM process_owners o
        LEFT JOIN assets a
            ON a.owner_id = o.id AND a.deleted_at IS NULL
        GROUP BY o.id, o.name
        HAVING count > 0
        ORDER BY count DESC
        LIMIT 5
    ')->fetchAll();

    // Counts
    $totalPOs     = (int) $pdo
        ->query('SELECT COUNT(*) FROM purchase_orders')
        ->fetchColumn();
    $totalVendors = (int) $pdo
        ->query('SELECT COUNT(*) FROM vendors')
        ->fetchColumn();
    $totalCats    = (int) $pdo
        ->query('SELECT COUNT(*) FROM categories')
        ->fetchColumn();
    $totalLocs    = (int) $pdo
        ->query('SELECT COUNT(*) FROM locations')
        ->fetchColumn();

    // Pending endorsement asset count
    $pendingEndorsement = (int) $pdo->query('
        SELECT COUNT(DISTINCT a.id)
        FROM assets a
        JOIN purchase_orders po ON a.po_id = po.id
        WHERE a.deleted_at IS NULL
          AND po.date_endorsed IS NULL
    ')->fetchColumn();

    // ── NEW: overdue POs (pending > 3 days) ──────────────────────
    $overduePOs = (int) $pdo->query('
        SELECT COUNT(*)
        FROM purchase_orders
        WHERE date_endorsed IS NULL
          AND date_received IS NOT NULL
          AND DATEDIFF(NOW(), date_received) > 3
    ')->fetchColumn();

    // ── NEW: oldest unendorsed PO with direct link data ───────────
    $oldestRow = $pdo->query('
        SELECT id, po_number,
               DATEDIFF(NOW(), date_received) AS days_overdue
        FROM purchase_orders
        WHERE date_endorsed IS NULL
          AND date_received IS NOT NULL
        ORDER BY date_received ASC
        LIMIT 1
    ')->fetch();

    $oldestOverduePO = $oldestRow
        ? [
            'id'           => (int) $oldestRow['id'],
            'po_number'    => $oldestRow['po_number'],
            'days_overdue' => (int) $oldestRow['days_overdue'],
        ]
        : null;

    // ── NEW: qty ordered vs serialized gap ───────────────────────
    /*
     * "Ordered" = sum of all asset rows in the All sheet,
     * represented here as assets linked to any PO.
     * "Serialized" = assets with a non-null serial_number.
     * Gap = POs that have assets but missing serial numbers.
     */
    $gapRows = $pdo->query('
        SELECT
            po.id,
            po.po_number,
            COUNT(a.id)                                  AS serialized,
            SUM(CASE WHEN a.serial_number = "" OR
                          a.serial_number IS NULL
                     THEN 1 ELSE 0 END)                  AS missing_sn
        FROM purchase_orders po
        JOIN assets a ON a.po_id = po.id
                      AND a.deleted_at IS NULL
        GROUP BY po.id, po.po_number
        HAVING missing_sn > 0
        ORDER BY missing_sn DESC
        LIMIT 5
    ')->fetchAll();

    $totalMissingSn = (int) $pdo->query('
        SELECT COUNT(*)
        FROM assets
        WHERE deleted_at IS NULL
          AND (serial_number IS NULL OR serial_number = "")
    ')->fetchColumn();

    // Recent activity
    $recentActivity = $pdo->query('
        SELECT al.action, al.table_name, al.timestamp,
               al.changes, u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT 5
    ')->fetchAll();

    sendSuccess([
        'total_assets'        => $total,
        'by_status'           => $byStatus,
        'by_category'         => $byCategory,
        'by_location'         => $byLocation,
        'top_owners'          => $topOwners,
        'total_pos'           => $totalPOs,
        'total_vendors'       => $totalVendors,
        'total_categories'    => $totalCats,
        'total_locations'     => $totalLocs,
        'pending_endorsement' => $pendingEndorsement,
        'overdue_pos'         => $overduePOs,
        'oldest_overdue_po'   => $oldestOverduePO,
        'total_missing_sn'    => $totalMissingSn,
        'gap_pos'             => $gapRows,
        'recent_activity'     => $recentActivity,
    ]);
}