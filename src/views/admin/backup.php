<?php
// src/views/admin/backup.php

require_once __DIR__ . '/../../../src/core/auth.php';
requireRole('admin');

$pageTitle = 'Backup & Restore';
$pageJs = 'backup.js';

include __DIR__ . '/../shared/header.php';
include __DIR__ . '/../shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Backup &amp; Restore</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input type="text" id="global_search" placeholder="Search..." oninput="globalSearch(this.value)">
        </div>
        <div class="topbar__actions">
            <div class="icon-btn"
                onclick="showToast('No notifications','info')">
                <i class="bi bi-bell"></i>
            </div>
        </div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Backup &amp; Restore</div>
                <div class="page-header__desc">
                    Database snapshots, scheduled backups, and restore points
                </div>
            </div>
            <div class="page-header__right">
                <button
                    class="btn btn-primary"
                    onclick="createBackup()">
                    <i class="bi bi-cloud-upload"></i> Create Backup Now
                </button>
            </div>
        </div>

        <div class="grid-2col">
            <div class="card">
                <div class="card-title">Backup History</div>
                <div class="table-wrapper" style="margin-top:0">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date &amp; Time</th>
                                <th>Size</th>
                                <th>Filename</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="backup_list">
                            <tr>
                                <td colspan="3" class="text-center py-4">
                                    Loading backups...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card">
                <div class="card-title">Restore from File</div>
                <div
                    class="upload-zone"
                    id="restore_zone"
                    onclick="document.getElementById('restore_file').click()">
                    <div class="upload-zone__icon">
                        <i class="bi bi-cloud-upload"></i>
                    </div>
                    <div class="upload-zone__label">
                        Drop your .sql file here
                    </div>
                    <div class="upload-zone__sub">
                        or click to browse — WARNING: this will overwrite the DB
                    </div>
                </div>
                <input
                    type="file"
                    id="restore_file"
                    accept=".sql"
                    style="display:none"
                    onchange="uploadRestore(this)">

                <div class="divider"></div>

                <div class="insight-card insight-card--yellow">
                    <div class="insight-card__icon">💡</div>
                    <div>
                        <div class="insight-card__title"
                            style="color:var(--yellow)">
                            Best Practice: 3-2-1 Rule
                        </div>
                        <div class="insight-card__desc">
                            Keep 3 copies of data on 2 different media
                            with 1 offsite. Use Google Drive or S3
                            for offsite redundancy.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/../shared/footer.php'; ?>
