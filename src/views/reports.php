<?php
// src/views/reports.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'Reports';
$pageJs    = 'reports.js';

include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Reports</div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Reports</div>
                <div class="page-header__desc">
                    location asset reports.
                </div>
            </div>
        </div>

        <div class="table-toolbar" id="report_toolbar">
            <div style="margin-left:auto;display:flex;
                        align-items:center;gap:8px">
                <span id="report_meta"
                        style="font-size:12px;
                               color:var(--white-4)"></span>
                <div class="search-field"
                        style="max-width:220px">
                    <i class="bi bi-search"></i>
                    <input type="text"
                            id="report_search"
                            placeholder="Filter assets...">
                </div>
            </div>
        </div>

        <div id="report_body">
            <div class="empty-state">
                <i class="bi bi-bar-chart-line
                          empty-state__icon"></i>
                <div class="empty-state__title">
                    Loading report...
                </div>
            </div>
        </div>

        <?php
        ?>

<?php include __DIR__ . '/shared/footer.php'; ?>