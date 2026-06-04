// assets/js/audit_logs.js

(function () {
    let allAuditLogs      = [];
    let filteredAuditLogs = [];
    let auditCurrentPage  = 1;
    let auditItemsPerPage = 50;

    window.initAuditLogs = async function () {
        window.clearAuditFilters();
        await fetchInitialAuditLogs();
    };

    async function fetchInitialAuditLogs() {
        try {
            let url  = '/src/api/audit_logs.php?per_page=5000';
            let data = await apiFetch(url);
            allAuditLogs = data.data || [];
            applyAuditFilters();
        } catch (err) {
            showToast('Failed to load activity history.', 'error');
        }
    }

    window.debouncedLoadAuditLogs = debounce(function () {
        auditCurrentPage = 1;
        applyAuditFilters();
    }, 350);

    function applyAuditFilters() {
        let search = (
            document.getElementById('audit_search')?.value ?? ''
        ).toLowerCase();
        
        let action = document.getElementById('filter_action')?.value ?? '';
        let table  = document.getElementById('filter_table')?.value  ?? '';

        filteredAuditLogs = allAuditLogs.filter(a => {
            let changes = parseChanges(a.changes);

            let matchSearch = !search ||
                (a.username && 
                 a.username.toLowerCase().includes(search)) ||
                (a.table_name && 
                 a.table_name.toLowerCase().includes(search)) ||
                (a.action && 
                 a.action.toLowerCase().includes(search)) ||
                (a.changes && 
                 a.changes.toLowerCase().includes(search));

            let matchAction = !action || a.action === action;
            let matchTable  = !table  || a.table_name === table;

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
        let total      = filteredAuditLogs.length;
        let totalPages = Math.ceil(total / auditItemsPerPage) || 1;

        if (auditCurrentPage > totalPages) {
            auditCurrentPage = totalPages;
        }

        let start    = (auditCurrentPage - 1) * auditItemsPerPage;
        let end      = start + auditItemsPerPage;
        let pageData = filteredAuditLogs.slice(start, end);

        renderAuditLog(pageData);

        renderPagination(
            'audit_pagination',
            { 
                page: auditCurrentPage, 
                per_page: auditItemsPerPage, 
                total, 
                total_pages: totalPages 
            },
            'changeAuditClientPage'
        );

        let counterEl = document.getElementById('audit_counter');
        if (counterEl) {
            let word = total !== 1 ? 'entries' : 'entry';
            counterEl.textContent = total ? `${total} ${word}` : 'No results';
        }
    }

    window.clearAuditFilters = function () {
        let ids = ['audit_search', 'filter_action', 'filter_table'];
        ids.forEach(id => {
            let el = document.getElementById(id);
            if (el) el.value = '';
        });
        auditCurrentPage = 1;
        applyAuditFilters();
    };

    function renderAuditLog(entries) {
        let container = document.getElementById('audit_log_list');
        if (!container) return;

        if (!entries.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">
                        <i class="bi bi-clock-history"></i>
                    </div>
                    <div class="empty-state__title">No activity found</div>
                    <div class="empty-state__desc">
                        Try adjusting the filters above.
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = entries.map(a => {
            let changes = parseChanges(a.changes);

            let canRestore =
                (a.action === 'UPDATE' || a.action === 'DELETE') &&
                a.table_name !== 'backup' && 
                a.table_name !== 'audit_logs' &&
                changes.before && 
                Object.keys(changes.before).length > 0;

            let restoreBtn = canRestore
                ? `<button class="btn btn-secondary btn-sm" 
                           style="font-size:11px;margin-left:6px"
                           onclick="event.stopPropagation(); window.restoreRecord(${a.id})" 
                           title="Restore to previous state">
                       <i class="bi bi-arrow-counterclockwise"></i> Restore
                   </button>`
                : '';

            return `
                <div class="audit-item audit-clickable" 
                     onclick="window.inspectAudit(${a.id})">
                    <div class="audit-badge audit-${a.action}">
                        ${escapeHtml(a.action)}
                    </div>
                    <div class="audit-body audit-body-full">
                        <div class="audit-desc" 
                             style="display:flex;align-items:center;
                                    flex-wrap:wrap;gap:6px">
                            ${buildAuditDesc(a, changes)}
                            <i class="bi bi-search audit-link-icon"></i>
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
                                <i class="bi bi-hash"></i> ID: ${a.record_id}
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

    window.inspectAudit = function (id) {
        let log = allAuditLogs.find(a => a.id === id);
        if (!log) {
            showToast('Could not load audit entry.', 'error');
            return;
        }

        let changes = parseChanges(log.changes);
        let before  = changes.before ?? {};
        let after   = changes.after  ?? {};

        let titleEl = document.getElementById('audit_modal_title');
        let bodyEl  = document.getElementById('audit_modal_body');

        if (titleEl) {
            titleEl.textContent = 
                `${log.action} on ${log.table_name} #${log.record_id}`;
        }
        if (!bodyEl) return;

        let allKeys = [
            ...new Set([...Object.keys(before), ...Object.keys(after)])
        ].filter(k => k !== 'event');
        
        let diffRows = '';

        if (allKeys.length === 0) {
            let ev   = after.event  ?? log.action;
            let file = after.file   ?? '—';
            let tbs  = after.tables ?? [];

            diffRows = `
                <tr>
                    <td class="diff-key">Event</td>
                    <td colspan="2">${escapeHtml(ev)}</td>
                </tr>
                <tr>
                    <td class="diff-key">File</td>
                    <td colspan="2"><code>${escapeHtml(file)}</code></td>
                </tr>
                ${tbs.length ? `
                <tr>
                    <td class="diff-key">Tables</td>
                    <td colspan="2">${escapeHtml(tbs.join(', '))}</td>
                </tr>` : ''}`;
        } else {
            diffRows = allKeys.map(k => {
                let bVal = before[k] ?? null;
                let aVal = after[k]  ?? null;
                let changed = JSON.stringify(bVal) !== JSON.stringify(aVal);

                let bCell = bVal !== null 
                    ? `<span>${escapeHtml(String(bVal))}</span>` 
                    : `<span style="color:var(--white-5)">—</span>`;
                    
                let aCell = aVal !== null 
                    ? `<span class="${changed ? 'diff-changed' : ''}">
                           ${escapeHtml(String(aVal))}
                       </span>` 
                    : `<span style="color:var(--white-5)">—</span>`;

                return `
                    <tr ${changed ? 'class="diff-row-changed"' : ''}>
                        <td class="diff-key">${escapeHtml(formatKey(k))}</td>
                        <td class="diff-before">${bCell}</td>
                        <td class="diff-after">${aCell}</td>
                    </tr>`;
            }).join('');
        }

        bodyEl.innerHTML = `
            <div style="margin-bottom:14px;font-size:12px;color:var(--white-4)">
                <strong>By:</strong> ${escapeHtml(log.username ?? 'System')} ·
                <strong>When:</strong> ${formatDate(log.timestamp)} ·
                <strong>IP:</strong> ${escapeHtml(log.ip_address ?? '—')}
            </div>
            <div class="table-wrapper" 
                 style="max-height:400px;overflow-y:auto">
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

        window.openModal('audit_detail');
    };

    window.restoreRecord = function (auditId) {
        let log = allAuditLogs.find(a => a.id === auditId);
        if (!log) {
            showToast('Audit record not found.', 'error');
            return;
        }

        let changes = parseChanges(log.changes);
        let before  = changes.before ?? {};

        if (!Object.keys(before).length) {
            showToast('No previous state to restore.', 'error');
            return;
        }

        let msg = `Restore ${log.table_name} #${log.record_id} to its ` +
                  `previous state? This will overwrite current data.`;

        window.showConfirm('Restore Record', msg, async function () {
            try {
                await apiFetch('/src/api/audit_logs.php?action=restore', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        audit_id: auditId, 
                        table_name: log.table_name, 
                        record_id: log.record_id, 
                        before 
                    })
                });
                showToast(
                    `${log.table_name} #${log.record_id} restored successfully.`, 
                    'success'
                );
                fetchInitialAuditLogs();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    };

    function buildAuditDesc(entry, changes) {
        let user  = `<b>${escapeHtml(entry.username ?? 'System')}</b>`;
        let table = `<b>${escapeHtml(entry.table_name)}</b>`;

        if (entry.action === 'BACKUP' || entry.action === 'RESTORE') {
            let ev   = changes.after?.event  ?? entry.action;
            let file = changes.after?.file   ?? '';
            
            let labelMap = { 
                backup_created: '🗄️ Created a backup', 
                restore_from_server: '🔁 Restored from server', 
                restore_from_upload: '🔁 Restored from upload' 
            };
            let evLabel = labelMap[ev] ?? escapeHtml(ev);
            let fileStr = file ? ` — <code>${escapeHtml(file)}</code>` : '';
            return `${user} ${evLabel}${fileStr}`;
        }

        let idStr = getRecordIdentifier(
            entry.table_name, changes, entry.record_id
        );

        if (entry.action === 'INSERT') {
            return `${user} added a new ${table} record ${idStr}`;
        }
        if (entry.action === 'DELETE') {
            return `${user} deleted ${table} record ${idStr}`;
        }

        let event = changes.after?.event;
        if (event?.startsWith('restored_from_audit_')) {
            let src = event.replace('restored_from_audit_', '');
            return `${user} restored ${table} ${idStr} (from audit #${src})`;
        }

        let afterKeys = Object.keys(changes.after ?? {}).filter(k => k !== 'event');
        if (afterKeys.length) {
            let str = escapeHtml(afterKeys.map(k => formatKey(k)).join(', '));
            return `${user} updated [${str}] on ${table} ${idStr}`;
        }

        return `${user} updated ${table} ${idStr}`;
    }

    function parseChanges(raw) {
        if (!raw) return {};
        try { 
            return JSON.parse(raw); 
        } catch { 
            return {}; 
        }
    }

    function getRecordIdentifier(table, changes, recordId) {
        let data = { ...(changes.before ?? {}), ...(changes.after ?? {}) };
        let label = data.name 
            ?? data.po_number 
            ?? data.serial_number 
            ?? data.username 
            ?? `#${recordId}`;
            
        return `<code>${escapeHtml(String(label))}</code>`;
    }

    function formatKey(key) {
        return key
            .replace(/_id$/, '')
            .replace(/_/g, ' ')
            .replace(/^\w/, c => c.toUpperCase());
    }
})();