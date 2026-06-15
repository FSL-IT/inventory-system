<?php
// src/views/dashboard.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'Dashboard';
$pageJs    = 'dashboard.js';

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
    </div>

    <div class="content">
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__title">Dashboard</div>
                <div class="page-header__desc">
                    click any metric to jump to the relevant page.
                </div>
            </div>
        </div>

        <section class="dashboard-section">
            <h2 class="dashboard-section__title">
                <i class="bi bi-bell"></i> Needs Your Attention
            </h2>
            <div id="dashboard_alerts" class="dashboard-alerts">
                <div class="dashboard-alerts__loading">
                    Loading alerts…
                </div>
            </div>
        </section>

        <section class="dashboard-section">
            <h2 class="dashboard-section__title">
                <i class="bi bi-grid"></i> Inventory at a Glance
            </h2>
            <div class="stat-grid stat-grid--dashboard" id="stat_grid_main">
            </div>
        </section>

        <div class="grid-2col dashboard-charts">
            <div class="card">
                <div class="card-title">
                    Assets by Category
                    <a href="#" class="card-title__link"
                            onclick="event.preventDefault();
                                     appNavigate('/src/views/assets.php')">
                        View all assets →
                    </a>
                </div>
                <div id="category_breakdown"></div>
            </div>
            <div class="card">
                <div class="card-title">
                    Assets by Status
                    <span class="card-title__sub">click a row to filter</span>
                </div>
                <div id="status_breakdown"></div>
            </div>
        </div>

        <div class="grid-2col">
            <div class="card">
                <div class="card-title">
                    Recent Activity
                    <?php if (isAdmin()): ?>
                    <a href="#" class="card-title__link"
                            onclick="event.preventDefault();
                                     appNavigate(
                                         '/src/views/admin/audit_logs.php'
                                     )">
                        Full audit log →
                    </a>
                    <?php endif; ?>
                </div>
                <div id="recent_activity"></div>
            </div>
            <div class="card">
                <div class="card-title">
                    Top Process Owners
                    <span class="card-title__sub">click a row to view assets</span>
                    <?php if (isAdmin()): ?>
                    <a href="#" class="card-title__link"
                            onclick="event.preventDefault();
                                     appNavigate(
                                         '/src/views/process_owners.php'
                                     )">
                        Manage →
                    </a>
                    <?php endif; ?>
                </div>
                <div id="top_owners"></div>
            </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/shared/footer.php'; ?>
