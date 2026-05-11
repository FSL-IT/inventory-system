<?php
// src/views/assets.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'Inventory';
$pageJs = 'assets.js';

include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" id="sidebar_toggle"
            onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Inventory Search</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input
                type="text"
                id="global_search"
                placeholder="Search serial #, PO, description..."
                oninput="globalSearch(this.value)">
        </div>
        <div class="topbar__actions">
            <div class="icon-btn"
                onclick="showToast('No new notifications','info')">
                <i class="bi bi-bell"></i>
            </div>
        </div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Inventory Search</div>
                <div class="page-header__desc">
                    Search and manage all received PO assets
                </div>
            </div>
            <div class="page-header__right" id="inventory_admin_actions">
                <?php if (isAdmin()): ?>
                <button
                    class="btn btn-secondary"
                    onclick="exportAssets()">
                    <i class="bi bi-download"></i> Export
                </button>
                <?php endif; ?>
                <button
                    class="btn btn-primary"
                    onclick="openAddAsset()">
                    <i class="bi bi-plus-lg"></i> Add Asset
                </button>
            </div>
        </div>

        <div class="table-toolbar">
            <div class="search-field" style="max-width:360px">
                <i class="bi bi-search"></i>
                <input
                    type="text"
                    id="asset_search"
                    placeholder="Serial #, PO number, description..."
                    oninput="debounceSearch(this.value)">
            </div>
            <select
                class="filter-select"
                id="filter_location"
                onchange="loadAssets()">
                <option value="">All Locations</option>
            </select>
            <select
                class="filter-select"
                id="filter_status"
                onchange="loadAssets()">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="deployed">Deployed</option>
                <option value="defective">Defective</option>
                <option value="in_repair">In Repair</option>
                <option value="retired">Retired</option>
                <option value="lost">Lost</option>
            </select>
            <select
                class="filter-select"
                id="filter_category"
                onchange="loadAssets()">
                <option value="">All Categories</option>
            </select>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Serial Number</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>PO Number</th>
                            <th>Location</th>
                            <th>Process Owner</th>
                            <th>Status</th>
                            <th>Date Received</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="assets_body">
                        <tr>
                            <td colspan="9" class="text-center py-4">
                                Loading assets...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="table-pagination" id="assets_pagination"></div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/shared/modals/modal_asset.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>
