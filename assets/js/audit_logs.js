// assets/js/audit_logs.js

(function () {
    let allAuditLogs      = [];
    let filteredAuditLogs = [];
    let auditCurrentPage  = 1;
    let auditItemsPerPage = 50;

    const AUDIT_SKIP_FIELDS = new Set([
        'event', 'updated_at', 'created_at', 'deleted_at',
    ]);

    const AUDIT_FIELD_LABELS = {
        serial_number: 'Serial Number',
        description:   'Description',
        status:        'Status',
        po_id:         'Purchase Order',
        category_id:   'Category',
        location_id:   'Location',
        owner_id:      'Process Owner',
        remarks:       'Remarks',
        po_number:     'PO Number',
        date_endorsed: 'Date Endorsed',
        date_received: 'Date Received',
        vendor_id:     'Vendor',
        fiscal_year:   'Fiscal Year',
        username:      'Username',
        role:          'Role',
        name:          'Name',
    };

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

            let btnStr = `window.restoreRecord(${a.id})`;
            let restoreBtn = canRestore
                ? `<button class="btn btn-secondary btn-sm" 
                           style="font-size:11px;margin-left:6px"
                           onclick="event.stopPropagation(); ${btnStr}" 
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
                        <div class="audit-desc">
                            <div class="audit-desc__main">
                                ${buildAuditDesc(a, changes)}
                                <i class="bi bi-search audit-link-icon"></i>
                                ${restoreBtn}
                            </div>
                            ${buildAuditChangeChips(a, changes)}
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

        let changes      = parseChanges(log.changes);
        let before       = changes.before ?? {};
        let after        = changes.after  ?? {};
        let changedKeys  = getChangedFieldKeys(changes, log.action);
        let recordLabel  = getRecordLabel(
            log.table_name, changes, log.record_id
        );

        let titleEl = document.getElementById('audit_modal_title');
        let bodyEl  = document.getElementById('audit_modal_body');

        if (titleEl) {
            titleEl.innerHTML =
                `${formatActionLabel(log.action)} — ` +
                `${formatTableLabel(log.table_name)} ${recordLabel}`;
        }
        if (!bodyEl) return;

        let summaryHtml = buildAuditSummaryHtml(
            log.action, changedKeys, changes
        );
        let diffRows    = buildAuditDiffRows(
            log.action, before, after, changedKeys, changes
        );

        bodyEl.innerHTML = `
            <div class="audit-detail-meta">
                <span><i class="bi bi-person"></i>
                    ${escapeHtml(log.username ?? 'System')}</span>
                <span><i class="bi bi-calendar3"></i>
                    ${formatDate(log.timestamp)}</span>
                <span><i class="bi bi-globe"></i>
                    ${escapeHtml(log.ip_address ?? '—')}</span>
                <span><i class="bi bi-hash"></i>
                    Record ID ${log.record_id}</span>
            </div>
            ${summaryHtml}
            <div class="table-wrapper audit-diff-wrap">
                <table class="data-table diff-table">
                    <thead>
                        <tr>
                            <th style="width:26%">Field</th>
                            <th style="width:37%">Before</th>
                            <th style="width:37%">After</th>
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
                    `${log.table_name} #${log.record_id} restored.`, 
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

        let changed = getChangedFieldKeys(changes, entry.action);
        if (changed.length) {
            return `${user} updated ${table} ${idStr}`;
        }

        return `${user} updated ${table} ${idStr}`;
    }

    function buildAuditChangeChips(entry, changes) {
        let keys = getChangedFieldKeys(changes, entry.action);
        if (!keys.length) return '';

        let chips = keys.map(function (k) {
            let f = escapeHtml(formatKey(k));
            return `<span class="audit-change-chip">${f}</span>`;
        }).join('');

        let prefix = entry.action === 'INSERT'
            ? 'Fields set'
            : entry.action === 'DELETE'
                ? 'Removed'
                : 'Changed';

        return `
            <div class="audit-change-chips">
                <span class="audit-change-chips__label">${prefix}:</span>
                ${chips}
            </div>`;
    }

    function buildAuditSummaryHtml(action, changedKeys, changes) {
        if (!changedKeys.length) {
            let ev = changes.after?.event;
            if (ev) {
                return `
                    <div class="audit-changes-summary 
                                audit-changes-summary--info">
                        <i class="bi bi-info-circle"></i>
                        <span>${escapeHtml(String(ev))}</span>
                    </div>`;
            }
            return '';
        }

        let chips = changedKeys.map(function (k) {
            return `<span class="audit-change-chip audit-change-chip--lg">` +
                `${escapeHtml(formatKey(k))}</span>`;
        }).join('');

        let verb = action === 'INSERT'
            ? 'New record — fields created'
            : action === 'DELETE'
                ? 'Record deleted — previous values'
                : `${changedKeys.length} field` +
                  `${changedKeys.length !== 1 ? 's' : ''} changed`;

        return `
            <div class="audit-changes-summary">
                <div class="audit-changes-summary__title">${verb}</div>
                <div class="audit-change-chips">${chips}</div>
            </div>`;
    }

    function buildAuditDiffRows(action, before, after, changedKeys, changes) {
        if (action === 'BACKUP' || action === 'RESTORE') {
            let ev   = changes.after?.event  ?? action;
            let file = changes.after?.file   ?? '—';
            let tbs  = changes.after?.tables ?? [];
            return `
                <tr class="diff-row-changed">
                    <td class="diff-key">Event</td>
                    <td class="diff-before">—</td>
                    <td class="diff-after diff-cell--new">
                        ${escapeHtml(String(ev))}</td>
                </tr>
                <tr class="diff-row-changed">
                    <td class="diff-key">File</td>
                    <td class="diff-before">—</td>
                    <td class="diff-after diff-cell--new">
                        <code>${escapeHtml(String(file))}</code></td>
                </tr>
                ${tbs.length ? `
                <tr class="diff-row-changed">
                    <td class="diff-key">Tables</td>
                    <td class="diff-before">—</td>
                    <td class="diff-after diff-cell--new">
                        ${escapeHtml(tbs.join(', '))}</td>
                </tr>` : ''}`;
        }

        let allKeys = [
            ...new Set([...Object.keys(before), ...Object.keys(after)]),
        ].filter(function (k) {
            return !AUDIT_SKIP_FIELDS.has(k);
        });

        if (!allKeys.length) {
            return `
                <tr>
                    <td colspan="3" class="audit-diff-empty">
                        No field-level details recorded for this entry.
                    </td>
                </tr>`;
        }

        let sorted = allKeys.slice().sort(function (a, b) {
            let aChanged = changedKeys.includes(a) ? 0 : 1;
            let bChanged = changedKeys.includes(b) ? 0 : 1;
            if (aChanged !== bChanged) return aChanged - bChanged;
            return formatKey(a).localeCompare(formatKey(b));
        });

        return sorted.map(function (k) {
            let bVal    = before[k] ?? null;
            let aVal    = after[k]  ?? null;
            let changed = changedKeys.includes(k);

            let bCell = formatDiffValue(bVal, changed, 'old');
            let aCell = formatDiffValue(aVal, changed, 'new');
            let rCls  = changed ? 'diff-row-changed' : 'diff-row-unchanged';
            let iCls  = '<i class="bi bi-pencil-fill diff-key__icon"></i> ';

            return `
                <tr class="${rCls}">
                    <td class="diff-key">
                        ${changed ? iCls : ''}
                        ${escapeHtml(formatKey(k))}
                    </td>
                    <td class="diff-before ${changed ? 'diff-cell--old' : ''}">
                        ${bCell}</td>
                    <td class="diff-after ${changed ? 'diff-cell--new' : ''}">
                        ${aCell}</td>
                </tr>`;
        }).join('');
    }

    function formatDiffValue(val, changed, side) {
        if (val === null || val === undefined || val === '') {
            return '<span class="diff-empty">—</span>';
        }
        let cls = changed
            ? (side === 'old' ? 'diff-val diff-val--old' : 'diff-val diff-val--new')
            : 'diff-val';
        return `<span class="${cls}">${escapeHtml(String(val))}</span>`;
    }

    function getChangedFieldKeys(changes, action) {
        let before = changes.before ?? {};
        let after  = changes.after  ?? {};
        let keys   = [...new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ])].filter(function (k) {
            return !AUDIT_SKIP_FIELDS.has(k);
        });

        if (action === 'INSERT') {
            return keys.filter(function (k) {
                let v = after[k];
                return v !== null && v !== undefined && v !== '';
            });
        }
        if (action === 'DELETE') {
            return keys.filter(function (k) {
                let v = before[k];
                return v !== null && v !== undefined && v !== '';
            });
        }

        return keys.filter(function (k) {
            return JSON.stringify(before[k] ?? null)
                !== JSON.stringify(after[k] ?? null);
        });
    }

    function getRecordLabel(table, changes, recordId) {
        let data  = { ...(changes.before ?? {}), ...(changes.after ?? {}) };
        let label = data.serial_number
            ?? data.po_number
            ?? data.name
            ?? data.username
            ?? `#${recordId}`;
        return `<code>${escapeHtml(String(label))}</code>`;
    }

    function formatActionLabel(action) {
        let map = {
            INSERT: 'Created',
            UPDATE: 'Updated',
            DELETE: 'Deleted',
            BACKUP: 'Backup',
            RESTORE: 'Restore',
        };
        return map[action] ?? action;
    }

    function formatTableLabel(table) {
        let map = {
            assets:          'Asset',
            purchase_orders: 'Purchase Order',
            categories:      'Category',
            locations:       'Location',
            process_owners:  'Process Owner',
            vendors:         'Vendor',
            users:           'User',
        };
        return map[table] ?? table;
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
        if (AUDIT_FIELD_LABELS[key]) {
            return AUDIT_FIELD_LABELS[key];
        }
        return key
            .replace(/_id$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
})();