<?php
// src/views/admin/audit_logs.php

require_once __DIR__ . '/../../../src/core/auth.php';
requireRole('admin');

$pageTitle = 'Activity History';
$pageJs = 'audit_logs.js';

include __DIR__ . '/../shared/header.php';
include __DIR__ . '/../shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Activity History</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input type="text" id="global_search" placeholder="Search...">
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
                <div class="page-header__title">Activity History</div>
                <div class="page-header__desc">
                    Full audit log of all asset modifications and admin actions
                </div>
            </div>
            <div class="page-header__right">
                <select
                    class="filter-select"
                    id="filter_action"
                    onchange="loadAuditLogs()">
                    <option value="">All Actions</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                </select>
                <select
                    class="filter-select"
                    id="filter_table"
                    onchange="loadAuditLogs()">
                    <option value="">All Tables</option>
                    <option value="assets">assets</option>
                    <option value="users">users</option>
                    <option value="categories">categories</option>
                    <option value="purchase_orders">purchase_orders</option>
                    <option value="vendors">vendors</option>
                    <option value="locations">locations</option>
                </select>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <div id="audit_log_list" style="padding:8px 0">
                    <p class="text-center py-4">Loading audit logs...</p>
                </div>
            </div>
            <div class="table-pagination" id="audit_pagination"></div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../shared/footer.php'; ?>
