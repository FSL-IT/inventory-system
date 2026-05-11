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

function fetchDashboardStats(): void {
    $pdo = getDbConnection();

    $totalStmt = $pdo->query(
        'SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL'
    );
    $total = (int) $totalStmt->fetchColumn();

    $statusSql = '
        SELECT status, COUNT(*) AS count
        FROM assets
        WHERE deleted_at IS NULL
        GROUP BY status
    ';
    $statusStmt = $pdo->query($statusSql);
    $statusRows = $statusStmt->fetchAll();
    $byStatus = [];

    foreach ($statusRows as $row) {
        $byStatus[$row['status']] = (int) $row['count'];
    }

    $catSql = '
        SELECT c.name, COUNT(a.id) AS count
        FROM categories c
        LEFT JOIN assets a ON a.category_id = c.id AND a.deleted_at IS NULL
        GROUP BY c.id, c.name
        ORDER BY count DESC
    ';
    $catStmt = $pdo->query($catSql);
    $byCategory = $catStmt->fetchAll();

    $locSql = '
        SELECT l.name, COUNT(a.id) AS count
        FROM locations l
        LEFT JOIN assets a ON a.location_id = l.id AND a.deleted_at IS NULL
        GROUP BY l.id, l.name
        ORDER BY count DESC
    ';
    $locStmt = $pdo->query($locSql);
    $byLocation = $locStmt->fetchAll();

    $ownerSql = '
        SELECT o.name, COUNT(a.id) AS count
        FROM process_owners o
        LEFT JOIN assets a ON a.owner_id = o.id AND a.deleted_at IS NULL
        GROUP BY o.id, o.name
        ORDER BY count DESC
        LIMIT 5
    ';
    $ownerStmt = $pdo->query($ownerSql);
    $topOwners = $ownerStmt->fetchAll();

    $poCountStmt = $pdo->query('SELECT COUNT(*) FROM purchase_orders');
    $totalPOs = (int) $poCountStmt->fetchColumn();

    $vendorCountStmt = $pdo->query('SELECT COUNT(*) FROM vendors');
    $totalVendors = (int) $vendorCountStmt->fetchColumn();

    $catCountStmt = $pdo->query('SELECT COUNT(*) FROM categories');
    $totalCategories = (int) $catCountStmt->fetchColumn();

    $locCountStmt = $pdo->query('SELECT COUNT(*) FROM locations');
    $totalLocations = (int) $locCountStmt->fetchColumn();

    $pendingSql = '
        SELECT COUNT(DISTINCT a.id) AS count
        FROM assets a
        JOIN purchase_orders po ON a.po_id = po.id
        WHERE a.deleted_at IS NULL
          AND po.date_endorsed IS NULL
    ';
    $pendingStmt = $pdo->query($pendingSql);
    $pendingEndorsement = (int) $pendingStmt->fetchColumn();

    $recentSql = '
        SELECT al.action, al.table_name, al.timestamp,
               al.changes, u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT 5
    ';
    $recentStmt = $pdo->query($recentSql);
    $recentActivity = $recentStmt->fetchAll();

    sendSuccess([
        'total_assets'       => $total,
        'by_status'          => $byStatus,
        'by_category'        => $byCategory,
        'by_location'        => $byLocation,
        'top_owners'         => $topOwners,
        'total_pos'          => $totalPOs,
        'total_vendors'      => $totalVendors,
        'total_categories'   => $totalCategories,
        'total_locations'    => $totalLocations,
        'pending_endorsement' => $pendingEndorsement,
        'recent_activity'    => $recentActivity,
    ]);
}
