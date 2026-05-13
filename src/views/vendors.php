<?php
require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();
$pageTitle = 'Vendors';
$pageJs    = 'vendors.js';
include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()"><i class="bi bi-list"></i></button>
        <div class="topbar__title">Vendors</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input type="text" id="global_search" placeholder="Search vendors..." oninput="globalSearch(this.value)">
        </div>
        <div class="topbar__actions">
            <div class="icon-btn" id="notif_btn" onclick="toggleNotifPanel()" style="position:relative">
                <i class="bi bi-bell"></i>
                <div class="notif-panel" id="notif_panel" onclick="event.stopPropagation()">
                    <div class="notif-panel__header">
                        <span class="notif-panel__title">🔔 Notifications</span>
                        <button class="notif-mark-all" onclick="markAllNotifsRead()">Mark all read</button>
                    </div>
                    <div class="notif-list" id="notif_list">
                        <div class="notif-empty"><i class="bi bi-bell-slash"></i><span>No new notifications</span></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Vendor Management</div>
                <div class="page-header__desc">Manage hardware and supply vendors</div>
            </div>
            <div class="page-header__right">
                <?php if (isAdmin()): ?>
                <button class="btn btn-primary" onclick="openAddVendor()">
                    <i class="bi bi-plus-lg"></i> Add Vendor
                </button>
                <?php endif; ?>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="table-toolbar">
            <div class="search-field" style="max-width:320px">
                <i class="bi bi-search"></i>
                <input type="text" id="ref_search" placeholder="Search vendors...">
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-left:auto">
                <span id="ref_counter" style="font-size:12px;color:var(--white-4)"></span>
                <select id="ref_per_page" class="filter-select">
                    <option value="10">10 / page</option>
                    <option value="25">25 / page</option>
                    <option value="50">50 / page</option>
                </select>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table">
                    <thead><tr></tr></thead>
                    <tbody id="vendors_body"></tbody>
                </table>
            </div>
        </div>
        <div id="vendor_pagination" class="pagination-bar"></div>
    </div>
</div>

<script src="/assets/js/ref_table.js"></script>
<script src="/assets/js/vendors.js"></script>

<?php include __DIR__ . '/shared/modals/modal_vendor.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>