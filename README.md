# FSL Inventory Management System

Stack: HTML · CSS · JavaScript · PHP  
Database: MySQL (`fsl_inventory`)  
Color Palette: Dark Blue `#0D1B2A` · White `#FFFFFF` · Orange `#F4820A`

---

## Setup

### 1. Clone and install dependencies
```bash
git clone <repo-url> fsl-inventory
cd fsl-inventory
composer install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your DB credentials
```

### 3. Import the database
```sql
-- Run the SQL schema in your MySQL client:
source database/fsl_inventory.sql
```

### 4. Configure your web server
Point the document root to `/public`.

**Apache `.htaccess` (place in project root):**
```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/public
RewriteRule ^(.*)$ /public/$1 [L]
```

**Nginx:**
```nginx
root /path/to/fsl-inventory/public;
index index.php;
```

### 5. Default credentials
| Username | Password | Role  |
|----------|----------|-------|
| admin    | (set in DB seed) | Admin |

> **Important:** Update the default admin password immediately after first login.

---

## File Structure

```
fsl-inventory/
├── public/             # Web root (point server here)
│   └── index.php
├── src/
│   ├── api/            # REST JSON endpoints
│   ├── config/         # DB connection, constants
│   ├── core/           # Auth, response, validator
│   ├── helpers/        # Audit, export, import
│   └── views/          # PHP page templates
│       ├── auth/
│       ├── admin/      # Admin-only pages
│       └── shared/     # Header, sidebar, footer, modals
├── assets/
│   ├── css/            # Modular stylesheets
│   ├── js/             # Page-specific JS modules
│   └── images/
└── storage/
    └── backups/        # DB .sql snapshots (gitignored)
```

---

## Roles

| Feature                  | User (IT Staff) | Admin |
|--------------------------|:-----------:|:-----:|
| View Dashboard           | ✅ | ✅ |
| View / Add / Edit Assets | ✅ | ✅ |
| Soft Delete Asset        | ✅ | ✅ |
| Hard Delete Asset        | ❌ | ✅ |
| Export to Excel          | ❌ | ✅ |
| Import from Excel        | ❌ | ✅ |
| View Audit Log           | ❌ | ✅ |
| User Management          | ❌ | ✅ |
| Backup & Restore         | ❌ | ✅ |

---

## Security

- All queries use **PDO prepared statements** (no SQL injection)
- All HTML output uses `htmlspecialchars()` (no XSS)
- Every POST/PUT/DELETE validates a **CSRF token**
- Passwords hashed with **bcrypt** (cost 12)
- Sessions regenerated on login, cookie flags: `HttpOnly`, `SameSite=Strict`
