<?php
// src/views/auth/login.php

require_once __DIR__ . '/../../../src/core/auth.php';

if (isLoggedIn()) {
    header('Location: /src/views/dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FSL Inventory — Sign In</title>
    <link
        rel="stylesheet"
        href="/assets/css/variables.css">
    <link
        rel="stylesheet"
        href="/assets/css/base.css">
    <link
        rel="stylesheet"
        href="/assets/css/forms.css">
    <link
        rel="stylesheet"
        href="/assets/css/components.css">
    <link
        rel="stylesheet"
        href="/assets/css/responsive.css">
    <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet">
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
</head>
<body class="login-body">

<div class="login-page">
    <div class="login-card">
        <div class="login-logo">
            <div class="login-logo__icon">📦</div>
            <div class="login-logo__name">FSL Inventory</div>
            <div class="login-logo__sub">
                PO Received Asset Tracking System
            </div>
        </div>

        <div id="login_error" class="alert-error hidden"></div>

        <div class="login-form" id="login_form">
            <div class="form-group">
                <label for="login_username">Username</label>
                <input
                    type="text"
                    id="login_username"
                    placeholder="Enter username"
                    autocomplete="username">
            </div>
            <div class="form-group">
                <label for="login_password">Password</label>
                <input
                    type="password"
                    id="login_password"
                    placeholder="Enter password"
                    autocomplete="current-password">
            </div>
            <button
                class="login-btn"
                id="login_btn"
                onclick="submitLogin()">
                Sign In →
            </button>
        </div>
    </div>
</div>

<div class="toast-container" id="toast_container"></div>

<script src="/assets/js/app.js"></script>
<script src="/assets/js/auth.js"></script>
</body>
</html>
