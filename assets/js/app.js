// assets/js/app.js
// Global utilities: CSRF, toast, sidebar, search, logout

let csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// ===== CSRF =====
function getCsrfToken() {
    return csrfToken;
}

// ===== API FETCH WRAPPER =====
async function apiFetch(url, options = {}) {
    const isFormData = options.body instanceof FormData;

    const defaults = {
        headers: {
            ...( !isFormData ? { 'Content-Type': 'application/json' } : {} ),
            'X-CSRF-Token': getCsrfToken(),
        },
    };

    const merged = {
        ...defaults,
        ...options,
        headers: { ...defaults.headers, ...(options.headers ?? {}) },
    };

    // If caller already set X-CSRF-Token in their own headers (e.g. backup upload),
    // honour that and don't duplicate it
    const response = await fetch(url, merged);
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message ?? 'Request failed.');
    }

    return data;
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
    const iconMap = {
        success: '✅',
        error:   '❌',
        info:    'ℹ️',
        warning: '⚠️',
    };

    const container = document.getElementById('toast_container');
    const toast = document.createElement('div');

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${iconMap[type] ?? 'ℹ️'}</span>
        <span>${msg}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast--fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    let overlay = document.querySelector('.sidebar-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
    }

    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    sidebar.classList.remove('open');

    if (overlay) {
        overlay.classList.remove('open');
    }
}

// ===== ACTIVE NAV HIGHLIGHT =====
function setActiveNav() {
    const path = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href') ?? '';

        if (path.includes(href) && href.length > 1) {
            item.classList.add('active');
        }
    });
}

// ===== GLOBAL SEARCH =====
function globalSearch(value) {
    const path = window.location.pathname;

    if (path.includes('dashboard')) {
        if (value.trim()) {
            window.location.href = '/src/views/assets.php?search=' + encodeURIComponent(value.trim());
        }
        return;
    }

    const pageMap = [
        { match: 'assets',          inputId: 'asset_search',    loadFn: () => typeof loadAssets === 'function' && loadAssets(1) },
        { match: 'purchase_orders', inputId: 'po_search',       loadFn: () => typeof loadPurchaseOrders === 'function' && loadPurchaseOrders(1) },
        { match: 'vendors',         inputId: 'vendor_search',   loadFn: () => typeof loadVendors === 'function' && loadVendors(1) },
        { match: 'locations',       inputId: 'location_search', loadFn: () => typeof loadLocations === 'function' && loadLocations(1) },
        { match: 'categories',      inputId: 'category_search', loadFn: () => typeof loadCategories === 'function' && loadCategories(1) },
        { match: 'process_owners',  inputId: 'owner_search',    loadFn: () => typeof loadOwners === 'function' && loadOwners(1) },
        { match: 'audit_logs',      inputId: 'audit_search',    loadFn: () => typeof loadAuditLogs === 'function' && loadAuditLogs(1) },
        { match: 'users',           inputId: 'user_search',     loadFn: () => typeof loadUsers === 'function' && loadUsers() },
    ];

    for (const { match, inputId, loadFn } of pageMap) {
        if (path.includes(match)) {
            const searchEl = document.getElementById(inputId);
            if (searchEl) {
                searchEl.value = value;
                searchEl.dispatchEvent(new Event('input', { bubbles: true }));
                loadFn();
            }
            break;
        }
    }
}

// ===== LOGOUT =====
async function logoutUser() {
    try {
        await apiFetch('/src/api/auth.php', { method: 'DELETE' });
    } catch (e) {
        // Always redirect on logout attempt
    }

    window.location.href = '/src/views/auth/login.php';
}

// ===== DEBOUNCE =====
function debounce(fn, delay = 350) {
    let timer;

    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ===== PAGINATION RENDERER =====
function renderPagination(containerId, pagination, loadFn) {
    const container = document.getElementById(containerId);

    if (!container || !pagination) {
        return;
    }

    const { page, pages, total, per_page } = pagination;
    const start = (page - 1) * per_page + 1;
    const end = Math.min(page * per_page, total);

    let html = `<span>${start}–${end} of ${total}</span>`;

    html += `
        <button
            class="pagination-btn"
            onclick="${loadFn}(${page - 1})"
            ${page <= 1 ? 'disabled' : ''}>
            ‹ Prev
        </button>
    `;

    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button
                class="pagination-btn ${i === page ? 'active' : ''}"
                onclick="${loadFn}(${i})">
                ${i}
            </button>
        `;
    }

    html += `
        <button
            class="pagination-btn"
            onclick="${loadFn}(${page + 1})"
            ${page >= pages ? 'disabled' : ''}>
            Next ›
        </button>
    `;

    container.innerHTML = html;
}

// ===== STATUS TAG HELPER =====
function statusTag(status) {
    const classMap = {
        active:    'tag-active',
        deployed:  'tag-deployed',
        defective: 'tag-defective',
        in_repair: 'tag-repair',
        retired:   'tag-retired',
        lost:      'tag-lost',
    };

    const labelMap = {
        active:    '✓ Active',
        deployed:  '→ Deployed',
        defective: '✗ Defective',
        in_repair: '🔧 In Repair',
        retired:   '— Retired',
        lost:      '? Lost',
    };

    const cls = classMap[status] ?? '';
    const lbl = labelMap[status] ?? status;

    return `<span class="tag ${cls}">${lbl}</span>`;
}

// ===== FORMAT DATE =====
function formatDate(dateStr) {
    if (!dateStr) {
        return '—';
    }

    return new Date(dateStr).toLocaleDateString('en-PH', {
        year:  'numeric',
        month: 'short',
        day:   'numeric',
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', setActiveNav);
