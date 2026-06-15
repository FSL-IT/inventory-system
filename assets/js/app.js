// assets/js/app.js
// Global utilities + Dynamic Content Loading (SPA navigation)

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';

function getCsrfToken() {
    return csrfToken;
}

// ─── API FETCH & ERROR HANDLING ───────────────────────────────────
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
        headers: {
            ...defaults.headers,
            ...(options.headers ?? {}),
        },
    };

    const response = await fetch(url, merged);
    const data     = await response.json();

    if (!data.success) {
        // Translate SQL errors to user-friendly messages
        let errorMsg = data.message ?? 'Request failed.';
        if (errorMsg.includes('Duplicate entry')) {
            errorMsg = 'A record with this information already exists.';
        } else if (errorMsg.includes('foreign key constraint')) {
            errorMsg = 'Cannot delete this record because it is being used elsewhere.';
        }
        throw new Error(errorMsg);
    }

    return data;
}

// ─── GLOBAL FORM VALIDATOR & LOADER ───────────────────────────────
async function submitFormWithValidation(formId, apiEndpoint, btnId, onSuccess) {
    let form      = document.getElementById(formId);
    let submitBtn = document.getElementById(btnId);
    
    if (!form || !submitBtn) {
        return;
    }
    
    // Clear previous highlights
    let fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(field => field.classList.remove('error-highlight'));

    if (!form.checkValidity()) {
        showToast('Please fill all required fields.', 'error');
        
        // Highlight empty required fields
        fields.forEach(field => {
            if (!field.validity.valid) {
                field.classList.add('error-highlight');
            }
        });
        return;
    }

    let originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled  = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';

    let formData = new FormData(form);

    try {
        let response = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData,
            headers: { 'X-CSRF-Token': getCsrfToken() }
        });
        
        let json = await response.json();
        
        if (!json.success) {
            let errorMsg = json.message || 'Validation failed.';
            if (errorMsg.includes('Duplicate entry')) {
                errorMsg = 'This record already exists.';
            }
            throw new Error(errorMsg);
        }
        
        showToast('Operation successful.', 'success');
        if (typeof onSuccess === 'function') {
            onSuccess();
        }
    } catch (error) {
        showToast(error.message || 'A system error occurred.', 'error');
    } finally {
        submitBtn.disabled  = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ─── GLOBAL DOM UTILITIES ─────────────────────────────────────────
function getVal(id) {
    return document.getElementById(id)?.value.trim() ?? '';
}

function safeSetVal(id, val) {
    let el = document.getElementById(id);
    if (el) el.value = val;
}

function safeSetText(id, text) {
    let el = document.getElementById(id);
    if (el) el.textContent = text;
}

function toggleClass(id, className, force) {
    let el = document.getElementById(id);
    if (el) el.classList.toggle(className, force);
}

function escapeJsStr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ─── TOAST ────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    let iconMap = {
        success: '✅', error: '❌',
        info: 'ℹ️',   warning: '⚠️',
    };

    let container = document.getElementById('toast_container');
    if (!container) return;

    let toast = document.createElement('div');
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
    let map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#039;',
    };
    return String(str ?? '').replace(/[&<>"']/g, c => map[c]);
}

// ─── SIDEBAR TOGGLE ───────────────────────────────────────────────
function toggleSidebar() {
    let sidebar = document.getElementById('sidebar');
    let overlay = document.querySelector('.sidebar-overlay');

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
    document.getElementById('sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('open');
}

// ─── ACTIVE NAV ───────────────────────────────────────────────────
function setActiveNav(path) {
    let currentPath = path || window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        let href = item.getAttribute('href') ?? '';
        if (href.length > 1 && currentPath.includes(href)) {
            item.classList.add('active');
        }
    });
}

async function logoutUser() {
    try {
        await apiFetch('/src/api/auth.php', { method: 'DELETE' });
    } catch {
        // Continue to redirect
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

// ─── PAGINATION ───────────────────────────────────────────────────
function renderPagination(containerId, pagination, loadFn) {
    let container = document.getElementById(containerId);
    if (!container || !pagination) return;

    let { page, total, per_page } = pagination;
    let totalPages = pagination.pages || pagination.total_pages || 1;

    if (!total) {
        container.innerHTML = '';
        return;
    }

    let start = (page - 1) * per_page + 1;
    let end   = Math.min(page * per_page, total);
    let html  = `<span>${start}–${end} of ${total}</span>`;

    html += `
        <button type="button" class="pagination-btn"
                onclick="${loadFn}(${page - 1})"
                ${page <= 1 ? 'disabled' : ''}>
            ‹ Prev
        </button>`;

    let startPage = Math.max(1, page - 2);
    let endPage   = Math.min(totalPages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button type="button"
                    class="pagination-btn ${i === page ? 'active' : ''}"
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

function statusTag(status) {
    let classMap = {
        active:    'tag-active',   deployed:  'tag-deployed',
        defective: 'tag-defective',in_repair: 'tag-repair',
        retired:   'tag-retired',  lost:      'tag-lost',
    };
    let labelMap = {
        active:    '✓ Active',    deployed:  '→ Deployed',
        defective: '✗ Defective', in_repair: '🔧 In Repair',
        retired:   '— Retired',   lost:      '? Lost',
    };
    let cls = classMap[status] ?? '';
    let lbl = labelMap[status] ?? escapeHtml(status);
    return `<span class="tag ${cls}">${lbl}</span>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

// ─── TOPBAR GLOBAL SEARCH (per-page handler) ─────────────────────
let globalSearchHandler = null;

window.registerGlobalSearch = function (fn) {
    globalSearchHandler = typeof fn === 'function' ? fn : null;
};

window.globalSearch = function (term) {
    if (globalSearchHandler) {
        globalSearchHandler(term);
    }
};

window.appNavigate = function (url) {
    if (typeof navigateTo === 'function') {
        navigateTo(url);
    } else {
        window.location.href = url;
    }
};

// ─── SPA ROUTING ──────────────────────────────────────────────────
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

    if (typeof window.closeActiveSearchableSelect === 'function') {
        window.closeActiveSearchableSelect();
    }
    registerGlobalSearch(null);

    let mainEl = document.getElementById('main_content');
    if (!mainEl) {
        window.location.href = url;
        return;
    }

    mainEl.classList.add('page-loading');

    try {
        let res = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let html = await res.text();
        let doc  = new DOMParser().parseFromString(html, 'text/html');
        let newMain = doc.getElementById('main_content');

        if (!newMain) {
            window.location.href = url;
            return;
        }

        let newCsrf = doc.querySelector('meta[name="csrf-token"]');
        if (newCsrf) {
            let meta = document.querySelector('meta[name="csrf-token"]');
            if (meta) meta.content = newCsrf.content;
        }

        mainEl.innerHTML = newMain.innerHTML;
        mainEl.classList.remove('page-loading');

        if (pushState) {
            history.pushState({ url }, '', url);
        }

        let newTitle = doc.querySelector('title');
        if (newTitle) document.title = newTitle.textContent;

        newMain.querySelectorAll('script:not([src])').forEach(s => {
            try {
                new Function(s.textContent)();
            } catch (e) {}
        });

        await loadPageScript(url);
        if (typeof window.initAllSearchableSelects === 'function') {
            window.initAllSearchableSelects();
        }
        setTimeout(() => initPageModule(url), 20);

    } catch (err) {
        mainEl.classList.remove('page-loading');
        window.location.href = url;
    }
}

async function injectScript(src) {
    let existing = Array.from(document.querySelectorAll('script'))
        .find(s => s.src.includes(src));
        
    if (existing) {
        return Promise.resolve();
    }
    
    return new Promise(resolve => {
        let script     = document.createElement('script');
        script.src     = src;
        script.onload  = resolve;
        script.onerror = resolve; 
        document.head.appendChild(script);
    });
}

async function loadPageScript(url) {
    let refPages = ['vendors', 'locations', 'process_owners', 'categories'];
    
    if (refPages.some(p => url.includes(p))) {
        if (!loadedScripts.has('ref_table.js')) {
            await injectScript('/assets/js/ref_table.js');
            loadedScripts.add('ref_table.js');
        }
    }

    let jsFile = resolvePageJs(url);
    if (!jsFile || loadedScripts.has(jsFile)) {
        return;
    }

    await injectScript(`/assets/js/${jsFile}`);
    loadedScripts.add(jsFile);
}

function resolvePageJs(url) {
    for (let [fragment, file] of Object.entries(PAGE_JS_MAP)) {
        if (url.includes(fragment)) return file;
    }
    return null;
}

function initPageModule(url) {
    setActiveNav(url);
    let initMap = {
        dashboard:       () => window.loadDashboard?.(),
        assets:          () => window.initAssets?.(),
        purchase_orders: () => window.initPOs?.(),
        reports:         () => window.loadReport?.('by_location'),
        audit_logs:      () => window.initAuditLogs?.(),
        users:           () => window.initUsers?.(),
        backup:          () => window.initBackup?.(),
        vendors:         () => window.initVendors?.(),
        locations:       () => window.initLocations?.(),
        process_owners:  () => window.initProcessOwners?.(),
        categories:      () => window.initCategories?.(),
    };

    for (let [fragment, fn] of Object.entries(initMap)) {
        if (url.includes(fragment)) {
            fn();
            break;
        }
    }
}

function bindSidebarLinks() {
    document.querySelectorAll('.nav-item[href]').forEach(link => {
        link.removeEventListener('click', handleNavClick);
        link.addEventListener('click', handleNavClick);
    });
}

function handleNavClick(e) {
    let href = this.getAttribute('href');
    if (!href || href.startsWith('http') || href.includes('/auth/') || href.startsWith('#')) return;
    
    e.preventDefault();
    navigateTo(href);
}

window.addEventListener('popstate', e => {
    let url = e.state?.url || window.location.pathname;
    navigateTo(url, false);
});

document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    bindSidebarLinks();

    let jsFile = resolvePageJs(window.location.pathname);
    if (jsFile) loadedScripts.add(jsFile);

    let refPages = ['vendors', 'locations', 'process_owners', 'categories'];
    if (refPages.some(p => window.location.pathname.includes(p))) {
        loadedScripts.add('ref_table.js');
    }

    history.replaceState({ url: window.location.href }, '', window.location.href);

    setTimeout(function () {
        if (typeof window.initAllSearchableSelects === 'function') {
            window.initAllSearchableSelects();
        }
        initPageModule(window.location.pathname);
    }, 0);
});


window.showImportStep = function(step) {
    const steps = ['upload', 'progress', 'results'];
    steps.forEach(s => {
        let el = document.getElementById('import_step_' + s);
        if (el) el.style.display = (s === step) ? 'block' : 'none';
    });
    let footer = document.getElementById('import_modal_footer');
    if (footer) {
        footer.style.display = (step === 'progress') ? 'none' : 'flex';
    }
};

window.setImportTab = function(tab) {
    window.currentImportType = tab;
    
    let tabPo = document.getElementById('fmt_tab_po');
    let tabFlat = document.getElementById('fmt_tab_flat');
    if(tabPo) {
        tabPo.classList.toggle('btn-primary', tab === 'po');
        tabPo.classList.toggle('btn-secondary', tab !== 'po');
    }
    if(tabFlat) {
        tabFlat.classList.toggle('btn-primary', tab === 'flat');
        tabFlat.classList.toggle('btn-secondary', tab !== 'flat');
    }

    let infoPo = document.getElementById('fmt_info_po');
    let infoFlat = document.getElementById('fmt_info_flat');
    if(infoPo) infoPo.style.display = (tab === 'po') ? 'flex' : 'none';
    if(infoFlat) infoFlat.style.display = (tab === 'flat') ? 'flex' : 'none';

    let dlBtn = document.getElementById('btn_download_template');
    if (dlBtn) {
        if (tab === 'po') {
            dlBtn.href = '/src/api/import_export.php?action=template_po';
        } else {
            dlBtn.href = '/src/api/import_export.php?action=template';
        }
    }
};

window.onImportFileSelected = function(input) {
    let file = input.files && input.files[0];
    updateImportFileLabel(file);
};

window.updateImportFileLabel = function(file) {
    let label = document.getElementById('import_zone_label');
    let submitBtn = document.getElementById('import_submit_btn');
    
    if (file && label) {
        if(!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            showToast('Invalid file format. Please upload an Excel (.xlsx) file.', 'error');
            submitBtn.disabled = true;
            label.textContent = 'Invalid file type selected';
            return;
        }
        label.textContent = file.name;
        if(submitBtn) submitBtn.disabled = false;
    } else if (label) {
        label.textContent = 'Drop your .xlsx file here';
        if(submitBtn) submitBtn.disabled = true;
    }
};

window.renderImportResults = function(data) {
    let body = document.getElementById('import_results_body');
    if (!body) return;
    
    let successCount = data.success || 0;
    let errors = data.errors || [];
    
    let html = `
        <div style="text-align:center; padding: 20px 0;">
            <div style="font-size: 48px; margin-bottom: 12px;">
                ${successCount > 0 ? '✅' : '⚠️'}
            </div>
            <h3 style="margin-bottom: 8px;">Import Processed</h3>
            <p>Successfully imported <strong>${successCount}</strong> records.</p>
        </div>
    `;
    
    if (errors.length > 0) {
        html += `
            <div style="background: rgba(255, 60, 60, 0.05); border: 1px solid 
            rgba(255, 60, 60, 0.2); padding: 12px; border-radius: 6px; margin-top: 
            15px; max-height: 200px; overflow-y: auto; text-align: left;">
                <h4 style="color: var(--red); margin-bottom: 8px; font-size: 14px;">
                <i class="bi bi-exclamation-triangle"></i> Errors encountered:</h4>
                <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; 
                color: var(--white-3);">
                    ${errors.map(err => `<li style="margin-bottom: 6px; border-bottom: 
                        1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                        ❌ ${escapeHtml(err)}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    body.innerHTML = html;
};

document.addEventListener('DOMContentLoaded', () => {
    let dropZone = document.getElementById('import_drop_zone');
    let fileInput = document.getElementById('import_file');
    
    if(dropZone && fileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.opacity = '0.5', false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.style.opacity = '1', false);
        });

        dropZone.addEventListener('drop', function(e) {
            let dt = e.dataTransfer;
            let files = dt.files;
            if (files.length > 0) {
                fileInput.files = files;
                updateImportFileLabel(files[0]);
            }
        }, false);
    }
});