// assets/js/audit_logs.js

let auditCurrentPage = 1;

document.addEventListener('DOMContentLoaded', () => loadAuditLogs(1));

async function loadAuditLogs(page = auditCurrentPage) {
    auditCurrentPage = page;

    const action = document.getElementById('filter_action')?.value ?? '';
    const tableName = document.getElementById('filter_table')?.value ?? '';

    const params = new URLSearchParams({
        page,
        per_page: 25,
        action,
        table_name: tableName,
    });

    try {
        const data = await apiFetch(`/src/api/audit_logs.php?${params}`);
        renderAuditLog(data.data);
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
                <div class="empty-state__icon">🕐</div>
                <div class="empty-state__title">No audit entries found</div>
                <div class="empty-state__desc">
                    Try adjusting the filters above.
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map(a => {
        const changes = parseChanges(a.changes);

        return `
            <div class="audit-item">
                <div class="audit-badge audit-${a.action}">${a.action}</div>
                <div class="audit-body">
                    <div class="audit-desc">
                        ${buildAuditDesc(a, changes)}
                    </div>
                    <div class="audit-meta">
                        <span>👤 ${a.username ?? 'System'}</span>
                        <span>📋 ${a.table_name}</span>
                        <span>🔑 ID: ${a.record_id}</span>
                        <span>🕐 ${formatDate(a.timestamp)}</span>
                        <span>🌐 ${a.ip_address ?? '—'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function parseChanges(changesJson) {
    if (!changesJson) {
        return {};
    }

    try {
        return typeof changesJson === 'string'
            ? JSON.parse(changesJson)
            : changesJson;
    } catch (e) {
        return {};
    }
}

function buildAuditDesc(entry, changes) {
    const user = `<b>${entry.username ?? 'System'}</b>`;
    const table = `<b>${entry.table_name}</b>`;
    const id = `<b>#${entry.record_id}</b>`;

    if (entry.action === 'INSERT') {
        return `${user} added a new record to ${table} (${id})`;
    }

    if (entry.action === 'DELETE') {
        const action = changes.after?.action ?? 'deleted';
        return `${user} ${action} record ${id} from ${table}`;
    }

    // UPDATE
    const afterKeys = Object.keys(changes.after ?? {});

    if (afterKeys.length) {
        const changed = afterKeys.join(', ');
        return `${user} updated ${changed} on ${table} record ${id}`;
    }

    return `${user} updated ${table} record ${id}`;
}
