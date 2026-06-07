<?php
// src/views/vendors.php

require_once __DIR__ . '/../../src/core/auth.php';
requireRole('admin');
$pageTitle = 'Vendors';
$pageJs    = 'vendors.js';
include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle"
                onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Vendors</div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Vendors</div>
                <div class="page-header__desc">
                    Manage supplier companies
                </div>
            </div>
            <div class="page-header__right">
                <button class="btn btn-primary"
                        onclick="window.openAddVendor()">
                    <i class="bi bi-plus-lg"></i> Add Vendor
                </button>
            </div>
        </div>

        <div class="table-toolbar">
            <div class="search-field" style="max-width:280px">
                <i class="bi bi-search"></i>
                <input type="text" id="ref_search"
                        placeholder="Search vendors...">
            </div>
            <div style="margin-left:auto;display:flex;
                        align-items:center;gap:8px">
                <span id="ref_counter"
                        style="font-size:12px;
                               color:var(--white-4)"></span>
                <select id="ref_per_page"
                        class="filter-select">
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
        <div id="vendor_pagination"
                class="pagination-bar"></div>
    </div>

    <?php include __DIR__ . '/shared/modals/modal_vendor.php'; ?>
</div>

<?php include __DIR__ . '/shared/footer.php'; ?>