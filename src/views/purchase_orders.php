<?php
require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();
$pageTitle = 'PO Tracker';
$pageJs    = 'purchase_orders.js';
include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<script>
    const IS_ADMIN = <?php echo isAdmin() ? 'true' : 'false'; ?>;
</script>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">PO Tracker</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input type="text" id="global_search"
                    placeholder="Search PO number, vendor..."
                    oninput="globalSearch(this.value)">
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
                <?php if (isAdmin()): ?>
                <button class="btn btn-primary" onclick="openAddPO()">
                    <i class="bi bi-plus-lg"></i> New PO
                </button>
                <?php endif; ?>
            </div>
        </div>

        <div class="table-toolbar">
            <div class="search-field" style="max-width:300px">
                <i class="bi bi-search"></i>
                <input type="text" id="po_search"
                        placeholder="PO number, vendor..."
                        oninput="debouncePoSearch()">
            </div>
            <select class="filter-select" id="filter_vendor" 
                    onchange="loadPOs(1)">
                <option value="">All Vendors</option>
            </select>
            <select class="filter-select" id="filter_endorsed" 
                    onchange="loadPOs(1)">
                <option value="">All Statuses</option>
                <option value="no">⏳ Pending Endorsement</option>
                <option value="yes">✓ Endorsed</option>
            </select>
            
            <div style="display:flex;align-items:center;gap:8px;
                        margin-left:auto">
                <span id="po_counter" 
                        style="font-size:12px;color:var(--white-4);
                               white-space:nowrap"></span>
                <select class="filter-select" id="po_per_page" 
                        onchange="loadPOs(1)">
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                    <option value="100">100 / page</option>
                </select>
                <button class="btn btn-secondary btn-sm" 
                        onclick="clearPoFilters()" title="Clear filters">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="sortable-th" 
                                    onclick="sortPOs('po.po_number')">
                                PO Number 
                                <i class="bi bi-arrow-down-up sort-icon" 
                                        id="posort_po.po_number"></i>
                            </th>
                            <th class="sortable-th" 
                                    onclick="sortPOs('v.name')">
                                Vendor 
                                <i class="bi bi-arrow-down-up sort-icon" 
                                        id="posort_v.name"></i>
                            </th>
                            <th class="sortable-th" 
                                    onclick="sortPOs('asset_count')" 
                                    style="text-align:center">
                                Assets 
                                <i class="bi bi-arrow-down-up sort-icon" 
                                        id="posort_asset_count"></i>
                            </th>
                            <th class="sortable-th" 
                                    onclick="sortPOs('po.date_received')">
                                Date Received 
                                <i class="bi bi-arrow-down-up sort-icon" 
                                        id="posort_po.date_received"></i>
                            </th>
                            <th class="sortable-th" 
                                    onclick="sortPOs('po.date_endorsed')">
                                Date Endorsed 
                                <i class="bi bi-arrow-down-up sort-icon" 
                                        id="posort_po.date_endorsed"></i>
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="po_body">
                        <tr>
                            <td colspan="6" 
                                    style="text-align:center;padding:30px;
                                           color:var(--white-4)">
                                Loading...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="pagination-bar" id="po_pagination"></div>
    </div>
</div>

<?php include __DIR__ . '/shared/modals/modal_po.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>