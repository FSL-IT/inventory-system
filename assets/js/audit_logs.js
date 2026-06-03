// assets/js/audit_logs.js

var allAuditLogs      = [];
var filteredAuditLogs = [];
var auditCurrentPage  = 1;
var auditItemsPerPage = 50;

window.initAuditLogs = async function () {
    clearAuditFilters();
    await fetchInitialAuditLogs();
};

document.addEventListener('DOMContentLoaded', async () => {
    await fetchInitialAuditLogs();
});

// ─── FETCH ────────────────────────────────────────────────────────
async function fetchInitialAuditLogs() {
    try {
        const data = await apiFetch(
            '/src/api/audit_logs.php?per_page=5000'
        );
        allAuditLogs = data.data || [];
        applyAuditFilters();
    } catch (err) {
        console.error('fetchInitialAuditLogs:', err);
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
    const action =
        document.getElementById('filter_action')?.value ?? '';
    const table  =
        document.getElementById('filter_table')?.value  ?? '';

    filteredAuditLogs = allAuditLogs.filter(a => {
        const changes = parseChanges(a.changes);

        const matchSearch = !search ||
            (a.username   &&
             a.username.toLowerCase().includes(search))   ||
            (a.table_name &&
             a.table_name.toLowerCase().includes(search)) ||
            (a.action     &&
             a.action.toLowerCase().includes(search))     ||
            (a.changes    &&
             a.changes.toLowerCase().includes(search));

        const matchAction = !action || a.action === action;
        const matchTable  = !table  || a.table_name === table;

        return matchSearch && matchAction && matchTable;
    });

    auditCurrentPage = 1;
    renderAuditPage();
}

window.changeAuditClientPage = function (page) {
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
        'changeAuditClientPage'
    );

    const counterEl = document.getElementById('audit_counter');
    if (counterEl) {
        counterEl.textContent = total
            ? `${total} entr${total !== 1 ? 'ies' : 'y'}`
            : 'No results';
    }
}

function clearAuditFilters() {
    ['audit_search', 'filter_action', 'filter_table']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
            }
        });
    auditCurrentPage = 1;
    applyAuditFilters();
}

// ─── RENDER ROWS ──────────────────────────────────────────────────
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
                    No activity found
                </div>
                <div class="empty-state__desc">
                    Try adjusting the filters above.
                </div>
            </div>`;
        return;
    }

    container.innerHTML = entries.map(a => {
        const changes = parseChanges(a.changes);

        const canRestore =
            (a.action === 'UPDATE' ||
             a.action === 'DELETE') &&
            a.table_name !== 'backup' &&
            a.table_name !== 'audit_logs' &&
            changes.before &&
            Object.keys(changes.before).length > 0;

        const restoreBtn = canRestore
            ? `<button class="btn btn-secondary btn-sm"
                       style="font-size:11px;margin-left:6px"
                       onclick="event.stopPropagation();
                                restoreRecord(${a.id})"
                       title="Restore to previous state">
                   <i class="bi bi-arrow-counterclockwise">
                   </i> Restore
               </button>`
            : '';

        // All rows are clickable to see full diff
        return `
            <div class="audit-item audit-clickable"
                    onclick="inspectAudit(${a.id})">
                <div class="audit-badge audit-${a.action}">
                    ${escapeHtml(a.action)}
                </div>
                <div class="audit-body audit-body-full">
                    <div class="audit-desc"
                            style="display:flex;
                                   align-items:center;
                                   flex-wrap:wrap;gap:6px">
                        ${buildAuditDesc(a, changes)}
                        <i class="bi bi-search
                                  audit-link-icon"></i>
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

// ─── INSPECT MODAL ────────────────────────────────────────────────
function inspectAudit(id) {
    const log = allAuditLogs.find(a => a.id === id);
    if (!log) {
        showToast('Could not load audit entry.', 'error');
        return;
    }

    const changes = parseChanges(log.changes);
    const before  = changes.before ?? {};
    const after   = changes.after  ?? {};

    const titleEl = document.getElementById('audit_modal_title');
    const bodyEl  = document.getElementById('audit_modal_body');

    if (titleEl) {
        titleEl.textContent =
            `${log.action} on ${log.table_name} #${log.record_id}`;
    }

    if (!bodyEl) {
        return;
    }

    // Build before/after diff view
    const allKeys = [
        ...new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ]),
    ].filter(k => k !== 'event');

    let diffRows = '';

    if (allKeys.length === 0) {
        // BACKUP / RESTORE events
        const ev   = after.event  ?? log.action;
        const file = after.file   ?? '—';
        const tbs  = after.tables ?? [];

        diffRows = `
            <tr>
                <td class="diff-key">Event</td>
                <td colspan="2">${escapeHtml(ev)}</td>
            </tr>
            <tr>
                <td class="diff-key">File</td>
                <td colspan="2">
                    <code>${escapeHtml(file)}</code>
                </td>
            </tr>
            ${tbs.length ? `
            <tr>
                <td class="diff-key">Tables</td>
                <td colspan="2">
                    ${escapeHtml(tbs.join(', '))}
                </td>
            </tr>` : ''}`;
    } else {
        diffRows = allKeys.map(k => {
            const bVal = before[k] ?? null;
            const aVal = after[k]  ?? null;
            const changed =
                JSON.stringify(bVal) !== JSON.stringify(aVal);

            const bCell = bVal !== null
                ? `<span>${escapeHtml(String(bVal))}</span>`
                : `<span style="color:var(--white-5)">—</span>`;

            const aCell = aVal !== null
                ? `<span class="${
                    changed ? 'diff-changed' : ''
                  }">${escapeHtml(String(aVal))}</span>`
                : `<span style="color:var(--white-5)">—</span>`;

            return `
                <tr ${changed ? 'class="diff-row-changed"' : ''}>
                    <td class="diff-key">
                        ${escapeHtml(formatKey(k))}
                    </td>
                    <td class="diff-before">${bCell}</td>
                    <td class="diff-after">${aCell}</td>
                </tr>`;
        }).join('');
    }

    bodyEl.innerHTML = `
        <div style="margin-bottom:14px;font-size:12px;
                    color:var(--white-4)">
            <strong>By:</strong>
            ${escapeHtml(log.username ?? 'System')} ·
            <strong>When:</strong>
            ${formatDate(log.timestamp)} ·
            <strong>IP:</strong>
            ${escapeHtml(log.ip_address ?? '—')}
        </div>
        <div class="table-wrapper" style="max-height:400px;
                                           overflow-y:auto">
            <table class="data-table diff-table">
                <thead>
                    <tr>
                        <th style="width:28%">Field</th>
                        <th style="width:36%">Before</th>
                        <th style="width:36%">After</th>
                    </tr>
                </thead>
                <tbody>${diffRows}</tbody>
            </table>
        </div>`;

    openModal('audit_detail');
}

// ─── RESTORE ──────────────────────────────────────────────────────
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

    showConfirm(
        'Restore Record',
        `Restore ${log.table_name} #${log.record_id} to its `
        + 'previous state? This will overwrite current data '
        + 'and be logged in Activity History.',
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
                    `${log.table_name} #${log.record_id} `
                    + 'restored successfully.',
                    'success'
                );
                fetchInitialAuditLogs();
            } catch (err) {
                console.error('restoreRecord:', err);
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

        const evLabel = {
            backup_created:
                '🗄️ Created a backup',
            restore_from_server:
                '🔁 Restored from server file',
            restore_from_upload:
                '🔁 Restored from uploaded file',
        }[ev] ?? escapeHtml(ev);

        const fileStr = file
            ? ` — <code>${escapeHtml(file)}</code>` : '';

        return `${user} ${evLabel}${fileStr}`;
    }

    const idStr = getRecordIdentifier(
        entry.table_name, changes, entry.record_id
    );

    if (entry.action === 'INSERT') {
        return `${user} added a new ${table} record ${idStr}`;
    }

    if (entry.action === 'DELETE') {
        return `${user} deleted ${table} record ${idStr}`;
    }

    const event = changes.after?.event;
    if (event?.startsWith('restored_from_audit_')) {
        const src = event.replace('restored_from_audit_', '');
        return `${user} restored ${table} ${idStr} `
            + `(from audit #${src})`;
    }

    const afterKeys = Object.keys(changes.after ?? {})
        .filter(k => k !== 'event');
    if (afterKeys.length) {
        const str = escapeHtml(
            afterKeys.map(k => formatKey(k)).join(', ')
        );
        return `${user} updated [${str}] on ${table} ${idStr}`;
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