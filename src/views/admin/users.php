<?php
// src/views/admin/users.php

require_once __DIR__ . '/../../../src/core/auth.php';
requireRole('admin');

$pageTitle = 'User Management';
$pageJs = 'users.js';

include __DIR__ . '/../shared/header.php';
include __DIR__ . '/../shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">User Management</div>
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
                <div class="page-header__title">User Management</div>
                <div class="page-header__desc">
                    Manage system users, roles, and access levels
                </div>
            </div>
            <div class="page-header__right">
                <button
                    class="btn btn-primary"
                    onclick="openModal('add_user')">
                    <i class="bi bi-person-plus"></i> Add User
                </button>
            </div>
        </div>

        <div class="table-wrapper">
            <div class="table-scroll">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Date Created</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="users_body">
                        <tr>
                            <td colspan="5" class="text-center py-4">
                                Loading users...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../shared/modals/modal_user.php'; ?>
<?php include __DIR__ . '/../shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/../shared/footer.php'; ?>
