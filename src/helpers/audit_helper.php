<?php
// src/helpers/audit_helper.php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../core/validator.php';

function logAudit(
    int $userId,
    string $action,
    string $tableName,
    int $recordId,
    array $changes
): void {
    $pdo = getDbConnection();
    $ip = getClientIp();

    $sql = '
        INSERT INTO audit_logs
            (user_id, action, table_name, record_id, changes, ip_address)
        VALUES
            (:user_id, :action, :table_name, :record_id, :changes, :ip)
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':user_id'    => $userId,
        ':action'     => $action,
        ':table_name' => $tableName,
        ':record_id'  => $recordId,
        ':changes'    => json_encode($changes),
        ':ip'         => $ip,
    ]);
}
