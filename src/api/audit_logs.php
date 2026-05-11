<?php
// src/api/audit_logs.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';

requireRole('admin');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError('Method not allowed.', 405);
}

fetchAuditLogs();

function fetchAuditLogs(): void {
    $pdo = getDbConnection();

    $action = getQueryString('action');
    $tableName = getQueryString('table_name');
    $page = max(1, getQueryInt('page', 1));
    $perPage = min(100, max(10, getQueryInt('per_page', 25)));
    $offset = ($page - 1) * $perPage;

    $where = ['1=1'];
    $params = [];

    if ($action && validateEnum($action, AUDIT_ACTIONS)) {
        $where[] = 'al.action = :action';
        $params[':action'] = $action;
    }

    if ($tableName && validateEnum($tableName, AUDIT_TABLES)) {
        $where[] = 'al.table_name = :table_name';
        $params[':table_name'] = $tableName;
    }

    $whereClause = 'WHERE ' . implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) FROM audit_logs al {$whereClause}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "
        SELECT
            al.id, al.action, al.table_name, al.record_id,
            al.changes, al.ip_address, al.timestamp,
            u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        {$whereClause}
        ORDER BY al.timestamp DESC
        LIMIT :limit OFFSET :offset
    ";

    $stmt = $pdo->prepare($sql);

    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }

    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    sendPaginated($rows, $total, $page, $perPage);
}
