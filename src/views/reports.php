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
                    Per-location and per-owner asset summaries.
                    Use Print / Save PDF to export.
                </div>
            </div>
            <div class="page-header__right">
                <button class="btn btn-secondary" id="btn_print">
                    <i class="bi bi-printer"></i>
                    Print / Save PDF
                </button>
            </div>
        </div>

        <div class="table-toolbar" id="report_toolbar">
            <div style="display:flex;gap:8px">
                <button id="tab_by_location"
                        class="btn btn-primary">
                    <i class="bi bi-geo-alt"></i>
                    By Location
                </button>
                <button id="tab_by_owner"
                        class="btn btn-secondary">
                    <i class="bi bi-person-workspace"></i>
                    By Process Owner
                </button>
            </div>
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
        // NOTE: footer.php already closes:
        //   </div><!-- end content -->
        //   </div><!-- end main -->
        //   </div><!-- end app-shell -->
        // DO NOT add those closing tags here.
        ?>

<?php include __DIR__ . '/shared/footer.php'; ?>