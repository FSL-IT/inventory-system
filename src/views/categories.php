<?php
// src/views/categories.php

require_once __DIR__ . '/../../src/core/auth.php';
requireLogin();

$pageTitle = 'Category Management';
$pageJs = 'categories.js';

include __DIR__ . '/shared/header.php';
include __DIR__ . '/shared/sidebar.php';
?>

<div class="main" id="main_content">
    <div class="topbar">
        <button class="topbar__toggle" onclick="toggleSidebar()">
            <i class="bi bi-list"></i>
        </button>
        <div class="topbar__title">Category Management</div>
        <div class="topbar__search">
            <i class="bi bi-search topbar__search-icon"></i>
            <input
                type="text"
                id="global_search"
                placeholder="Search..."
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
                <div class="page-header__title">Category Management</div>
                <div class="page-header__desc">
                    Add, edit or remove asset categories as your inventory grows
                </div>
            </div>
            <div class="page-header__right">
                <button
                    class="btn btn-primary"
                    onclick="openModal('add_category')">
                    <i class="bi bi-plus-lg"></i> Add Category
                </button>
            </div>
        </div>

        <div class="grid-2col">
            <div class="card">
                <div class="card-title">Current Categories</div>
                <div id="category_list">
                    <p class="text-muted">Loading categories...</p>
                </div>
            </div>
        </div>
    </div>
</div>

<?php include __DIR__ . '/shared/modals/modal_category.php'; ?>
<?php include __DIR__ . '/shared/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/shared/footer.php'; ?>
