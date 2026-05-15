// assets/js/audit_logs.js

let auditCurrentPage = 1;
let currentAuditLogs = []; 

// Reference dictionary for human-readable IDs
const refDict = {
    categories:      {},
    locations:       {},
    vendors:         {},
    owners:          {},
    purchase_orders: {}
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadRefData();
    loadAuditLogs(1);
});

// ─── UTILITIES ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
    if (str === null || str === undefined || str === '') {
        return '—';
    }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJsStr(str) {
    if (!str) {
        return '';
    }
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ─── REFERENCE DATA LOADER ──────────────────────────────────────────────────
async function loadRefData() {
    try {
        const reqs = [
            apiFetch('/src/api/categories.php?per_page=500'),
            apiFetch('/src/api/locations.php?per_page=500'),
            apiFetch('/src/api/vendors.php?per_page=500'),
            apiFetch('/src/api/process_owners.php?per_page=500'),
            apiFetch('/src/api/purchase_orders.php?per_page=500')
        ];
        
        const safeReqs = reqs.map(p => p.catch(() => ({ data: [] })));
        const [cats, locs, vens, owns, pos] = await Promise.all(safeReqs);

        (cats.data || []).forEach(c => {
            refDict.categories[c.id] = c.name;
        });
        (locs.data || []).forEach(l => {
            refDict.locations[l.id] = l.name;
        });
        (vens.data || []).forEach(v => {
            refDict.vendors[v.id] = v.name;
        });
        (owns.data || []).forEach(o => {
            refDict.owners[o.id] = o.name;
        });
        (pos.data  || []).forEach(p => {
            refDict.purchase_orders[p.id] = p.po_number;
        });
    } catch (err) {
        console.error('Failed to load reference data:', err);
    }
}

// ─── ROUTING HANDLER ────────────────────────────────────────────────────────
function onAuditClick(action, table, rawId) {
    if (action === 'DELETE') {
        return;
    }

    const routeMap = {
        'users':           '/src/views/admin/users.php',
        'assets':          '/src/views/assets.php',
        'purchase_orders': '/src/views/purchase_orders.php',
        'categories':      '/src/views/categories.php',
        'locations':       '/src/views/locations.php',
        'vendors':         '/src/views/vendors.php'
    };

    const targetUrl = routeMap[table];

    if (!targetUrl) {
        showToast('Module link not available.', 'info');
        return;
    }

    const dest = rawId 
        ? `${targetUrl}?search=${encodeURIComponent(rawId)}` 
        : targetUrl;
        
    window.location.href = dest;
}

// ─── LOAD & RENDER ──────────────────────────────────────────────────────────
async function loadAuditLogs(page = auditCurrentPage) {
    auditCurrentPage = page;

    const actionEl = document.getElementById('filter_action');
    const tableEl  = document.getElementById('filter_table');

    const action    = actionEl?.value ?? '';
    const tableName = tableEl?.value ?? '';

    const params = new URLSearchParams({
        page:       page,
        per_page:   25,
        action:     action,
        table_name: tableName,
    });

    try {
        const data = await apiFetch(`/src/api/audit_logs.php?${params}`);
        currentAuditLogs = data.data ?? []; 
        
        renderAuditLog(currentAuditLogs);
        renderPagination(
            'audit_pagination',
            data.pagination,
            'loadAuditLogs'
        );
    } catch (err) {
        showToast('Failed to load audit logs.', 'error');
    }
}

function renderAuditLog(entries) {
    const container = document.getElementById('audit_log_list');

    if (!entries.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">
                    <i class="bi bi-clock-history"></i>
                </div>
                <div class="empty-state__title">No audit entries found</div>
                <div class="empty-state__desc">
                    Try adjusting the filters above.
                </div>
            </div>`;
        return;
    }

    container.innerHTML = entries.map(a => {
        const changes     = parseChanges(a.changes);
        const rawId       = escapeJsStr(getRawIdentifier(a.table_name, changes));
        const isClickable = a.action !== 'DELETE';
        const clickClass  = isClickable ? 'audit-clickable' : '';
        
        const clickAttr = isClickable
            ? `onclick="inspectAudit(${a.id})"`
            : '';
            
        const linkIcon = isClickable
            ? `<i class="bi bi-search audit-link-icon"></i>`
            : '';

        return `
            <div class="audit-item ${clickClass}" 
                    ${clickAttr}>
                <div class="audit-badge audit-${a.action}">${a.action}</div>
                <div class="audit-body audit-body-full">
                    <div class="audit-desc">
                        ${buildAuditDesc(a, changes)}
                        ${linkIcon}
                    </div>
                    <div class="audit-meta">
                        <span>
                            <i class="bi bi-person"></i> 
                            ${escapeHtml(a.username ?? 'System')}
                        </span>
                        <span>
                            <i class="bi bi-table"></i> 
                            ${escapeHtml(a.table_name)}
                        </span>
                        <span>
                            <i class="bi bi-hash"></i> 
                            ID: ${a.record_id}
                        </span>
                        <span>
                            <i class="bi bi-calendar3"></i> 
                            ${formatDate(a.timestamp)}
                        </span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ─── DIFF VIEWER (INSPECTOR MODAL) ──────────────────────────────────────────
function inspectAudit(id) {
    const log = currentAuditLogs.find(a => a.id === id);
    
    if (!log) {
        showToast('Log details not found in memory.', 'error');
        return;
    }

    const changes = parseChanges(log.changes);
    const bodyEl  = document.getElementById('audit_modal_body');
    const titleEl = document.getElementById('audit_modal_title');
    
    if (!bodyEl || !titleEl) {
        return;
    }
    
    titleEl.innerHTML = `
        <span class="audit-badge audit-${log.action}" 
                style="margin-right:8px; display:inline-block">
            ${log.action}
        </span>
        Activity Details
    `;

    const metaHtml = `
        <div class="audit-detail-meta">
            <div>
                <span class="diff-key">User:</span> 
                ${escapeHtml(log.username ?? 'System')}
            </div>
            <div>
                <span class="diff-key">Table:</span> 
                ${escapeHtml(log.table_name)}
            </div>
            <div>
                <span class="diff-key">Record ID:</span> 
                ${log.record_id}
            </div>
            <div>
                <span class="diff-key">Time:</span> 
                ${formatDate(log.timestamp)}
            </div>
        </div>`;

    bodyEl.innerHTML = metaHtml + buildDiffHtml(log.action, changes);
    openModal('audit_detail');
}

// ─── SMART DATA FORMATTERS ──────────────────────────────────────────────────
function getOldValue(before, key) {
    const map = {
        'serial':     'serial_number',
        'desc':       'description',
        'categoryId': 'category_id',
        'locationId': 'location_id',
        'ownerId':    'owner_id',
        'poId':       'po_id',
        'vendorId':   'vendor_id'
    };
    return before[key] ?? before[map[key]] ?? '—';
}

function formatKey(k) {
    const names = {
        'serial_number': 'Serial Number',
        'serial':        'Serial Number',
        'description':   'Description',
        'desc':          'Description',
        'category_id':   'Category',
        'categoryId':    'Category',
        'location_id':   'Location',
        'locationId':    'Location',
        'owner_id':      'Process Owner',
        'ownerId':       'Process Owner',
        'po_id':         'PO Number',
        'poId':          'PO Number',
        'vendor_id':     'Vendor',
        'vendorId':      'Vendor',
        'status':        'Status',
        'remarks':       'Remarks',
        'role':          'Role',
        'username':      'Username'
    };
    return names[k] || k.replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatVal(key, val) {
    if (val === null || val === undefined || val === '') {
        return '—';
    }
    
    const k = key.toLowerCase();
    
    if (k.includes('category')) {
        return refDict.categories[val] || val;
    }
    if (k.includes('location')) {
        return refDict.locations[val] || val;
    }
    if (k.includes('vendor')) {
        return refDict.vendors[val] || val;
    }
    if (k.includes('owner')) {
        return refDict.owners[val] || val;
    }
    if (k.includes('po_id') || k === 'poid') {
        return refDict.purchase_orders[val] || val;
    }
    
    return val;
}

// ─── DIFF HTML GENERATOR ────────────────────────────────────────────────────
function buildDiffHtml(action, changes) {
    const before = changes.before ?? {};
    const after  = changes.after ?? {};

    if (action === 'UPDATE') {
        const allKeys = Array.from(new Set([
            ...Object.keys(before),
            ...Object.keys(after)
        ]));

        if (!allKeys.length) {
            return `<div class="diff-title">No details recorded.</div>`;
        }
        
        const oldRows = allKeys.map(k => {
            const oldRaw    = getOldValue(before, k);
            const newRaw    = after[k] !== undefined ? after[k] : oldRaw;
            const isChanged = String(oldRaw) !== String(newRaw);
            
            // Assign specific row-highlight class if the value changed
            const valClass = isChanged ? 'diff-val text-red' : 'diff-val';
            const rowClass = isChanged 
                ? 'diff-row diff-row--old-changed' 
                : 'diff-row';
            
            const fKey = escapeHtml(formatKey(k));
            const fVal = escapeHtml(formatVal(k, oldRaw));
            
            return `
                <div class="${rowClass}">
                    <span class="diff-key">${fKey}</span>
                    <span class="${valClass}">${fVal}</span>
                </div>`;
        }).join('');

        const newRows = allKeys.map(k => {
            const oldRaw    = getOldValue(before, k);
            const newRaw    = after[k] !== undefined ? after[k] : oldRaw;
            const isChanged = String(oldRaw) !== String(newRaw);
            
            // Assign specific row-highlight class if the value changed
            const valClass = isChanged ? 'diff-val text-green' : 'diff-val';
            const rowClass = isChanged 
                ? 'diff-row diff-row--new-changed' 
                : 'diff-row';
            
            const fKey = escapeHtml(formatKey(k));
            const fVal = escapeHtml(formatVal(k, newRaw));
            
            return `
                <div class="${rowClass}">
                    <span class="diff-key">${fKey}</span>
                    <span class="${valClass}">${fVal}</span>
                </div>`;
        }).join('');

        return `
            <div class="diff-grid">
                <div class="diff-box diff-old">
                    <div class="diff-title">Previous Values</div>
                    ${oldRows}
                </div>
                <div class="diff-box diff-new">
                    <div class="diff-title">New Values</div>
                    ${newRows}
                </div>
            </div>`;
    }

    if (action === 'INSERT') {
        const keys = Object.keys(after);
        const rows = keys.map(k => {
            const fKey = escapeHtml(formatKey(k));
            const fVal = escapeHtml(formatVal(k, after[k]));
            
            return `
                <div class="diff-row">
                    <span class="diff-key">${fKey}</span>
                    <span class="diff-val text-green">${fVal}</span>
                </div>`;
        }).join('');

        return `
            <div class="diff-single">
                <div class="diff-box diff-new">
                    <div class="diff-title">Data Inserted</div>
                    ${rows}
                </div>
            </div>`;
    }

    if (action === 'DELETE') {
        const keys = Object.keys(before);
        const rows = keys.map(k => {
            const fKey = escapeHtml(formatKey(k));
            const fVal = escapeHtml(formatVal(k, before[k]));
            
            return `
                <div class="diff-row">
                    <span class="diff-key">${fKey}</span>
                    <span class="diff-val text-red">${fVal}</span>
                </div>`;
        }).join('');

        return `
            <div class="diff-single">
                <div class="diff-box diff-old">
                    <div class="diff-title">Data Deleted</div>
                    ${rows}
                </div>
            </div>`;
    }

    return '';
}

// ─── DATA PARSING & SENTENCE CONSTRUCTION ───────────────────────────────────
function parseChanges(changesJson) {
    if (!changesJson) {
        return {};
    }

    try {
        if (typeof changesJson === 'string') {
            return JSON.parse(changesJson);
        }
        return changesJson;
    } catch (e) {
        return {};
    }
}

function getRawIdentifier(tableName, changes) {
    const data = { ...(changes.before ?? {}), ...(changes.after ?? {}) };
    
    if (tableName === 'users') { 
        return data.username ?? ''; 
    }
    if (tableName === 'assets') { 
        return data.serial_number ?? ''; 
    }
    if (tableName === 'purchase_orders') { 
        return data.po_number ?? ''; 
    }
    
    return data.name ?? '';
}

function getRecordIdentifier(tableName, changes, recordId) {
    const data = { ...(changes.before ?? {}), ...(changes.after ?? {}) };
    let name   = '';

    if (tableName === 'users') {
        name = data.username;
    } else if (tableName === 'assets') {
        name = data.serial_number;
    } else if (tableName === 'purchase_orders') {
        name = data.po_number;
    } else {
        name = data.name; 
    }

    if (name) {
        return `'<b>${escapeHtml(name)}</b>' (ID: ${recordId})`;
    }
    
    return `record <b>#${recordId}</b>`;
}

function buildAuditDesc(entry, changes) {
    const user  = `<b>${escapeHtml(entry.username ?? 'System')}</b>`;
    const table = `<b>${escapeHtml(entry.table_name)}</b>`;
    const idStr = getRecordIdentifier(
        entry.table_name, changes, entry.record_id
    );

    if (entry.action === 'INSERT') {
        return `${user} added a new ${table} ${idStr}`;
    }

    if (entry.action === 'DELETE') {
        const action = changes.after?.action ?? 'deleted';
        return `${user} ${escapeHtml(action)} ${table} ${idStr}`;
    }

    // UPDATE
    const afterKeys = Object.keys(changes.after ?? {});

    if (afterKeys.length) {
        const changedKeys = afterKeys.map(k => formatKey(k));
        const changedStr  = escapeHtml(changedKeys.join(', '));
        return `${user} updated [${changedStr}] on ${table} ${idStr}`;
    }

    return `${user} updated ${table} ${idStr}`;
}