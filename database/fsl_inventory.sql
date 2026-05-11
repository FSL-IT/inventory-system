-- FSL Inventory System — Full Database Schema & Seed
-- Run this after creating the database:
--   mysql -u root -p < database/fsl_inventory.sql

CREATE DATABASE IF NOT EXISTS fsl_inventory
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE fsl_inventory;

-- =============================
-- 1. USERS
-- =============================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin','user') DEFAULT 'user',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    DATETIME NULL
);

-- =============================
-- 2. VENDORS
-- =============================
CREATE TABLE IF NOT EXISTS vendors (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================
-- 3. CATEGORIES
-- =============================
CREATE TABLE IF NOT EXISTS categories (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================
-- 4. LOCATIONS
-- =============================
CREATE TABLE IF NOT EXISTS locations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================
-- 5. PROCESS OWNERS
-- =============================
CREATE TABLE IF NOT EXISTS process_owners (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================
-- 6. PURCHASE ORDERS
-- =============================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id     INT NULL,
    po_number     VARCHAR(100) NOT NULL UNIQUE,
    date_received DATE NULL,
    date_endorsed DATE NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

-- =============================
-- 7. ASSETS
-- =============================
CREATE TABLE IF NOT EXISTS assets (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    description   VARCHAR(255) NOT NULL,
    po_id         INT NULL,
    category_id   INT NULL,
    location_id   INT NULL,
    owner_id      INT NULL,
    remarks       TEXT NULL,
    status        ENUM(
                      'active','deployed','defective',
                      'in_repair','retired','lost'
                  ) DEFAULT 'active',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at    DATETIME NULL,
    FOREIGN KEY (po_id)       REFERENCES purchase_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)      ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id)       ON DELETE SET NULL,
    FOREIGN KEY (owner_id)    REFERENCES process_owners(id)  ON DELETE SET NULL
);

CREATE INDEX idx_assets_status     ON assets(status);
CREATE INDEX idx_assets_deleted_at ON assets(deleted_at);

-- =============================
-- 8. AUDIT LOGS
-- =============================
CREATE TABLE IF NOT EXISTS audit_logs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NULL,
    action     ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    table_name VARCHAR(50)  NOT NULL,
    record_id  INT          NOT NULL,
    changes    JSON         NULL,
    ip_address VARCHAR(45)  NULL,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_table_record ON audit_logs(table_name, record_id);

-- =============================
-- SEED DATA
-- =============================

-- Default admin user
-- Password: Admin@1234  (bcrypt cost 12)
INSERT INTO users (username, password_hash, role) VALUES
(
    'admin',
    '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
)
ON DUPLICATE KEY UPDATE username = username;

-- Vendors
INSERT INTO vendors (name) VALUES
    ('Trends & Technologies, Inc.'),
    ('Phil-Data Business Systems'),
    ('Visnet Technologies'),
    ('Comlan, Inc.')
ON DUPLICATE KEY UPDATE name = name;

-- Categories
INSERT INTO categories (name) VALUES
    ('Laptop'),
    ('Monitor'),
    ('Desktop'),
    ('Headset'),
    ('Webcam'),
    ('Yubikey'),
    ('Docking Station'),
    ('Network Device'),
    ('Cable'),
    ('Keyboard & Mouse')
ON DUPLICATE KEY UPDATE name = name;

-- Locations
INSERT INTO locations (name) VALUES
    ('Manila-Science Hub T1 2F'),
    ('Manila-Science Hub T2 2F'),
    ('SH1 3rd Floor'),
    ('SH2 Ground Floor')
ON DUPLICATE KEY UPDATE name = name;

-- Process Owners
INSERT INTO process_owners (name) VALUES
    ('Truckstop_TruckHub'),
    ('AmeriSave PHP Wave 2'),
    ('Eligibility Services'),
    ('CHC Cap Dev - QA'),
    ('Servbank & Celink'),
    ('Bupa'),
    ('Skin and Cancer Institutes')
ON DUPLICATE KEY UPDATE name = name;
