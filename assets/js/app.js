// assets/js/app.js
// Global utilities + Dynamic Content Loading (SPA navigation)

const csrfToken = document
    .querySelector('meta[name="csrf-token"]')?.content ?? '';

// ─── CSRF ─────────────────────────────────────────────────────────
function getCsrfToken() {
    return csrfToken;
}

// ─── API FETCH ────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    const isFormData = options.body instanceof FormData;

    const defaults = {
        headers: {
            ...(!isFormData
                ? { 'Content-Type': 'application/json' }
                : {}),
            'X-CSRF-Token': getCsrfToken(),
        },
    };

    const merged = {
        ...defaults,
        ...options,
        headers: {
            ...defaults.headers,
            ...(options.headers ?? {}),
        },
    };

    const response = await fetch(url, merged);
    const data     = await response.json();

    if (!data.success) {
        throw new Error(data.message ?? 'Request failed.');
    }

    return data;
}

// ─── TOAST ────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const iconMap = {
        success: '✅', error: '❌',
        info: 'ℹ️',   warning: '⚠️',
    };

    const container = document.getElementById('toast_container');
    if (!container) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${iconMap[type] ?? 'ℹ️'}</span>
        <span>${escapeHtml(msg)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast--fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ─── ESCAPE HTML ──────────────────────────────────────────────────
function escapeHtml(str) {
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;',
    };
    return String(str ?? '').replace(/[&<>"']/g, c => map[c]);
}

// ─── SIDEBAR TOGGLE ───────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    let overlay   = document.querySelector('.sidebar-overlay');

    if (!overlay) {
        overlay           = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick   = closeSidebar;
        document.body.appendChild(overlay);
    }

    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar')
        ?.classList.remove('open');
    document.querySelector('.sidebar-overlay')
        ?.classList.remove('open');
}

// ─── ACTIVE NAV ───────────────────────────────────────────────────
function setActiveNav(path) {
    const currentPath = path || window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href') ?? '';
        if (href.length > 1 && currentPath.includes(href)) {
            item.classList.add('active');
        }
    });
}

// ─── LOGOUT ───────────────────────────────────────────────────────
async function logoutUser() {
    try {
        await apiFetch('/src/api/auth.php', { method: 'DELETE' });
    } catch {
        // Always redirect even on error
    }
    window.location.href = '/src/views/auth/login.php';
}

// ─── DEBOUNCE ─────────────────────────────────────────────────────
function debounce(fn, delay = 350) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ─── PAGINATION ───────────────────────────────────────────────────
function renderPagination(containerId, pagination, loadFn) {
    const container = document.getElementById(containerId);
    if (!container || !pagination) {
        return;
    }

    const { page, total, per_page } = pagination;
    const totalPages =
        pagination.pages || pagination.total_pages || 1;

    if (!total) {
        container.innerHTML = '';
        return;
    }

    const start = (page - 1) * per_page + 1;
    const end   = Math.min(page * per_page, total);

    let html = `<span>${start}–${end} of ${total}</span>`;

    html += `
        <button type="button" class="pagination-btn"
                onclick="${loadFn}(${page - 1})"
                ${page <= 1 ? 'disabled' : ''}>
            ‹ Prev
        </button>`;

    const startPage = Math.max(1, page - 2);
    const endPage   = Math.min(totalPages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button type="button"
                    class="pagination-btn ${
                        i === page ? 'active' : ''
                    }"
                    onclick="${loadFn}(${i})">
                ${i}
            </button>`;
    }

    html += `
        <button type="button" class="pagination-btn"
                onclick="${loadFn}(${page + 1})"
                ${page >= totalPages ? 'disabled' : ''}>
            Next ›
        </button>`;

    container.innerHTML = html;
}

// ─── STATUS TAG ───────────────────────────────────────────────────
function statusTag(status) {
    const classMap = {
        active:    'tag-active',   deployed:  'tag-deployed',
        defective: 'tag-defective',in_repair: 'tag-repair',
        retired:   'tag-retired',  lost:      'tag-lost',
    };
    const labelMap = {
        active:    '✓ Active',    deployed:  '→ Deployed',
        defective: '✗ Defective', in_repair: '🔧 In Repair',
        retired:   '— Retired',   lost:      '? Lost',
    };
    const cls = classMap[status] ?? '';
    const lbl = labelMap[status] ?? escapeHtml(status);
    return `<span class="tag ${cls}">${lbl}</span>`;
}

// ─── FORMAT DATE ──────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) {
        return '—';
    }
    return new Date(dateStr).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────
function globalSearch(value) {
    const path = window.location.pathname;

    if (path.includes('dashboard') && value.trim()) {
        navigateTo(
            '/src/views/assets.php?search='
            + encodeURIComponent(value.trim())
        );
        return;
    }

    const searchMap = [
        { match: 'assets',
          id:    'asset_search' },
        { match: 'purchase_orders',
          id:    'po_search' },
        { match: 'audit_logs',
          id:    'audit_search' },
    ];

    for (const { match, id } of searchMap) {
        if (!path.includes(match)) {
            continue;
        }
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
    }

    // For ref-table pages, delegate to RefTable search
    if (window._refTable) {
        const refSearch =
            document.getElementById('ref_search');
        if (refSearch) {
            refSearch.value = value;
            refSearch.dispatchEvent(
                new Event('input', { bubbles: true })
            );
        }
    }
}

// ─────────────────────────────────────────────────────────────────
// SPA — DYNAMIC CONTENT LOADING
// Intercepts sidebar clicks, swaps only #main_content.
// Sidebar / header / footer never reload.
// ─────────────────────────────────────────────────────────────────

// Maps URL fragment → JS filename
const PAGE_JS_MAP = {
    dashboard:       'dashboard.js',
    assets:          'assets.js',
    purchase_orders: 'purchase_orders.js',
    reports:         'reports.js',
    vendors:         'vendors.js',
    locations:       'locations.js',
    process_owners:  'process_owners.js',
    categories:      'categories.js',
    audit_logs:      'audit_logs.js',
    users:           'users.js',
    backup:          'backup.js',
};

// Tracks scripts already injected — prevents re-declaration errors
const loadedScripts = new Set();

// ── Navigate to a page without full reload ────────────────────────
async function navigateTo(url, pushState = true) {
    setActiveNav(url);
    closeSidebar();

    const mainEl = document.getElementById('main_content');
    if (!mainEl) {
        window.location.href = url;
        return;
    }

    mainEl.classList.add('page-loading');

    try {
        const res = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const html = await res.text();
        const doc  = new DOMParser()
            .parseFromString(html, 'text/html');
        const newMain = doc.getElementById('main_content');

        if (!newMain) {
            window.location.href = url;
            return;
        }

        // Update CSRF token if refreshed
        const newCsrf = doc.querySelector(
            'meta[name="csrf-token"]'
        );
        if (newCsrf) {
            const meta = document.querySelector(
                'meta[name="csrf-token"]'
            );
            if (meta) {
                meta.content = newCsrf.content;
            }
        }

        // Swap content
        mainEl.innerHTML = newMain.innerHTML;
        mainEl.classList.remove('page-loading');

        if (pushState) {
            history.pushState({ url }, '', url);
        }

        const newTitle = doc.querySelector('title');
        if (newTitle) {
            document.title = newTitle.textContent;
        }

        // Run inline <script> blocks from the new page
        // (e.g. IS_ADMIN = true; AUDIT_TABLES = [...])
        newMain.querySelectorAll('script:not([src])')
            .forEach(s => {
                try {
                    // eslint-disable-next-line no-new-func
                    new Function(s.textContent)();
                } catch (e) {
                    // Non-fatal — inline script may already exist
                }
            });

        // Load the page JS module only once
        await loadPageScript(url);

        // Re-initialise page data after a short tick
        // so the DOM is fully settled
        setTimeout(() => initPageModule(url), 20);

    } catch (err) {
        console.error('navigateTo error:', err);
        mainEl.classList.remove('page-loading');
        window.location.href = url;
    }
}

// ── Load a page JS file — only once per script ────────────────────
async function loadPageScript(url) {
    const jsFile = resolvePageJs(url);
    if (!jsFile || loadedScripts.has(jsFile)) {
        return;
    }

    return new Promise(resolve => {
        const script   = document.createElement('script');
        script.src     = `/assets/js/${jsFile}`;
        script.onload  = () => {
            loadedScripts.add(jsFile);
            resolve();
        };
        script.onerror = () => resolve(); // non-fatal
        document.head.appendChild(script);
    });
}

function resolvePageJs(url) {
    for (const [fragment, file] of Object.entries(PAGE_JS_MAP)) {
        if (url.includes(fragment)) {
            return file;
        }
    }
    return null;
}

// ── Re-initialise the correct page module after content swap ──────
function initPageModule(url) {
    setActiveNav(url);

    // Reference Data pages (vendors, locations, etc.) all use
    // window._refTable. Re-fire the DOMContentLoaded equivalent
    // by dispatching a custom event that ref-table pages listen to.
    const refPages = [
        'vendors', 'locations', 'process_owners', 'categories',
    ];
    const isRefPage = refPages.some(p => url.includes(p));

    if (isRefPage) {
        // DOMContentLoaded already fired — the RefTable
        // constructor runs inside that listener, so _refTable
        // was never created on SPA navigation.
        // Manually dispatch a new DOMContentLoaded-equivalent:
        document.dispatchEvent(new Event('DOMContentLoaded'));
        return;
    }

    // Explicit init map for all other pages
    const initMap = {
        dashboard: () => {
            if (typeof loadDashboard === 'function') {
                loadDashboard();
            }
        },
        assets: () => {
            if (typeof fetchInitialAssets === 'function') {
                fetchInitialAssets();
            }
            if (typeof populateAssetFormDropdowns === 'function') {
                populateAssetFormDropdowns();
            }
            if (typeof setupImportDropZone === 'function') {
                setupImportDropZone();
            }
        },
        purchase_orders: () => {
            if (typeof fetchInitialPOs === 'function') {
                fetchInitialPOs();
            }
            if (typeof populatePoVendorDropdown === 'function') {
                populatePoVendorDropdown();
            }
            if (typeof populatePoFormVendors === 'function') {
                populatePoFormVendors();
            }
            if (typeof populatePoCategoryFilter === 'function') {
                populatePoCategoryFilter();
            }
            if (typeof populatePoOwnerFilter === 'function') {
                populatePoOwnerFilter();
            }
            if (typeof populatePoFiscalYearFilter === 'function') {
                populatePoFiscalYearFilter();
            }
        },
        reports: () => {
            if (typeof loadReport === 'function') {
                loadReport('by_location');
            }
        },
        audit_logs: () => {
            // Ensure AUDIT_TABLES is defined before audit_logs.js
            // tries to use it (it may come from a PHP inline script)
            if (typeof window.AUDIT_TABLES === 'undefined') {
                window.AUDIT_TABLES = [];
            }
            if (typeof loadRefData === 'function') {
                loadRefData().then(() => {
                    if (typeof fetchInitialAuditLogs === 'function') {
                        fetchInitialAuditLogs();
                    }
                });
            } else if (
                typeof fetchInitialAuditLogs === 'function'
            ) {
                fetchInitialAuditLogs();
            }
        },
        users: () => {
            if (typeof loadUsers === 'function') {
                loadUsers();
            }
        },
        backup: () => {
            if (typeof loadBackupList === 'function') {
                loadBackupList();
            }
        },
    };

    for (const [fragment, fn] of Object.entries(initMap)) {
        if (url.includes(fragment)) {
            fn();
            break;
        }
    }
}

// ── Intercept sidebar clicks ──────────────────────────────────────
function bindSidebarLinks() {
    document.querySelectorAll('.nav-item[href]')
        .forEach(link => {
            link.removeEventListener('click', handleNavClick);
            link.addEventListener('click', handleNavClick);
        });
}

function handleNavClick(e) {
    const href = this.getAttribute('href');
    if (
        !href ||
        href.startsWith('http') ||
        href.includes('/auth/') ||
        href.startsWith('#')
    ) {
        return;
    }
    e.preventDefault();
    navigateTo(href);
}

// ── Browser back / forward ────────────────────────────────────────
window.addEventListener('popstate', e => {
    const url = e.state?.url || window.location.pathname;
    navigateTo(url, false);
});

// ─── BOOT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    bindSidebarLinks();

    // Mark the initial page's script as already loaded
    const jsFile = resolvePageJs(window.location.pathname);
    if (jsFile) {
        loadedScripts.add(jsFile);
    }

    // Seed history for popstate to work on first back press
    history.replaceState(
        { url: window.location.href },
        '',
        window.location.href
    );
});