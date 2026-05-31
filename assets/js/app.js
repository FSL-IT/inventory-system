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

// ─── GLOBAL DOM UTILITIES ─────────────────────────────────────────
function getVal(id) {
    return document.getElementById(id)?.value.trim() ?? '';
}

function safeSetVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function toggleClass(id, className, force) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(className, force);
}

function escapeJsStr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ─── TOAST ────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const iconMap = {
        success: '✅', error: '❌',
        info: 'ℹ️',   warning: '⚠️',
    };

    const container = document.getElementById('toast_container');
    if (!container) return;

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
    if (!container || !pagination) return;

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
    if (!dateStr) return '—';
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
        { match: 'assets',          id: 'asset_search' },
        { match: 'purchase_orders', id: 'po_search' },
        { match: 'audit_logs',      id: 'audit_search' },
    ];

    for (const { match, id } of searchMap) {
        if (!path.includes(match)) continue;
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
    }

    if (window._refTable) {
        const refSearch = document.getElementById('ref_search');
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
// ─────────────────────────────────────────────────────────────────

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

const loadedScripts = new Set();

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

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const html = await res.text();
        const doc  = new DOMParser()
            .parseFromString(html, 'text/html');
        const newMain = doc.getElementById('main_content');

        if (!newMain) {
            window.location.href = url;
            return;
        }

        const newCsrf = doc.querySelector('meta[name="csrf-token"]');
        if (newCsrf) {
            const meta = document.querySelector(
                'meta[name="csrf-token"]'
            );
            if (meta) meta.content = newCsrf.content;
        }

        mainEl.innerHTML = newMain.innerHTML;
        mainEl.classList.remove('page-loading');

        if (pushState) {
            history.pushState({ url }, '', url);
        }

        const newTitle = doc.querySelector('title');
        if (newTitle) {
            document.title = newTitle.textContent;
        }

        newMain.querySelectorAll('script:not([src])')
            .forEach(s => {
                try {
                    // eslint-disable-next-line no-new-func
                    new Function(s.textContent)();
                } catch (e) {
                    // Non-fatal
                }
            });

        await loadPageScript(url);
        setTimeout(() => initPageModule(url), 20);

    } catch (err) {
        console.error('navigateTo error:', err);
        mainEl.classList.remove('page-loading');
        window.location.href = url;
    }
}

// SMART SCRIPT INJECTION - Checks the DOM to prevent duplicate loads
async function injectScript(src) {
    const existing = Array.from(document.querySelectorAll('script'))
        .find(s => s.src.includes(src));
        
    if (existing) {
        return Promise.resolve(); // Script is already on the page
    }
    
    return new Promise(resolve => {
        const script   = document.createElement('script');
        script.src     = src;
        script.onload  = resolve;
        script.onerror = resolve; 
        document.head.appendChild(script);
    });
}

async function loadPageScript(url) {
    const refPages = [
        'vendors', 'locations', 'process_owners', 'categories'
    ];
    
    // Auto-load RefTable dependency for reference data pages
    if (refPages.some(p => url.includes(p))) {
        if (!loadedScripts.has('ref_table.js')) {
            await injectScript('/assets/js/ref_table.js');
            loadedScripts.add('ref_table.js');
        }
    }

    const jsFile = resolvePageJs(url);
    if (!jsFile || loadedScripts.has(jsFile)) {
        return;
    }

    await injectScript(`/assets/js/${jsFile}`);
    loadedScripts.add(jsFile);
}

function resolvePageJs(url) {
    for (const [fragment, file] of Object.entries(PAGE_JS_MAP)) {
        if (url.includes(fragment)) return file;
    }
    return null;
}

function initPageModule(url) {
    setActiveNav(url);

    // Clean explicit init map
    const initMap = {
        dashboard:       () => window.loadDashboard?.(),
        assets:          () => window.initAssets?.(),
        purchase_orders: () => window.initPOs?.(),
        reports:         () => window.loadReport?.('by_location'),
        audit_logs:      () => window.initAuditLogs?.(),
        users:           () => window.initUsers?.(),
        backup:          () => window.loadBackupList?.(),
        vendors:         () => window.initVendors?.(),
        locations:       () => window.initLocations?.(),
        process_owners:  () => window.initProcessOwners?.(),
        categories:      () => window.initCategories?.(),
    };

    for (const [fragment, fn] of Object.entries(initMap)) {
        if (url.includes(fragment)) {
            fn();
            break;
        }
    }
}

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
        !href || href.startsWith('http') ||
        href.includes('/auth/') || href.startsWith('#')
    ) return;
    
    e.preventDefault();
    navigateTo(href);
}

window.addEventListener('popstate', e => {
    const url = e.state?.url || window.location.pathname;
    navigateTo(url, false);
});

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    bindSidebarLinks();

    const jsFile = resolvePageJs(window.location.pathname);
    if (jsFile) {
        loadedScripts.add(jsFile);
    }

    const refPages = ['vendors', 'locations', 'process_owners', 'categories'];
    if (refPages.some(p => window.location.pathname.includes(p))) {
        loadedScripts.add('ref_table.js');
    }

    history.replaceState(
        { url: window.location.href }, '', window.location.href
    );
});