<?php
// src/helpers/export_helper.php

require_once __DIR__ . '/../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Color;

function exportToExcel(array $assets, string $filename = 'fsl_inventory'): void {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
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

    $headerStyle = [
        'font' => [
            'bold'  => true,
            'color' => ['argb' => 'FFFFFFFF'],
        ],
        'fill' => [
            'fillType'   => Fill::FILL_SOLID,
            'startColor' => ['argb' => 'FF0D1B2A'],
        ],
        'alignment' => [
            'horizontal' => Alignment::HORIZONTAL_CENTER,
        ],
    ];

    foreach ($headers as $col => $label) {
        $sheet->setCellValue("{$col}1", $label);
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);

    $row = 2;
    foreach ($assets as $asset) {
        $sheet->setCellValue("A{$row}", $asset['serial_number']);
        $sheet->setCellValue("B{$row}", $asset['description']);
        $sheet->setCellValue("C{$row}", $asset['category_name'] ?? '');
        $sheet->setCellValue("D{$row}", $asset['po_number'] ?? '');
        $sheet->setCellValue("E{$row}", $asset['vendor_name'] ?? '');
        $sheet->setCellValue("F{$row}", $asset['location_name'] ?? '');
        $sheet->setCellValue("G{$row}", $asset['owner_name'] ?? '');
        $sheet->setCellValue("H{$row}", $asset['status']);
        $sheet->setCellValue("I{$row}", $asset['date_received'] ?? '');
        $sheet->setCellValue("J{$row}", $asset['date_endorsed'] ?? '');
        $sheet->setCellValue("K{$row}", $asset['remarks'] ?? '');
        $row++;
    }

    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header("Content-Disposition: attachment; filename=\"{$filename}.xlsx\"");
    header('Cache-Control: max-age=0');

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
}

function exportTemplate(): void {
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
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

    foreach ($headers as $col => $label) {
        $sheet->setCellValue("{$col}1", $label);
        $sheet->getColumnDimension($col)->setAutoSize(true);
    }

    header(
        'Content-Type: '
        . 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    header(
        'Content-Disposition: attachment; filename="fsl_import_template.xlsx"'
    );

    $writer = new Xlsx($spreadsheet);
    $writer->save('php://output');
    exit;
}
