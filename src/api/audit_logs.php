<?php
// src/api/audit_logs.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/export_helper.php';

requireRole('admin');

if (
    $_SERVER['REQUEST_METHOD'] === 'GET' &&
    getQueryString('export') === 'true'
) {
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
    $perPage = getQueryInt('per_page', 5000);

    $total = (int) $pdo
        ->query('SELECT COUNT(*) FROM audit_logs')
        ->fetchColumn();

    $stmt = $pdo->prepare('
        SELECT
            al.id,
            al.action,
            al.table_name,
            al.record_id,
            al.changes,
            al.ip_address,
            al.timestamp,
            u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT :limit
    ');
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->execute();

    sendPaginated($stmt->fetchAll(), $total, 1, $perPage);
}

function exportAuditLogsData(): void
{
    $pdo = getDbConnection();

    $stmt = $pdo->query('
        SELECT
            al.id,
            al.action,
            al.table_name,
            al.record_id,
            al.changes,
            al.ip_address,
            al.timestamp,
            u.username
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
    ');
    $rows = $stmt->fetchAll();

    $formatted = array_map(function ($row) {
        $changes = json_decode($row['changes'] ?? '{}', true);
        $event   = $changes['after']['event'] ?? null;

        // Human-readable description for backup/restore rows
        if ($event) {
            $desc = match ($event) {
                'backup_created'      => 'Backup: ' . ($changes['after']['file'] ?? ''),
                'restore_from_server' => 'Restore (server file): ' . ($changes['after']['file'] ?? ''),
                'restore_from_upload' => 'Restore (upload): ' . ($changes['after']['file'] ?? ''),
                default               => $event,
            };
        } else {
            $desc = json_encode($changes);
        }

        return [
            'id'         => $row['id'],
            'username'   => $row['username']   ?? '—',
            'action'     => $row['action'],
            'table_name' => $row['table_name'],
            'record_id'  => $row['record_id'],
            'description'=> $desc,
            'ip_address' => $row['ip_address'] ?? '—',
            'timestamp'  => $row['timestamp'],
        ];
    }, $rows);

    exportAuditLogs($formatted, 'fsl_audit_logs_' . date('Ymd'));
}
