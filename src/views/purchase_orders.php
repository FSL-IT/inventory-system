<?php
// src/views/purchase_orders.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'PO Tracker';
$pageJs = 'purchase_orders.js';

include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">PO Tracker</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input
                type="text"
                id="global_search"
                placeholder="Search PO number, vendor..."
                oninput="globalSearch(this.value)">
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
                <div class="page-header__title">PO Tracker</div>
                <div class="page-header__desc">
                    All purchase orders with endorsement status and delivery info
                </div>
            </div>
            <div class="page-header__right">
                <button
                    class="btn btn-primary"
                    onclick="openModal('add_po')">
                    <i class="bi bi-plus-lg"></i> New PO
                </button>
            </div>
        </div>

        <div class="table-toolbar">
            <div class="search-field">
                <i class="bi bi-search"></i>
                <input
                    type="text"
                    id="po_search"
                    placeholder="PO number, vendor..."
                    oninput="debouncePoSearch(this.value)">
            </div>
            <select
                class="filter-select"
                id="filter_vendor"
                onchange="loadPOs()">
                <option value="">All Vendors</option>
            </select>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>PO Number</th>
                            <th>Vendor</th>
                            <th>Assets</th>
                            <th>Date Received</th>
                            <th>Date Endorsed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="po_body">
                        <tr>
                            <td colspan="6" class="text-center py-4">
                                Loading purchase orders...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="table-pagination" id="po_pagination"></div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/shared/modals/modal_po.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>
