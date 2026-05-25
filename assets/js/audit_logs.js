// assets/js/audit_logs.js

let allAuditLogs      = [];
let filteredAuditLogs = [];
let auditCurrentPage  = 1;
let auditItemsPerPage = 50;
let auditRefData      = {};

// ─── SINGLE INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadRefData();
    fetchInitialAuditLogs();
    addBackupFilterOptions();
});

function addBackupFilterOptions() {
    const sel = document.getElementById('filter_action');
    if (!sel) {
        return;
    }
    ['BACKUP', 'RESTORE'].forEach(action => {
        const exists = Array.from(sel.options)
            .some(o => o.value === action);
        if (exists) {
            return;
        }
        const opt       = document.createElement('option');
        opt.value       = action;
        opt.textContent = action;
        sel.appendChild(opt);
    });
}

// ─── REF DATA ─────────────────────────────────────────────────────
// Does NOT use AUDIT_TABLES — fetches users directly.
async function loadRefData() {
    try {
        const res = await apiFetch(
            '/src/api/users.php?per_page=500'
        );
        auditRefData.users = res.data ?? [];
    } catch (err) {
        console.error('loadRefData error:', err);
        auditRefData.users = [];
    }
}

// ─── FETCH ────────────────────────────────────────────────────────
async function fetchInitialAuditLogs() {
    try {
        const data = await apiFetch(
            '/src/api/audit_logs.php?per_page=5000'
        );
        allAuditLogs = data.data || [];
        applyAuditFilters();
    } catch (err) {
        console.error('fetchInitialAuditLogs error:', err);
        showToast('Failed to load activity history.', 'error');
    }
}

const debouncedLoadAuditLogs = debounce(() => {
    auditCurrentPage = 1;
    applyAuditFilters();
}, 350);

// ─── FILTER ───────────────────────────────────────────────────────
function applyAuditFilters() {
    const search = (
        document.getElementById('audit_search')?.value ?? ''
    ).toLowerCase();
    const action   =
        document.getElementById('filter_action')?.value   ?? '';
    const table    =
        document.getElementById('filter_table')?.value    ?? '';
    const user     =
        document.getElementById('filter_user')?.value     ?? '';
    const dateFrom =
        document.getElementById('filter_date_from')?.value ?? '';
    const dateTo   =
        document.getElementById('filter_date_to')?.value   ?? '';

    filteredAuditLogs = allAuditLogs.filter(a => {
        const matchSearch = !search ||
            (a.username   &&
             a.username.toLowerCase().includes(search))   ||
            (a.table_name &&
             a.table_name.toLowerCase().includes(search)) ||
            (a.changes    &&
             a.changes.toLowerCase().includes(search));

        const matchAction = !action || a.action     === action;
        const matchTable  = !table  || a.table_name === table;
        const matchUser   = !user   ||
            String(a.user_id) === user;

        let matchDate = true;
        if (dateFrom) {
            matchDate = matchDate &&
                new Date(a.timestamp) >= new Date(dateFrom);
        }
        if (dateTo) {
            matchDate = matchDate &&
                new Date(a.timestamp) <=
                new Date(dateTo + 'T23:59:59');
        }

        return matchSearch && matchAction &&
               matchTable  && matchUser && matchDate;
    });

    auditCurrentPage = 1;
    renderAuditPage();
}

window.changeAuditPage = function (page) {
    auditCurrentPage = page;
    renderAuditPage();
};

function renderAuditPage() {
    const total      = filteredAuditLogs.length;
    const totalPages =
        Math.ceil(total / auditItemsPerPage) || 1;

    if (auditCurrentPage > totalPages) {
        auditCurrentPage = totalPages;
    }

    const start    = (auditCurrentPage - 1) * auditItemsPerPage;
    const pageData = filteredAuditLogs.slice(
        start, start + auditItemsPerPage
    );

    renderAuditLog(pageData);

    renderPagination(
        'audit_pagination',
        {
            page:        auditCurrentPage,
            per_page:    auditItemsPerPage,
            total,
            total_pages: totalPages,
        },
        'changeAuditPage'
    );

    const counterEl = document.getElementById('audit_counter');
    if (counterEl) {
        counterEl.textContent = total
            ? `${total} entr${total !== 1 ? 'ies' : 'y'}`
            : 'No results';
    }
}

// ─── RENDER ───────────────────────────────────────────────────────
function renderAuditLog(entries) {
    const container = document.getElementById('audit_log_list');
    if (!container) {
        return;
    }

    if (!entries.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">
                    <i class="bi bi-clock-history"></i>
                </div>
                <div class="empty-state__title">
                    No audit entries found
                </div>
                <div class="empty-state__desc">
                    Try adjusting the filters above.
                </div>
            </div>`;
        return;
    }

    container.innerHTML = entries.map(a => {
        const changes = parseChanges(a.changes);

        // Restore button — shown for UPDATE and DELETE
        // when a before state is available
        const canRestore =
            (a.action === 'UPDATE' ||
             a.action === 'DELETE') &&
            a.table_name !== 'backup'     &&
            a.table_name !== 'audit_logs' &&
            changes.before                &&
            Object.keys(changes.before).length > 0;

        const restoreBtn = canRestore
            ? `<button class="btn btn-secondary btn-sm"
                       style="font-size:11px;margin-left:6px"
                       onclick="event.stopPropagation();
                                restoreRecord(${a.id})"
                       title="Restore to previous state">
                   <i class="bi bi-arrow-counterclockwise">
                   </i>
                   Restore
               </button>`
            : '';

        return `
            <div class="audit-item">
                <div class="audit-badge audit-${a.action}">
                    ${a.action}
                </div>
                <div class="audit-body audit-body-full">
                    <div class="audit-desc"
                            style="display:flex;
                                   align-items:center;
                                   flex-wrap:wrap;gap:6px">
                        ${buildAuditDesc(a, changes)}
                        ${restoreBtn}
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

// ─── RESTORE RECORD ───────────────────────────────────────────────
function restoreRecord(auditId) {
    const log = allAuditLogs.find(a => a.id === auditId);
    if (!log) {
        showToast('Audit record not found.', 'error');
        return;
    }

    const changes = parseChanges(log.changes);
    const before  = changes.before ?? {};

    if (!Object.keys(before).length) {
        showToast('No previous state to restore.', 'error');
        return;
    }

    const label = `${log.table_name} #${log.record_id}`;

    showConfirm(
        'Restore Record',
        `Restore ${label} to its previous state? `
        + 'This will overwrite current data '
        + 'and be logged in activity history.',
        async () => {
            try {
                await apiFetch(
                    '/src/api/audit_logs.php?action=restore',
                    {
                        method: 'POST',
                        body:   JSON.stringify({
                            audit_id:   auditId,
                            table_name: log.table_name,
                            record_id:  log.record_id,
                            before,
                        }),
                    }
                );
                showToast(
                    `${label} restored successfully.`,
                    'success'
                );
                fetchInitialAuditLogs();
            } catch (err) {
                console.error('restoreRecord error:', err);
                showToast(err.message, 'error');
            }
        }
    );
}

// ─── DESCRIPTION BUILDER ─────────────────────────────────────────
function buildAuditDesc(entry, changes) {
    const user  =
        `<b>${escapeHtml(entry.username ?? 'System')}</b>`;
    const table =
        `<b>${escapeHtml(entry.table_name)}</b>`;

    if (
        entry.action === 'BACKUP' ||
        entry.action === 'RESTORE'
    ) {
        const ev   = changes.after?.event  ?? entry.action;
        const file = changes.after?.file   ?? '';
        const tbs  = changes.after?.tables ?? [];

        const evLabel = {
            backup_created:
                '🗄️ Created backup',
            restore_from_server:
                '🔁 Restored from server file',
            restore_from_upload:
                '🔁 Restored from uploaded file',
        }[ev] ?? escapeHtml(ev);

        const tbStr  = tbs.length
            ? ` (tables: ${tbs.join(', ')})` : '';
        const fileStr = file
            ? ` — <code>${escapeHtml(file)}</code>` : '';

        return `${user} ${evLabel}${fileStr}${tbStr}`;
    }

    const idStr = getRecordIdentifier(
        entry.table_name, changes, entry.record_id
    );

    if (entry.action === 'INSERT') {
        return `${user} added a new ${table} record ${idStr}`;
    }

    if (entry.action === 'DELETE') {
        return `${user} deleted ${table} ${idStr}`;
    }

    // UPDATE
    const event = changes.after?.event;
    if (event?.startsWith('restored_from_audit_')) {
        const srcId = event.replace('restored_from_audit_', '');
        return `${user} restored ${table} ${idStr} `
            + `(from audit #${srcId})`;
    }

    const afterKeys = Object.keys(changes.after ?? {});
    if (afterKeys.length) {
        const changedStr = escapeHtml(
            afterKeys.map(k => formatKey(k)).join(', ')
        );
        return `${user} updated [${changedStr}] `
            + `on ${table} ${idStr}`;
    }

    return `${user} updated ${table} ${idStr}`;
}

function parseChanges(raw) {
    if (!raw) {
        return {};
    }
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function getRecordIdentifier(table, changes, recordId) {
    const data = {
        ...(changes.before ?? {}),
        ...(changes.after  ?? {}),
    };
    const label =
        data.name          ??
        data.po_number     ??
        data.serial_number ??
        data.username      ??
        `#${recordId}`;

    return `<code>${escapeHtml(String(label))}</code>`;
}

function formatKey(key) {
    return key
        .replace(/_id$/, '')
        .replace(/_/g, ' ')
        .replace(/^\w/, c => c.toUpperCase());
}

function clearAuditFilters() {
    [
        'audit_search', 'filter_action', 'filter_table',
        'filter_user', 'filter_date_from', 'filter_date_to',
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
        }
    });
    auditCurrentPage = 1;
    applyAuditFilters();
}

function exportAuditLogs() {
    window.location.href = '/src/api/audit_logs.php?export=true';
}