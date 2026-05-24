<?php
// src/views/shared/header.php
$pageTitle = $pageTitle ?? 'FSL Inventory';
$csrfToken = generateCsrfToken();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
            content="width=device-width, initial-scale=1.0">
    <title>
        <?= htmlspecialchars($pageTitle) ?> — FSL Inventory
    </title>
    <meta name="csrf-token"
            content="<?= htmlspecialchars($csrfToken) ?>">
    <link rel="stylesheet" href="/assets/css/variables.css">
    <link rel="stylesheet" href="/assets/css/base.css">
    <link rel="stylesheet" href="/assets/css/layout.css">
    <link rel="stylesheet" href="/assets/css/components.css">
    <link rel="stylesheet" href="/assets/css/forms.css">
    <link rel="stylesheet"
         href="/assets/css/searchable_select.css">
    <link rel="stylesheet" href="/assets/css/modals.css">
    <link rel="stylesheet" href="/assets/css/dashboard.css">
    <link rel="stylesheet" href="/assets/css/reports.css">
    <link rel="stylesheet"
            href="/assets/css/searchable_select.css">
    <link rel="stylesheet" href="/assets/css/responsive.css">
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap"
            rel="stylesheet">
    <link rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
</head>
<body>
<div class="app-shell" id="app_shell">