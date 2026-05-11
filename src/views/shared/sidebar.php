<?php
// src/views/shared/sidebar.php
$currentUser = htmlspecialchars($_SESSION['username'] ?? '');
$currentRole = htmlspecialchars($_SESSION['role'] ?? 'user');
$roleLabel = $currentRole === 'admin' ? 'Administrator' : 'IT Staff';
$avatarChar = strtoupper(substr($currentUser, 0, 1));
?>
<nav class="sidebar" id="sidebar">
    <div class="sidebar-brand">
        <div class="brand-icon">📦</div>
        <div class="brand-text">
            <div class="brand-text__name">FSL Inventory</div>
            <div class="brand-text__sub">Asset Management System</div>
        </div>
    </div>

    <div class="role-badge">
        <div class="role-badge__avatar" id="sidebar_avatar">
            <?= $avatarChar ?>
        </div>
        <div class="role-badge__info">
            <div class="role-badge__username" id="sidebar_user">
                <?= $currentUser ?>
            </div>
            <div class="role-badge__role" id="sidebar_role">
                <?= $roleLabel ?>
            </div>
        </div>
    </div>

    <div class="sidebar-nav" id="sidebar_nav">
        <div class="nav-section-label">Main</div>

        <a class="nav-item" href="/src/views/dashboard.php"
            id="nav-dashboard">
            <span class="nav-item__icon">
                <i class="bi bi-speedometer2"></i>
            </span>
            <span class="nav-item__label">Dashboard</span>
        </a>

        <a class="nav-item" href="/src/views/assets.php"
            id="nav-assets">
            <span class="nav-item__icon">
                <i class="bi bi-search"></i>
            </span>
            <span class="nav-item__label">Search Inventory</span>
        </a>

        <a class="nav-item" href="/src/views/purchase_orders.php"
            id="nav-purchase_orders">
            <span class="nav-item__icon">
                <i class="bi bi-file-earmark-text"></i>
            </span>
            <span class="nav-item__label">PO Tracker</span>
        </a>

        <div class="nav-section-label">Reference Data</div>

        <a class="nav-item" href="/src/views/vendors.php"
            id="nav-vendors">
            <span class="nav-item__icon">
                <i class="bi bi-building"></i>
            </span>
            <span class="nav-item__label">Vendors</span>
        </a>

        <a class="nav-item" href="/src/views/locations.php"
            id="nav-locations">
            <span class="nav-item__icon">
                <i class="bi bi-geo-alt"></i>
            </span>
            <span class="nav-item__label">Locations</span>
        </a>

        <a class="nav-item" href="/src/views/process_owners.php"
            id="nav-process_owners">
            <span class="nav-item__icon">
                <i class="bi bi-person-workspace"></i>
            </span>
            <span class="nav-item__label">Process Owners</span>
        </a>

        <?php if (isAdmin()): ?>
        <div class="nav-section-label">Administration</div>

        <a class="nav-item" href="/src/views/categories.php"
            id="nav-categories">
            <span class="nav-item__icon">
                <i class="bi bi-tags"></i>
            </span>
            <span class="nav-item__label">Category Management</span>
        </a>

        <a class="nav-item" href="/src/views/admin/users.php"
            id="nav-users">
            <span class="nav-item__icon">
                <i class="bi bi-people"></i>
            </span>
            <span class="nav-item__label">User Management</span>
        </a>

        <a class="nav-item" href="/src/views/admin/audit_logs.php"
            id="nav-audit_logs">
            <span class="nav-item__icon">
                <i class="bi bi-clock-history"></i>
            </span>
            <span class="nav-item__label">Activity History</span>
        </a>

        <a class="nav-item" href="/src/views/admin/backup.php"
            id="nav-backup">
            <span class="nav-item__icon">
                <i class="bi bi-cloud-arrow-up"></i>
            </span>
            <span class="nav-item__label">Backup &amp; Restore</span>
        </a>
        <?php endif; ?>
    </div>

    <div class="sidebar-footer">
        <button
            class="sidebar-footer-btn"
            id="logout_btn"
            onclick="logoutUser()">
            <i class="bi bi-box-arrow-left"></i> Logout
        </button>
    </div>
</nav>
