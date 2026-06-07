<?php
// Shared modals — loaded once in footer (outside SPA #main_content).

include __DIR__ . '/modal_asset.php';
include __DIR__ . '/modal_view_asset.php';
include __DIR__ . '/modal_import.php';
include __DIR__ . '/modal_po.php';
include __DIR__ . '/modal_vendor.php';
include __DIR__ . '/modal_location.php';
include __DIR__ . '/modal_owner.php';
include __DIR__ . '/modal_category.php';

if (function_exists('isAdmin') && isAdmin()) {
    include __DIR__ . '/modal_user.php';
}
