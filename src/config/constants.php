<?php
// src/config/constants.php

define('ASSET_STATUSES', [
    'active',
    'deployed',
    'defective',
    'in_repair',
    'retired',
    'lost',
]);

define('USER_ROLES', [
    'admin',
    'user',
]);

define('AUDIT_ACTIONS', [
    'INSERT',
    'UPDATE',
    'DELETE',
]);

define('AUDIT_TABLES', [
    'assets',
    'categories',
    'vendors',
    'locations',
    'process_owners',
    'purchase_orders',
    'users',
]);

define('EXCEL_IMPORT_HEADERS', [
    'serial_number',
    'description',
    'category',
    'po_number',
    'vendor',
    'location',
    'process_owner',
    'status',
    'date_received',
    'date_endorsed',
    'remarks',
]);

define('MAX_IMPORT_FILE_BYTES', 5 * 1024 * 1024);
define('MAX_BACKUP_FILE_BYTES', 20 * 1024 * 1024);
