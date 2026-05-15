<?php
require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();
$pageTitle = 'Inventory';
$pageJs    = 'assets.js';
include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" id="sidebar_toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Inventory Search</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input type="text" id="global_search"
                placeholder="Search serial #, PO, description..."
                oninput="globalSearch(this.value)">
        </div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Inventory Search</div>
                <div class="page-header__desc">Search and manage all received PO assets</div>
            </div>
            <div class="page-header__right" id="inventory_admin_actions">
                <?php if (isAdmin()): ?>
                <button class="btn btn-secondary" onclick="exportAssets()">
                    <i class="bi bi-download"></i> Export
                </button>
                <button class="btn btn-secondary" onclick="openImportModal()">
                    <i class="bi bi-file-earmark-arrow-up"></i> Import Excel
                </button>
                <?php endif; ?>
                <button class="btn btn-primary" onclick="openAddAsset()">
                    <i class="bi bi-plus-lg"></i> Add Asset
                </button>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="table-toolbar">
            <div class="search-field" style="max-width:340px">
                <i class="bi bi-search"></i>
                <input type="text" id="asset_search"
                    placeholder="Serial #, PO number, description, vendor..."
                    oninput="debounceSearch(this.value)">
            </div>
            <select class="filter-select" id="filter_status" onchange="loadAssets(1)">
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="deployed">Deployed</option>
                <option value="defective">Defective</option>
                <option value="in_repair">In Repair</option>
                <option value="retired">Retired</option>
                <option value="lost">Lost</option>
            </select>
            <select class="filter-select" id="filter_category" onchange="loadAssets(1)">
                <option value="">All Categories</option>
            </select>
            <select class="filter-select" id="filter_location" onchange="loadAssets(1)">
                <option value="">All Locations</option>
            </select>
            <select class="filter-select" id="filter_owner" onchange="loadAssets(1)">
                <option value="">All Owners</option>
            </select>
            <div style="display:flex;align-items:center;gap:8px;margin-left:auto">
                <span id="asset_counter" style="font-size:12px;color:var(--white-4);white-space:nowrap"></span>
                <select class="filter-select" id="asset_per_page" onchange="onPerPageChange()">
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                    <option value="100">100 / page</option>
                </select>
                <button class="btn btn-secondary btn-sm" onclick="clearAssetFilters()" title="Clear all filters">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table" id="assets_table">
                    <thead>
                        <tr>
                            <th class="sortable-th" onclick="sortAssets('a.serial_number')">
                                Serial # <i class="bi bi-arrow-down-up sort-icon" id="sort_a.serial_number"></i>
                            </th>
                            <th class="sortable-th" onclick="sortAssets('a.description')">
                                Description <i class="bi bi-arrow-down-up sort-icon" id="sort_a.description"></i>
                            </th>
                            <th class="sortable-th" onclick="sortAssets('c.name')">
                                Category <i class="bi bi-arrow-down-up sort-icon" id="sort_c.name"></i>
                            </th>
                            <th>PO Number</th>
                            <th class="sortable-th" onclick="sortAssets('l.name')">
                                Location <i class="bi bi-arrow-down-up sort-icon" id="sort_l.name"></i>
                            </th>
                            <th class="sortable-th" onclick="sortAssets('o.name')">
                                Process Owner <i class="bi bi-arrow-down-up sort-icon" id="sort_o.name"></i>
                            </th>
                            <th class="sortable-th" onclick="sortAssets('a.status')">
                                Status <i class="bi bi-arrow-down-up sort-icon" id="sort_a.status"></i>
                            </th>
                            <th class="sortable-th" onclick="sortAssets('po.date_received')">
                                Date Received <i class="bi bi-arrow-down-up sort-icon" id="sort_po.date_received"></i>
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="assets_body">
                        <tr><td colspan="9" style="text-align:center;padding:30px;color:var(--white-4)">Loading assets...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="pagination-bar" id="assets_pagination"></div>
    </div>
</div>

<?php include __DIR__ . '/shared/modals/modal_asset.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_import.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>