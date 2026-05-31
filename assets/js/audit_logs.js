// assets/js/audit_logs.js

var allAuditLogs      = [];
var filteredAuditLogs = [];
var auditCurrentPage  = 1;
var auditItemsPerPage = 25;

var refDict = {
    categories:      {},
    locations:       {},
    vendors:         {},
    owners:          {},
    purchase_orders: {}
};

var debouncedLoadAuditLogs = debounce(() => {
    auditCurrentPage = 1;
    applyClientAuditFilters();
}, 350);


window.initAuditLogs = async function() {
    await loadRefData();
    fetchInitialAuditLogs();
    
    const sel = document.getElementById('filter_action');
    if (sel) {
        ['BACKUP', 'RESTORE'].forEach(action => {
            const exists = Array.from(sel.options).some(o => o.value === action);
            if (exists) return;
            const opt = document.createElement('option');
            opt.value = action;
            opt.textContent = action;
            sel.appendChild(opt);
        });
    }
};

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

        (cats.data || []).forEach(c => refDict.categories[c.id] = c.name);
        (locs.data || []).forEach(l => refDict.locations[l.id] = l.name);
        (vens.data || []).forEach(v => refDict.vendors[v.id] = v.name);
        (owns.data || []).forEach(o => refDict.owners[o.id] = o.name);
        (pos.data  || []).forEach(p => refDict.purchase_orders[p.id] = p.po_number);
    } catch (err) {
        console.error('Failed to load reference data:', err);
    }
}

async function fetchInitialAuditLogs() {
    const container = document.getElementById('audit_log_list');
    if(!container) return; // SAFEGUARD

    container.innerHTML = `
        <p class="text-center py-4" style="color:var(--white-4)">
            <i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite"></i>
            Loading audit history...
        </p>`;

    try {
        const data = await apiFetch(`/src/api/audit_logs.php?per_page=5000`);
        allAuditLogs = data.data ?? []; 
        applyClientAuditFilters();
    } catch (err) {
        showToast('Failed to load audit logs from server.', 'error');
    }
}

function applyClientAuditFilters() {
    const actionEl = document.getElementById('filter_action');
    const tableEl  = document.getElementById('filter_table');

    const action    = actionEl?.value ?? '';
    const tableName = tableEl?.value ?? '';

    filteredAuditLogs = allAuditLogs.filter(log => {
        const matchAction = !action    || log.action === action;
        const matchTable  = !tableName || log.table_name === tableName;
        return matchAction && matchTable;
    });

    renderCurrentAuditPage();
}

window.changeAuditClientPage = function(page) {
    auditCurrentPage = page;
    renderCurrentAuditPage();
};

function renderCurrentAuditPage() {
    const totalItems = filteredAuditLogs.length;
    const totalPages = Math.ceil(totalItems / auditItemsPerPage) || 1;
    
    if (auditCurrentPage > totalPages) {
        auditCurrentPage = totalPages;
    }

    const startIdx = (auditCurrentPage - 1) * auditItemsPerPage;
    const pageData = filteredAuditLogs.slice(startIdx, startIdx + auditItemsPerPage);

    renderAuditLog(pageData);

    const mockPg = {
        page:        auditCurrentPage,
        per_page:    auditItemsPerPage,
        total:       totalItems,
        total_pages: totalPages
    };

    renderPagination('audit_pagination', mockPg, 'changeAuditClientPage');
}

function renderAuditLog(entries) {
    const container = document.getElementById('audit_log_list');
    if (!container) return; // SAFEGUARD
 
    if (!entries.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon"><i class="bi bi-clock-history"></i></div>
                <div class="empty-state__title">No audit entries found</div>
                <div class="empty-state__desc">Try adjusting the filters above.</div>
            </div>`;
        return;
    }
 
    container.innerHTML = entries.map(a => {
        const changes      = parseChanges(a.changes);
        const isClickable  = a.action !== 'DELETE';
        const clickClass   = isClickable ? 'audit-clickable' : '';
        const clickAttr    = isClickable ? `onclick="inspectAudit(${a.id})"` : '';
        const linkIcon = isClickable ? `<i class="bi bi-search audit-link-icon"></i>` : '';
 
        const canRestore = (a.action === 'UPDATE' || a.action === 'DELETE') &&
            a.table_name !== 'backup' && changes.before && Object.keys(changes.before).length > 0;
 
        const restoreBtn = canRestore ? `
            <button class="btn btn-secondary btn-sm" style="margin-left:8px;font-size:11px"
                onclick="event.stopPropagation(); restoreRecord(${a.id})" title="Restore to previous state">
                <i class="bi bi-arrow-counterclockwise"></i> Restore
            </button>` : '';
 
        return `
            <div class="audit-item ${clickClass}" ${clickAttr}>
                <div class="audit-badge audit-${a.action}">${a.action}</div>
                <div class="audit-body audit-body-full">
                    <div class="audit-desc" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
                        ${buildAuditDesc(a, changes)}
                        ${linkIcon}
                        ${restoreBtn}
                    </div>
                    <div class="audit-meta">
                        <span><i class="bi bi-person"></i> ${escapeHtml(a.username ?? 'System')}</span>
                        <span><i class="bi bi-table"></i> ${escapeHtml(a.table_name)}</span>
                        <span><i class="bi bi-hash"></i> ID: ${a.record_id}</span>
                        <span><i class="bi bi-calendar3"></i> ${formatDate(a.timestamp)}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function restoreRecord(auditId) {
    const log = allAuditLogs.find(a => a.id === auditId);
    if (!log) { showToast('Audit record not found.', 'error'); return; }
 
    const changes = parseChanges(log.changes);
    const before  = changes.before ?? {};
 
    if (!Object.keys(before).length) {
        showToast('No previous state to restore.', 'error');
        return;
    }
 
    const label = `${log.table_name} #${log.record_id}`;
    showConfirm('Restore Record', `Restore ${label} to its previous state? This will overwrite current data and be logged.`, async () => {
        try {
            const res = await apiFetch('/src/api/audit_logs.php?action=restore', {
                method: 'POST',
                body:   JSON.stringify({ audit_id: auditId, table_name: log.table_name, record_id: log.record_id, before: before })
            });
            showToast(`${label} restored successfully.`, 'success');
            fetchInitialAuditLogs();
        } catch (err) {
            console.error('restoreRecord error:', err);
            showToast(err.message, 'error');
        }
    });
}

function inspectAudit(id) {
    const log = allAuditLogs.find(a => a.id === id);
    if (!log) { showToast('Log details not found in memory.', 'error'); return; }

    const changes = parseChanges(log.changes);
    const bodyEl  = document.getElementById('audit_modal_body');
    const titleEl = document.getElementById('audit_modal_title');
    if (!bodyEl || !titleEl) return;
    
    titleEl.innerHTML = `<span class="audit-badge audit-${log.action}" style="margin-right:8px; display:inline-block">${log.action}</span> Activity Details`;

    const metaHtml = `
        <div class="audit-detail-meta">
            <div><span class="diff-key">User:</span> ${escapeHtml(log.username ?? 'System')}</div>
            <div><span class="diff-key">Table:</span> ${escapeHtml(log.table_name)}</div>
            <div><span class="diff-key">Record ID:</span> ${log.record_id}</div>
            <div><span class="diff-key">Time:</span> ${formatDate(log.timestamp)}</div>
        </div>`;

    bodyEl.innerHTML = metaHtml + buildDiffHtml(log.action, changes);
    openModal('audit_detail');
}

function getOldValue(before, key) {
    const map = {
        'serial': 'serial_number', 'desc': 'description', 'categoryId': 'category_id',
        'locationId': 'location_id', 'ownerId': 'owner_id', 'poId': 'po_id', 'vendorId': 'vendor_id'
    };
    return before[key] ?? before[map[key]] ?? '—';
}

function formatKey(k) {
    const names = {
        'serial_number': 'Serial Number', 'serial': 'Serial Number', 'description': 'Description', 'desc': 'Description',
        'category_id': 'Category', 'categoryId': 'Category', 'location_id': 'Location', 'locationId': 'Location',
        'owner_id': 'Process Owner', 'ownerId': 'Process Owner', 'po_id': 'PO Number', 'poId': 'PO Number',
        'vendor_id': 'Vendor', 'vendorId': 'Vendor', 'status': 'Status', 'remarks': 'Remarks', 'role': 'Role', 'username': 'Username'
    };
    return names[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatVal(key, val) {
    if (val === null || val === undefined || val === '') return '—';
    const k = key.toLowerCase();
    
    if (k.includes('category')) return refDict.categories[val] || val;
    if (k.includes('location')) return refDict.locations[val] || val;
    if (k.includes('vendor')) return refDict.vendors[val] || val;
    if (k.includes('owner')) return refDict.owners[val] || val;
    if (k.includes('po_id') || k === 'poid') return refDict.purchase_orders[val] || val;
    return val;
}

function buildDiffHtml(action, changes) {
    const before = changes.before ?? {};
    const after  = changes.after ?? {};

    if (action === 'UPDATE') {
        const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
        if (!allKeys.length) return `<div class="diff-title">No details recorded.</div>`;
        
        const oldRows = allKeys.map(k => {
            const oldRaw = getOldValue(before, k);
            const newRaw = after[k] !== undefined ? after[k] : oldRaw;
            const isChanged = String(oldRaw) !== String(newRaw);
            const valClass = isChanged ? 'diff-val text-red' : 'diff-val';
            const rowClass = isChanged ? 'diff-row diff-row--old-changed' : 'diff-row';
            return `<div class="${rowClass}"><span class="diff-key">${escapeHtml(formatKey(k))}</span><span class="${valClass}">${escapeHtml(formatVal(k, oldRaw))}</span></div>`;
        }).join('');

        const newRows = allKeys.map(k => {
            const oldRaw = getOldValue(before, k);
            const newRaw = after[k] !== undefined ? after[k] : oldRaw;
            const isChanged = String(oldRaw) !== String(newRaw);
            const valClass = isChanged ? 'diff-val text-green' : 'diff-val';
            const rowClass = isChanged ? 'diff-row diff-row--new-changed' : 'diff-row';
            return `<div class="${rowClass}"><span class="diff-key">${escapeHtml(formatKey(k))}</span><span class="${valClass}">${escapeHtml(formatVal(k, newRaw))}</span></div>`;
        }).join('');

        return `<div class="diff-grid"><div class="diff-box diff-old"><div class="diff-title">Previous Values</div>${oldRows}</div><div class="diff-box diff-new"><div class="diff-title">New Values</div>${newRows}</div></div>`;
    }

    if (action === 'INSERT') {
        const keys = Object.keys(after);
        const rows = keys.map(k => `<div class="diff-row"><span class="diff-key">${escapeHtml(formatKey(k))}</span><span class="diff-val text-green">${escapeHtml(formatVal(k, after[k]))}</span></div>`).join('');
        return `<div class="diff-single"><div class="diff-box diff-new"><div class="diff-title">Data Inserted</div>${rows}</div></div>`;
    }

    if (action === 'DELETE') {
        const keys = Object.keys(before);
        const rows = keys.map(k => `<div class="diff-row"><span class="diff-key">${escapeHtml(formatKey(k))}</span><span class="diff-val text-red">${escapeHtml(formatVal(k, before[k]))}</span></div>`).join('');
        return `<div class="diff-single"><div class="diff-box diff-old"><div class="diff-title">Data Deleted</div>${rows}</div></div>`;
    }

    return '';
}

function parseChanges(changesJson) {
    if (!changesJson) return {};
    try { return typeof changesJson === 'string' ? JSON.parse(changesJson) : changesJson; } catch (e) { return {}; }
}

function getRecordIdentifier(tableName, changes, recordId) {
    const data = { ...(changes.before ?? {}), ...(changes.after ?? {}) };
    let name = tableName === 'users' ? data.username : tableName === 'assets' ? data.serial_number : tableName === 'purchase_orders' ? data.po_number : data.name;
    return name ? `'<b>${escapeHtml(name)}</b>' (ID: ${recordId})` : `record <b>#${recordId}</b>`;
}

function buildAuditDesc(entry, changes) {
    const user  = `<b>${escapeHtml(entry.username ?? 'System')}</b>`;
    const table = `<b>${escapeHtml(entry.table_name)}</b>`;

    if (entry.action === 'BACKUP' || entry.action === 'RESTORE') {
        const ev = changes.after?.event ?? entry.action;
        const file = changes.after?.file ?? '';
        const tbs = changes.after?.tables ?? [];
        const evLabel = { 'backup_created': '🗄️ Created backup', 'restore_from_server': '🔁 Restored from server file', 'restore_from_upload': '🔁 Restored from uploaded file' }[ev] ?? ev;
        const tbStr = tbs.length ? ` (tables: ${tbs.join(', ')})` : '';
        const fileStr = file ? ` — <code>${escapeHtml(file)}</code>` : '';
        return `${user} ${evLabel}${fileStr}${tbStr}`;
    }

    const idStr = getRecordIdentifier(entry.table_name, changes, entry.record_id);

    if (entry.action === 'INSERT') return `${user} added a new ${table} ${idStr}`;
    if (entry.action === 'DELETE') return `${user} ${escapeHtml(changes.after?.action ?? 'deleted')} ${table} ${idStr}`;

    const afterKeys = Object.keys(changes.after ?? {});
    if (afterKeys.length) {
        return `${user} updated [${escapeHtml(afterKeys.map(k => formatKey(k)).join(', '))}] on ${table} ${idStr}`;
    }

    return `${user} updated ${table} ${idStr}`;
}

function exportAuditToExcel() {
    const actionEl = document.getElementById('filter_action');
    const tableEl  = document.getElementById('filter_table');
    const params = new URLSearchParams({ action: actionEl?.value ?? '', table_name: tableEl?.value ?? '', export: true });
    window.location.href = `/src/api/audit_logs.php?${params}`;
}