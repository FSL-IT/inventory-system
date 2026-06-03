<?php
// src/views/admin/audit_logs.php

require_once __DIR__ . '/../../../src/core/auth.php';
requireRole('admin');

$pageTitle = 'Activity History';
$pageJs    = 'audit_logs.js';

include __DIR__ . '/../shared/header.php';
include __DIR__ . '/../shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle"
                onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Activity History</div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">
                    Activity History
                </div>
                <div class="page-header__desc">
                    Complete audit trail of all system actions
                </div>
            </div>
        </div>

        <!-- Search + filters in the toolbar like all other pages -->
        <div class="table-toolbar">
            <div class="search-field" style="max-width:280px">
                <i class="bi bi-search"></i>
                <input type="text" id="audit_search"
                        placeholder="Search activity..."
                        oninput="debouncedLoadAuditLogs()">
            </div>

            <select class="filter-select" id="filter_action"
                    onchange="debouncedLoadAuditLogs()">
                <option value="">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="BACKUP">BACKUP</option>
                <option value="RESTORE">RESTORE</option>
            </select>

            <select class="filter-select" id="filter_table"
                    onchange="debouncedLoadAuditLogs()">
                <option value="">All Tables</option>
                <option value="assets">assets</option>
                <option value="purchase_orders">
                    purchase_orders
                </option>
                <option value="categories">categories</option>
                <option value="vendors">vendors</option>
                <option value="locations">locations</option>
                <option value="process_owners">
                    process_owners
                </option>
                <option value="users">users</option>
                <option value="backup">backup</option>
            </select>

            <div style="margin-left:auto;display:flex;
                        align-items:center;gap:8px">
                <span id="audit_counter"
                        style="font-size:12px;
                               color:var(--white-4);
                               white-space:nowrap"></span>
                <button class="btn btn-secondary btn-sm"
                        onclick="clearAuditFilters()"
                        title="Clear filters">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <div id="audit_log_list"
                        class="audit-container">
                    <p style="text-align:center;padding:30px;
                               color:var(--white-4)">
                        Loading activity history...
                    </p>
                </div>
            </div>
            <div class="pagination-bar"
                    id="audit_pagination"></div>
        </div>
    </div>
</div>

<!--
    Modal is OUTSIDE #main_content so SPA navigation
    does not destroy it during content swap.
-->
<div class="modal-overlay" id="modal-audit_detail">
    <div class="modal" style="max-width:680px">
        <div class="modal-header">
            <div class="modal-title" id="audit_modal_title">
                Activity Details
            </div>
            <button class="modal-close"
                    onclick="closeModal('audit_detail')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body"
                id="audit_modal_body">
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary"
                    onclick="closeModal('audit_detail')">
                Close
            </button>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../shared/footer.php'; ?>