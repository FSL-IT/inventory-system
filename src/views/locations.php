<?php
// src/views/locations.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'Locations';
$pageJs = 'locations.js';

include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Locations</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input type="text" id="global_search" placeholder="Search..." oninput="globalSearch(this.value)">
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
                <div class="page-header__title">Location Management</div>
                <div class="page-header__desc">
                    Manage center locations and sites
                </div>
            </div>
            <div class="page-header__right">
                <button
                    class="btn btn-primary"
                    onclick="openModal('add_location')">
                    <i class="bi bi-plus-lg"></i> Add Location
                </button>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Location Name</th>
                            <th>Asset Count</th>
                            <th>Date Added</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="locations_body">
                        <tr>
                            <td colspan="4" class="text-center py-4">
                                Loading locations...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/shared/modals/modal_location.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>
