<?php
// src/views/admin/backup.php

require_once __DIR__ . '/../../../src/core/auth.php';
requireRole('admin');

$pageTitle = 'Backup & Restore';
$pageJs    = 'backup.js';

include __DIR__ . '/../shared/header.php';
include __DIR__ . '/../shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle"
                onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Backup &amp; Restore</div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">
                    Backup &amp; Restore
                </div>
                <div class="page-header__desc">
                    Save and restore asset and PO data as Excel
                    files
                </div>
            </div>
            <div class="page-header__right">
                <button class="btn btn-primary"
                        id="btn_create_backup"
                        onclick="createBackup()">
                    <i class="bi bi-cloud-upload"></i>
                    Create Backup Now
                </button>
            </div>
        </div>

        <!-- Info card explaining what is backed up -->
        <div class="insight-card insight-card--blue"
                style="margin-bottom:20px">
            <div class="insight-card__icon">📊</div>
            <div>
                <div class="insight-card__title"
                        style="color:var(--blue-tag)">
                    What gets backed up?
                </div>
                <div class="insight-card__desc">
                    Backups include your
                    <strong>Purchase Orders</strong>
                    and <strong>Assets</strong> data saved as
                    an Excel file (.xlsx). Reference data
                    (Vendors, Locations, Categories, Users) is
                    not included — those are managed separately
                    by the administrator.
                </div>
            </div>
        </div>

        <div class="grid-2col">

            <!-- Backup History -->
            <div class="card">
                <div class="card-title">
                    <i class="bi bi-clock-history"
                            style="margin-right:6px"></i>
                    Backup History
                </div>
                <div class="table-wrapper"
                        style="margin-top:12px">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date &amp; Time</th>
                                <th>Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="backup_list">
                            <tr>
                                <td colspan="3"
                                        style="text-align:center;
                                               padding:20px;
                                               color:var(--white-4)">
                                    Loading backups...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Restore from file -->
            <div class="card">
                <div class="card-title">
                    <i class="bi bi-arrow-counterclockwise"
                            style="margin-right:6px"></i>
                    Restore from Excel File
                </div>

                <div class="upload-zone"
                        id="restore_zone"
                        style="margin-top:12px"
                        onclick="document.getElementById(
                            'restore_file'
                        ).click()">
                    <div class="upload-zone__icon">
                        <i class="bi bi-file-earmark-excel">
                        </i>
                    </div>
                    <div class="upload-zone__label"
                            id="restore_zone_label">
                        Drop your backup Excel file here
                    </div>
                    <div class="upload-zone__sub">
                        or click to browse (.xlsx only)
                    </div>
                </div>

                <!--
                    accept changed from .sql to .xlsx
                    per client requirement
                -->
                <input type="file"
                        id="restore_file"
                        accept=".xlsx"
                        style="display:none"
                        onchange="uploadRestore(this)">

                <div class="divider"
                        style="margin:16px 0"></div>

                <div class="insight-card insight-card--red">
                    <div class="insight-card__icon">⚠️</div>
                    <div>
                        <div class="insight-card__title"
                                style="color:var(--red)">
                            Warning
                        </div>
                        <div class="insight-card__desc">
                            Restoring a backup will
                            <strong>overwrite</strong>
                            your current asset and PO data.
                            This action cannot be undone.
                            Only restore if you are sure.
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>

<?php include __DIR__ . '/../shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/../shared/footer.php'; ?>