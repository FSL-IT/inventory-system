<?php
// src/api/import_export.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/export_helper.php';
require_once __DIR__ . '/../helpers/import_helper.php';

requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];
$action = getQueryString('action');

if ($method === 'GET' && $action === 'export') {
    handleExport();
} elseif ($method === 'GET' && $action === 'template') {
    exportTemplate();
} elseif ($method === 'POST' && $action === 'import') {
    requireCsrf();
    handleImport();
} else {
    header('Content-Type: application/json');
    sendError('Invalid request.', 400);
}

function handleExport(): void {
    $pdo = getDbConnection();

    $status = getQueryString('status');
    $categoryId = getQueryInt('category_id');

    $where = ['a.deleted_at IS NULL'];
    $params = [];

    if ($status) {
        $where[] = 'a.status = :status';
        $params[':status'] = $status;
    }

    if ($categoryId) {
        $where[] = 'a.category_id = :cat_id';
        $params[':cat_id'] = $categoryId;
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    $sql = "
        SELECT
            a.serial_number, a.description, a.status, a.remarks,
            c.name AS category_name,
            l.name AS location_name,
            o.name AS owner_name,
            po.po_number, po.date_received, po.date_endorsed,
            v.name AS vendor_name
        FROM assets a
        LEFT JOIN categories     c  ON a.category_id = c.id
        LEFT JOIN locations      l  ON a.location_id  = l.id
        LEFT JOIN process_owners o  ON a.owner_id     = o.id
        LEFT JOIN purchase_orders po ON a.po_id       = po.id
        LEFT JOIN vendors         v  ON po.vendor_id  = v.id
        {$whereClause}
        ORDER BY a.created_at DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $assets = $stmt->fetchAll();

    exportToExcel($assets, 'fsl_inventory_export_' . date('Ymd'));
}

function handleImport(): void {
    if (empty($_FILES['import_file'])) {
        header('Content-Type: application/json');
        sendError('No file uploaded.', 422);
    }

    $file = $_FILES['import_file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($ext !== 'xlsx') {
        header('Content-Type: application/json');
        sendError('Only .xlsx files are accepted.', 422);
    }

    $result = importFromExcel($file['tmp_name'], $_SESSION['user_id']);

    header('Content-Type: application/json');
    sendSuccess($result, "Import complete: {$result['success']} added, "
        . "{$result['failed']} skipped.");
}
