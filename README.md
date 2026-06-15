# FSL Inventory Management System

Stack: HTML · CSS · JavaScript · PHP  
Database: MySQL (`fsl_inventory`)  
Color Palette: Dark Blue `#0D1B2A` · White `#FFFFFF` · Orange `#F4820A`

---

## Setup

### 1. Clone and install dependencies
```bash
git clone <repo-url>
cd inventory-system
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


### 5. Default credentials
| Username | Password | Role  |
|----------|----------|-------|
| admin    | password | Admin |

> **Important:** Update the default admin password immediately after first login.
