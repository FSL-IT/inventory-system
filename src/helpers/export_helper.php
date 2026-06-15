<?php
// src/helpers/export_helper.php

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../config/constants.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

// ─── SHARED STYLE CONSTANTS ────────────────────────────────────────────────
const HEADER_BG    = 'FF0D1B2A';
const HEADER_FG    = 'FFFFFFFF';
const ALT_ROW_BG   = 'FFF8F8F8';

// ─── FLAT INVENTORY EXPORT ────────────────────────────────────────────────
function exportToExcel(
    array $assets,
    string $filename = 'fsl_inventory'
): void {
    $spreadsheet = new Spreadsheet();
    $sheet       = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Inventory');

    $headers = [
        'A' => 'Serial Number',
        'B' => 'Description',
        'C' => 'Category',
        'D' => 'PO Number',
        'E' => 'Vendor',
        'F' => 'Location',
        'G' => 'Process Owner',
        'H' => 'Status',
        'I' => 'Date Received',
        'J' => 'Date Endorsed',
        'K' => 'Remarks',
    ];

    applyHeaders($sheet, $headers, 'A1:K1');

    $row = 2;
    foreach ($assets as $a) {
        $sheet->setCellValue("A{$row}", $a['serial_number']   ?? '');
        $sheet->setCellValue("B{$row}", $a['description']     ?? '');
        $sheet->setCellValue("C{$row}", $a['category_name']   ?? '');
        $sheet->setCellValue("D{$row}", $a['po_number']       ?? '');
        $sheet->setCellValue("E{$row}", $a['vendor_name']     ?? '');
        $sheet->setCellValue("F{$row}", $a['location_name']   ?? '');
        $sheet->setCellValue("G{$row}", $a['owner_name']      ?? '');
        $sheet->setCellValue("H{$row}", $a['status']          ?? '');
        $sheet->setCellValue("I{$row}", $a['date_received']   ?? '');
        $sheet->setCellValue("J{$row}", $a['date_endorsed']   ?? '');
        $sheet->setCellValue("K{$row}", $a['remarks']         ?? '');

        if ($row % 2 === 0) {
            applyAltRowBg($sheet, "A{$row}:K{$row}");
        }

        $row++;
    }

    sendXlsx($spreadsheet, $filename);
}

// ─── PO TRACKER MULTI-SHEET EXPORT ────────────────────────────────────────
/**
 * Exports a workbook that mirrors the official PO Tracker Excel:
 *   Sheet 1 "All":  Category | Vendor | PO# | Description | Qty |
 *                   Center Location | Process Owner |
 *                   Date Received | Date Endorsed | Remarks
 *   Sheet N:        One sheet per category (Laptop, Desktop, etc.)
 *                   Description | Serial Number | PO# |
 *                   Center Delivered | Process Name | Remarks
 */
function exportPoTrackerFormat(PDO $pdo, string $filename): void
{
    $spreadsheet = new Spreadsheet();
    $spreadsheet->removeSheetByIndex(0);

    buildAllSheet($spreadsheet, $pdo);
    buildCategorySheets($spreadsheet, $pdo);

    sendXlsx($spreadsheet, $filename);
}

function buildAllSheet(Spreadsheet $spreadsheet, PDO $pdo): void
{
    $sheet = $spreadsheet->createSheet();
    $sheet->setTitle('All');

    $headers = [
        'A' => 'Category',
        'B' => 'Vendor',
        'C' => 'PO#',
        'D' => 'Description',
        'E' => 'Quantity',
        'F' => 'Center Location',
        'G' => 'Process Owner',
        'H' => 'Date Received',
        'I' => 'Date Endorsed',
        'J' => 'Remarks',
    ];

    applyHeaders($sheet, $headers, 'A1:J1');

    /*
     * One row per unique combination of:
     * category + description + location + owner + PO
     * with COUNT as quantity — mirrors the Excel "All" sheet exactly.
     */
    $stmt = $pdo->query('
        SELECT
            c.name          AS category,
            v.name          AS vendor,
            po.po_number    AS po_number,
            a.description,
            COUNT(a.id)     AS quantity,
            l.name          AS location,
            o.name          AS owner,
            po.date_received,
            po.date_endorsed,
            a.remarks
        FROM assets a
        LEFT JOIN categories      c  ON a.category_id = c.id
        LEFT JOIN locations       l  ON a.location_id  = l.id
        LEFT JOIN process_owners  o  ON a.owner_id     = o.id
        LEFT JOIN purchase_orders po ON a.po_id        = po.id
        LEFT JOIN vendors         v  ON po.vendor_id   = v.id
        WHERE a.deleted_at IS NULL
        GROUP BY
            c.name, v.name, po.po_number, a.description,
            l.name, o.name,
            po.date_received, po.date_endorsed, a.remarks
        ORDER BY c.name, po.po_number, a.description
    ');

    $row = 2;
    foreach ($stmt->fetchAll() as $r) {
        $sheet->setCellValue("A{$row}", $r['category']      ?? '');
        $sheet->setCellValue("B{$row}", $r['vendor']        ?? '');
        $sheet->setCellValue("C{$row}", $r['po_number']     ?? '');
        $sheet->setCellValue("D{$row}", $r['description']   ?? '');
        $sheet->setCellValue("E{$row}", (int) $r['quantity']);
        $sheet->setCellValue("F{$row}", $r['location']      ?? '');
        $sheet->setCellValue("G{$row}", $r['owner']         ?? '');
        $sheet->setCellValue("H{$row}", $r['date_received'] ?? '');
        $sheet->setCellValue("I{$row}", $r['date_endorsed'] ?? '');
        $sheet->setCellValue("J{$row}", $r['remarks']       ?? '');

        if ($row % 2 === 0) {
            applyAltRowBg($sheet, "A{$row}:J{$row}");
        }

        $row++;
    }

    autosizeColumns($sheet, range('A', 'J'));
}

function buildCategorySheets(Spreadsheet $spreadsheet, PDO $pdo): void
{
    $sheetMap = PO_SHEET_MAP;

    foreach ($sheetMap as $sheetName => $categoryName) {
        $stmt = $pdo->prepare('
            SELECT
                a.description,
                a.serial_number,
                po.po_number,
                l.name  AS center_delivered,
                o.name  AS process_name,
                a.remarks
            FROM assets a
            LEFT JOIN categories      c  ON a.category_id = c.id
            LEFT JOIN purchase_orders po ON a.po_id        = po.id
            LEFT JOIN locations       l  ON a.location_id  = l.id
            LEFT JOIN process_owners  o  ON a.owner_id     = o.id
            WHERE c.name          = :cat
              AND a.deleted_at IS NULL
            ORDER BY po.po_number, a.serial_number
        ');
        $stmt->execute([':cat' => $categoryName]);
        $rows = $stmt->fetchAll();

        if (!$rows) {
            continue;
        }

        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle($sheetName);

        $headers = [
            'A' => 'Description',
            'B' => 'Serial Number',
            'C' => 'PO#',
            'D' => 'Center Delivered',
            'E' => 'Process Name',
            'F' => 'Remarks',
        ];

        applyHeaders($sheet, $headers, 'A1:F1');

        $row = 2;
        foreach ($rows as $r) {
            $sheet->setCellValue("A{$row}", $r['description']      ?? '');
            $sheet->setCellValue("B{$row}", $r['serial_number']    ?? '');
            $sheet->setCellValue("C{$row}", $r['po_number']        ?? '');
            $sheet->setCellValue("D{$row}", $r['center_delivered'] ?? '');
            $sheet->setCellValue("E{$row}", $r['process_name']     ?? '');
            $sheet->setCellValue("F{$row}", $r['remarks']          ?? '');

            if ($row % 2 === 0) {
                applyAltRowBg($sheet, "A{$row}:F{$row}");
            }

            $row++;
        }

        autosizeColumns($sheet, range('A', 'F'));
    }
}

// ─── TEMPLATE EXPORT ──────────────────────────────────────────────────────
function exportTemplate(): void
{
    $spreadsheet = new Spreadsheet();
    $sheet       = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Import Template');

    $headers = [
        'A' => 'serial_number',
        'B' => 'description',
        'C' => 'category',
        'D' => 'po_number',
        'E' => 'vendor',
        'F' => 'location',
        'G' => 'process_owner',
        'H' => 'status',
        'I' => 'date_received',
        'J' => 'date_endorsed',
        'K' => 'remarks',
    ];

    applyHeaders($sheet, $headers, 'A1:K1');
    autosizeColumns($sheet, range('A', 'K'));

    sendXlsx($spreadsheet, 'fsl_import_template');
}

function exportPoTemplate(): void
{
    $spreadsheet = new Spreadsheet();
    $spreadsheet->removeSheetByIndex(0); // Remove default sheet

    $sheetIntro = $spreadsheet->createSheet();
    $sheetIntro->setTitle('INSTRUCTIONS');
    $sheetIntro->setCellValue('A1', 'HOW TO USE THIS TEMPLATE (READ FIRST)');
    $sheetIntro->setCellValue('A2', '1. DO NOT put your data on this first sheet.');
    $sheetIntro->setCellValue('A3', '2. Click the tabs below (Desktop, Laptop, Webcam, etc.) to enter your assets.');
    $sheetIntro->setCellValue('A4', '3. Every single item MUST have a unique Serial Number to be imported.');
    $sheetIntro->setCellValue('A5', '4. Do not group by quantity. If you have 5 laptops, you must use 5 rows with 5 serial numbers.');
    $sheetIntro->setCellValue('A6', '5. Do not delete or rename the category sheet tabs at the bottom.');
    
    $sheetIntro->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setARGB('FFD32F2F'); // Red
    $sheetIntro->getStyle('A2:A6')->getFont()->setSize(12);
    $sheetIntro->getColumnDimension('A')->setAutoSize(true);

    $sheetNames = ['Desktop', 'Laptop', 'Webcam', 'Docking', 'Headset', 'Monitor', 'Network Devices', 'Yubikey'];

    foreach ($sheetNames as $name) {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle($name);
        $headers = [
            'A' => 'Description', 'B' => 'Serial Number', 'C' => 'PO#',
            'D' => 'Center Delivered', 'E' => 'Process Name', 'F' => 'Remarks'
        ];
        applyHeaders($sheet, $headers, 'A1:F1');
        autosizeColumns($sheet, range('A', 'F'));
    }

    $spreadsheet->setActiveSheetIndex(1);

    sendXlsx($spreadsheet, 'fsl_po_import_template');
}

// ─── SHARED HELPERS ───────────────────────────────────────────────────────
function applyHeaders($sheet, array $headers, string $range): void
{
    foreach ($headers as $col => $label) {
        $sheet->setCellValue("{$col}1", $label);
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    $sheet->getStyle($range)->applyFromArray([
        'font' => [
            'bold'  => true,
            'color' => ['argb' => HEADER_FG],
        ],
        'fill' => [
            'fillType'   => Fill::FILL_SOLID,
            'startColor' => ['argb' => HEADER_BG],
        ],
        'alignment' => [
            'horizontal' => Alignment::HORIZONTAL_CENTER,
        ],
    ]);
}

function applyAltRowBg($sheet, string $range): void
{
    $sheet->getStyle($range)->applyFromArray([
        'fill' => [
            'fillType'   => Fill::FILL_SOLID,
            'startColor' => ['argb' => ALT_ROW_BG],
        ],
    ]);
}

function autosizeColumns($sheet, array $cols): void
{
    foreach ($cols as $col) {
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }
}

function sendXlsx(Spreadsheet $spreadsheet, string $filename): void
{
    header(
        'Content-Type: '
        . 'application/vnd.openxmlformats-officedocument'
        . '.spreadsheetml.sheet'
    );
    header(
        "Content-Disposition: attachment; filename=\"{$filename}.xlsx\""
    );
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
}