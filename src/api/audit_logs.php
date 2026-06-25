<?php
// src/api/audit_logs.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/validator.php';
require_once __DIR__ . '/../helpers/export_helper.php';
require_once __DIR__ . '/../helpers/audit_helper.php';

requireRole('admin');

$method = $_SERVER['REQUEST_METHOD'];
$action = getQueryString('action');

if ($method === 'GET' && $action === 'export') {
    exportAuditLogsData();
} elseif ($method === 'GET') {
    header('Content-Type: application/json');
    fetchAuditLogs();
} elseif ($method === 'POST' && $action === 'restore') {
    header('Content-Type: application/json');
    requireCsrf();
    restoreAuditRecord();
} else {
    header('Content-Type: application/json');
    sendError('Method not allowed.', 405);
}

// ─── FETCH ────────────────────────────────────────────────────────
function fetchAuditLogs(): void
{
    $pdo     = getDbConnection();
    
    $page    = getQueryInt('page', 1);
    $perPage = getQueryInt('per_page', 50);
    $offset  = ($page - 1) * $perPage;

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
        LIMIT :limit OFFSET :offset
    ');
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    sendPaginated($stmt->fetchAll(), $total, $page, $perPage);
}

// ─── RESTORE A RECORD ─────────────────────────────────────────────
function restoreAuditRecord(): void
{
    $body      = json_decode(
        file_get_contents('php://input'), true
    );
    $auditId   = (int) ($body['audit_id']   ?? 0);
    $tableName = sanitizeString($body['table_name'] ?? '');
    $recordId  = (int) ($body['record_id']  ?? 0);
    $before    = $body['before']            ?? [];

    if (!$auditId || !$tableName || !$recordId || !$before) {
        sendError('Missing required fields.', 422);
    }

    $RESTORABLE = [
        'assets', 'purchase_orders', 'vendors',
        'locations', 'process_owners', 'categories',
    ];

    if (!in_array($tableName, $RESTORABLE, true)) {
        sendError(
            "Table '{$tableName}' cannot be restored.",
            422
        );
    }

    $pdo = getDbConnection();

    $SKIP = ['id', 'created_at', 'deleted_at'];

    $setClauses = [];
    $params     = [':id' => $recordId];

    foreach ($before as $col => $val) {
        if (in_array($col, $SKIP, true)) {
            continue;
        }

        $col = preg_replace('/[^a-z0-9_]/i', '', $col);
        if (!$col) {
            continue;
        }

        $setClauses[]    = "`{$col}` = :{$col}";
        $params[":{$col}"] = $val;
    }

    if (empty($setClauses)) {
        sendError('No restorable fields in before state.', 422);
    }

    $setStr = implode(', ', $setClauses);

    $upd = $pdo->prepare(
        "UPDATE `{$tableName}` SET {$setStr} WHERE id = :id"
    );
    $upd->execute($params);

    // Get current state for audit trail
    $cur = $pdo->prepare(
        "SELECT * FROM `{$tableName}` WHERE id = :id LIMIT 1"
    );
    $cur->execute([':id' => $recordId]);
    $after = $cur->fetch() ?: [];

    logAudit($_SESSION['user_id'], 'UPDATE', $tableName, $recordId, [
        'before' => $before,
        'after'  => $after,
        'event'  => "restored_from_audit_{$auditId}",
    ]);

    sendSuccess([], 'Record restored successfully.');
}

// ─── EXPORT ───────────────────────────────────────────────────────
function exportAuditLogsData(): void
{
    $pdo  = getDbConnection();
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
        $event   = $changes['after']['event']  ?? null;

        if ($event) {
            $desc = match (true) {
                str_starts_with($event, 'backup_created')
                    => 'Backup: '
                       . ($changes['after']['file'] ?? ''),
                str_starts_with($event, 'restore_from_server')
                    => 'Restore (server): '
                       . ($changes['after']['file'] ?? ''),
                str_starts_with($event, 'restore_from_upload')
                    => 'Restore (upload): '
                       . ($changes['after']['file'] ?? ''),
                str_starts_with($event, 'restored_from_audit_')
                    => 'Restored from audit log #'
                       . substr($event, strlen('restored_from_audit_')),
                default => $event,
            };
        } else {
            $desc = json_encode($changes);
        }

        return [
            'id'          => $row['id'],
            'username'    => $row['username']   ?? '—',
            'action'      => $row['action'],
            'table_name'  => $row['table_name'],
            'record_id'   => $row['record_id'],
            'description' => $desc,
            'ip_address'  => $row['ip_address'] ?? '—',
            'timestamp'   => $row['timestamp'],
        ];
    }, $rows);

    exportAuditLogs(
        $formatted,
        'fsl_audit_logs_' . date('Ymd')
    );
}