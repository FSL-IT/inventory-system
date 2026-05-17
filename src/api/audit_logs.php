<?php
// src/api/audit_logs.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/export_helper.php'; 

requireRole('admin');

// We intercept GET requests. If the "export" param is true, we download Excel!
if ($_SERVER['REQUEST_METHOD'] === 'GET' && getQueryString('export') === 'true') {
    exportAuditLogsData();
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: application/json');
    fetchAuditLogs();
} else {
    header('Content-Type: application/json');
    sendError('Method not allowed.', 405);
}

function fetchAuditLogs(): void 
{
    $pdo     = getDbConnection();
    // Allow large limits to load all into client memory for the frontend filtering
    $perPage = getQueryInt('per_page', 5000); 
    
    $whereClause = 'WHERE 1=1';

    $countSql  = "SELECT COUNT(*) FROM audit_logs al {$whereClause}";
    $countStmt = $pdo->query($countSql);
    $total     = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT
            al.id, al.action, al.table_name, al.record_id,
            al.changes, al.ip_address, al.timestamp,
            u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        {$whereClause}
        ORDER BY al.timestamp DESC
        LIMIT :limit
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Client-side pagination expects page info, but we bypass server math
    sendPaginated($rows, $total, 1, $perPage);
}

function exportAuditLogsData(): void
{
    $pdo = getDbConnection();

    // Reapply backend filtering specifically for the Excel Export!
    $action    = getQueryString('action');
    $tableName = getQueryString('table_name');
    
    $where  = ['1=1'];
    $params = [];

    if ($action && validateEnum($action, AUDIT_ACTIONS)) {
        $where[]           = 'al.action = :action';
        $params[':action'] = $action;
    }

    if ($tableName && validateEnum($tableName, AUDIT_TABLES)) {
        $where[]               = 'al.table_name = :table_name';
        $params[':table_name'] = $tableName;
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    $sql = "
        SELECT
            al.id, al.action, al.table_name, al.record_id,
            al.changes, al.ip_address, al.timestamp,
            u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        {$whereClause}
        ORDER BY al.timestamp DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Call our newly mapped Export Helper function (Ensure it exists in export_helper.php!)
    if (function_exists('exportAuditLogsToExcel')) {
        exportAuditLogsToExcel($logs);
    } else {
        die('Export function for Audit Logs is not yet implemented in export_helper.php');
    }
}