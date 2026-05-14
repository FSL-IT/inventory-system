let csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

function getCsrfToken() {
    return csrfToken;
}

async function apiFetch(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const defaults = {
        headers: {
            ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
            'X-CSRF-Token': getCsrfToken(),
        },
    };
    const merged = {
        ...defaults,
        ...options,
        headers: { ...defaults.headers, ...(options.headers ?? {}) },
    };
    const response = await fetch(url, merged);
    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message ?? 'Request failed.');
    }

    return data;
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';

    return div.innerHTML;
}

function escapeJsArg(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ');
}

function showToast(msg, type = 'info') {
    const labelMap = {
        success: 'OK',
        error: 'Error',
        info: 'Info',
        warning: 'Warning',
    };
    const container = document.getElementById('toast_container');
    const toast = document.createElement('div');
    const label = document.createElement('span');
    const message = document.createElement('span');

    toast.className = `toast toast-${type}`;
    label.textContent = labelMap[type] ?? 'Info';
    message.textContent = msg;
    toast.append(label, message);
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast--fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

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

function globalSearch(value) {
    const path = window.location.pathname;
    const pageMap = [
        {
            match: 'assets',
            inputId: 'asset_search',
            loadFn: () => typeof loadAssets === 'function' && loadAssets(1),
        },
        {
            match: 'dashboard',
            inputId: 'asset_search',
            loadFn: () => typeof loadAssets === 'function' && loadAssets(1),
        },
        {
            match: 'purchase_orders',
            inputId: 'po_search',
            loadFn: () => typeof loadPOs === 'function' && loadPOs(1),
        },
        {
            match: 'vendors',
            inputId: 'vendor_search',
            loadFn: () => typeof loadVendors === 'function' && loadVendors(1),
        },
        {
            match: 'locations',
            inputId: 'location_search',
            loadFn: () => typeof loadLocations === 'function'
                && loadLocations(1),
        },
        {
            match: 'categories',
            inputId: 'category_search',
            loadFn: () => typeof loadCategories === 'function'
                && loadCategories(1),
        },
        {
            match: 'process_owners',
            inputId: 'owner_search',
            loadFn: () => typeof loadOwners === 'function' && loadOwners(1),
        },
        {
            match: 'audit_logs',
            inputId: 'audit_search',
            loadFn: () => typeof loadAuditLogs === 'function'
                && loadAuditLogs(1),
        },
        {
            match: 'users',
            inputId: 'user_search',
            loadFn: () => typeof loadUsers === 'function' && loadUsers(),
        },
    ];

    for (const { match, inputId, loadFn } of pageMap) {
        if (path.includes(match)) {
            const searchEl = document.getElementById(inputId);

            if (searchEl) {
                searchEl.value = value;
                loadFn();
            }

            break;
        }
    }
}

async function logoutUser() {
    try {
        await apiFetch('/src/api/auth.php', { method: 'DELETE' });
    } catch (e) {
        console.error(e);
    }

    window.location.href = '/src/views/auth/login.php';
}

function debounce(fn, delay = 350) {
    let timer;

    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function renderPagination(containerId, pagination, loadFn) {
    const container = document.getElementById(containerId);

    if (!container || !pagination) {
        return;
    }

    const { page, pages, total, per_page: perPage } = pagination;
    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    let html = `<span>${start}-${end} of ${total}</span>`;

    html += `
        <button
            class="pagination-btn"
            onclick="${loadFn}(${page - 1})"
            ${page <= 1 ? 'disabled' : ''}>
            Prev
        </button>
    `;

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
            Next
        </button>
    `;

    container.innerHTML = html;
}

function statusTag(status) {
    const classMap = {
        active: 'tag-active',
        deployed: 'tag-deployed',
        defective: 'tag-defective',
        in_repair: 'tag-repair',
        retired: 'tag-retired',
        lost: 'tag-lost',
    };
    const labelMap = {
        active: 'Active',
        deployed: 'Deployed',
        defective: 'Defective',
        in_repair: 'In Repair',
        retired: 'Retired',
        lost: 'Lost',
    };
    const cls = classMap[status] ?? '';
    const label = labelMap[status] ?? status;

    return `<span class="tag ${cls}">${escapeHtml(label)}</span>`;
}

function formatDate(dateStr) {
    if (!dateStr) {
        return '-';
    }

    return new Date(dateStr).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

document.addEventListener('DOMContentLoaded', setActiveNav);
