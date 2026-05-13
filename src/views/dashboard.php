<?php
// src/views/dashboard.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'Dashboard';
$pageJs = 'dashboard.js';
$pageJs2 = 'assets.js';

include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" id="sidebar_toggle"
            onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title" id="topbar_title">Dashboard</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input
                type="text"
                id="global_search"
                placeholder="Search serial #, PO, description..."
                oninput="globalSearch(this.value)">
        </div>
        <div class="topbar__actions">
            <div class="icon-btn" id="notif_btn"
                onclick="showToast('No new notifications','info')">
                <i class="bi bi-bell"></i>
                <span class="notif-dot"></span>
            </div>
        </div>
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Asset Overview</div>
                <div class="page-header__desc">
                    Real-time tracking of all received PO inventory assets
                </div>
            </div>
        </div>

        <!-- Stat Cards Row 1 -->
        <div class="stat-grid" id="stat_grid_1">
            <div class="stat-card stat-card--orange" id="stat_total">
                <div class="stat-card__icon">
                    <i class="bi bi-box-seam"></i>
                </div>
                <div class="stat-card__num" id="stat_total_num">—</div>
                <div class="stat-card__label">Total Assets</div>
                <div class="stat-card__change stat-card__change--up"
                    id="stat_total_sub"></div>
            </div>
            <div class="stat-card stat-card--green" id="stat_active">
                <div class="stat-card__icon">
                    <i class="bi bi-check-circle"></i>
                </div>
                <div class="stat-card__num" id="stat_active_num">—</div>
                <div class="stat-card__label">Active / Deployed</div>
                <div class="stat-card__change stat-card__change--up"
                    id="stat_active_sub"></div>
            </div>
            <div class="stat-card stat-card--yellow" id="stat_pending">
                <div class="stat-card__icon">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <div class="stat-card__num" id="stat_pending_num">—</div>
                <div class="stat-card__label">Pending Endorsement</div>
                <div class="stat-card__change stat-card__change--down">
                    ↓ Needs attention
                </div>
            </div>
            <div class="stat-card stat-card--red" id="stat_defective">
                <div class="stat-card__icon">
                    <i class="bi bi-tools"></i>
                </div>
                <div class="stat-card__num" id="stat_defective_num">—</div>
                <div class="stat-card__label">Defective / In Repair</div>
                <div class="stat-card__change stat-card__change--down"
                    id="stat_defective_sub"></div>
            </div>
        </div>

        <!-- Stat Cards Row 2 -->
        <div class="stat-grid" id="stat_grid_2">
            <div class="stat-card stat-card--blue">
                <div class="stat-card__icon">
                    <i class="bi bi-file-earmark-text"></i>
                </div>
                <div class="stat-card__num" id="stat_pos_num">—</div>
                <div class="stat-card__label">Total PO Records</div>
            </div>
            <div class="stat-card stat-card--purple">
                <div class="stat-card__icon">
                    <i class="bi bi-geo-alt"></i>
                </div>
                <div class="stat-card__num" id="stat_loc_num">—</div>
                <div class="stat-card__label">Center Locations</div>
            </div>
            <div class="stat-card stat-card--orange">
                <div class="stat-card__icon">
                    <i class="bi bi-building"></i>
                </div>
                <div class="stat-card__num" id="stat_vendor_num">—</div>
                <div class="stat-card__label">Active Vendors</div>
            </div>
            <div class="stat-card stat-card--green">
                <div class="stat-card__icon">
                    <i class="bi bi-tags"></i>
                </div>
                <div class="stat-card__num" id="stat_cat_num">—</div>
                <div class="stat-card__label">Asset Categories</div>
            </div>
        </div>

        <!-- Charts Row -->
        <div class="grid-3col">
            <div class="card">
                <div class="card-title">
                    Category Breakdown
                    <span class="card-title__sub">by unit count</span>
                </div>
                <div id="category_breakdown"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px">
                <div class="card">
                    <div class="card-title">Asset Status</div>
                    <div id="status_breakdown"></div>
                </div>
                <div class="card">
                    <div class="card-title">
                        <i class="bi bi-lightning-charge"></i> Smart Insights
                    </div>
                    <div id="dashboard_insights"></div>
                </div>
            </div>
        </div>

        <!-- Activity + Location Row -->
        <div class="grid-2col">
            <div class="card">
                <div class="card-title">
                    Recent Activity
                    <span class="card-title__sub">last 5 actions</span>
                </div>
                <div id="recent_activity"></div>
            </div>
            <div class="card">
                <div class="card-title">Top Process Owners</div>
                <div id="top_owners"></div>
            </div>
        </div>
    </div><!-- end content -->
</div><!-- end main -->

<?php include __DIR__ . '/shared/modals/modal_asset.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>
