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

define('USER_ROLES', ['admin', 'user']);

define('AUDIT_ACTIONS', ['INSERT', 'UPDATE', 'DELETE']);

define('AUDIT_TABLES', [
    'assets',
    'categories',
    'vendors',
    'locations',
    'process_owners',
    'purchase_orders',
    'users',
]);

// Flat import template headers (legacy import format)
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

/*
 * PO-native import: maps Excel sheet names to category names.
 * Keys = exact sheet name in the workbook.
 * Values = category name stored in the DB.
 */
define('PO_SHEET_MAP', [
    'Desktop'         => 'Desktop',
    'Laptop'          => 'Laptop',
    'Webcam'          => 'Webcam',
    'Docking'         => 'Docking Station',
    'Headset'         => 'Headset',
    'Monitor'         => 'Monitor',
    'Network Devices' => 'Network Device',
    'Yubikey'         => 'Yubikey',
]);

/*
 * PO-native sheet column headers (0-based index).
 * Description(0) · Serial(1) · PO#(2) · Center(3) · Owner(4) · Remarks(5)
 */
define('PO_SHEET_HEADERS', [
    'description', 'serial_number', 'po_number',
    'center_delivered', 'process_name', 'remarks',
]);

// Standardised remarks dropdown values
define('REMARKS_OPTIONS', [
    'NA'              => 'None / NA',
    'pink_mark'       => 'With pink mark',
    'orange_mark'     => 'With orange mark',
    'partial'         => 'Partial delivery',
    'no_mark'         => 'No mark',
    'with_monitor'    => 'With monitor',
    'others'          => 'Others (specify)',
]);