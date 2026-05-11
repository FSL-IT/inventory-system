// assets/js/dashboard.js

document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
    try {
        const data = await apiFetch('/src/api/dashboard.php');
        const stats = data.data;

        renderStatCards(stats);
        renderCategoryBreakdown(stats.by_category);
        renderStatusBreakdown(stats.by_status, stats.total_assets);
        renderInsights(stats);
        renderRecentActivity(stats.recent_activity);
        renderTopOwners(stats.top_owners);
    } catch (err) {
        showToast('Failed to load dashboard data.', 'error');
    }
}

function renderStatCards(stats) {
    const byStatus = stats.by_status ?? {};
    const active = (byStatus.active ?? 0) + (byStatus.deployed ?? 0);
    const defective = (byStatus.defective ?? 0) + (byStatus.in_repair ?? 0);

    setText('stat_total_num', stats.total_assets ?? 0);
    setText('stat_active_num', active);
    setText(
        'stat_active_sub',
        `↑ ${calcPct(active, stats.total_assets)}% of total`
    );
    setText('stat_pending_num', stats.pending_endorsement ?? 0);
    setText('stat_defective_num', defective);
    setText('stat_defective_sub', `${defective} units need attention`);
    setText('stat_pos_num', stats.total_pos ?? 0);
    setText('stat_loc_num', stats.total_locations ?? 0);
    setText('stat_vendor_num', stats.total_vendors ?? 0);
    setText('stat_cat_num', stats.total_categories ?? 0);
}

function renderCategoryBreakdown(categories) {
    const container = document.getElementById('category_breakdown');

    if (!container) {
        return;
    }

    if (!categories.length) {
        container.innerHTML = emptyState('No category data yet.');
        return;
    }

    const max = Math.max(...categories.map(c => parseInt(c.count)));

    container.innerHTML = categories.map(cat => {
        const pct = max > 0 ? Math.round((cat.count / max) * 100) : 0;

        return `
            <div class="cat-bar-row">
                <div class="cat-bar-label">${cat.name}</div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="cat-bar-count">${cat.count}</div>
            </div>
        `;
    }).join('');
}

function renderStatusBreakdown(byStatus, total) {
    const container = document.getElementById('status_breakdown');

    if (!container) {
        return;
    }

    const colorMap = {
        active:    'var(--green)',
        deployed:  'var(--blue-tag)',
        in_repair: 'var(--yellow)',
        defective: 'var(--red)',
        retired:   'var(--white-4)',
        lost:      'var(--purple)',
    };

    const rows = Object.entries(byStatus).map(([status, count]) => {
        const pct = total > 0 ? calcPct(count, total) : 0;
        const color = colorMap[status] ?? 'var(--white-4)';

        return `
            <div class="status-row">
                <div class="status-dot" style="background:${color}"></div>
                <div class="status-name">${capitalize(status)}</div>
                <div class="status-count">${count}</div>
                <div class="status-pct">${pct}%</div>
            </div>
        `;
    });

    container.innerHTML = rows.join('') || emptyState('No data.');
}

function renderInsights(stats) {
    const container = document.getElementById('dashboard_insights');

    if (!container) {
        return;
    }

    const pending = stats.pending_endorsement ?? 0;
    const defective = (stats.by_status?.defective ?? 0)
        + (stats.by_status?.in_repair ?? 0);

    let html = '';

    if (pending > 0) {
        html += `
            <div class="insight-card">
                <div class="insight-card__icon">⚠️</div>
                <div>
                    <div class="insight-card__title">
                        ${pending} Items Pending Endorsement
                    </div>
                    <div class="insight-card__desc">
                        Assets received but not yet endorsed by admin.
                    </div>
                </div>
            </div>
        `;
    }

    if (defective > 0) {
        html += `
            <div class="insight-card insight-card--red">
                <div class="insight-card__icon">🔧</div>
                <div>
                    <div class="insight-card__title"
                        style="color:var(--red)">
                        ${defective} Assets Need Attention
                    </div>
                    <div class="insight-card__desc">
                        Defective or in-repair units require follow-up.
                    </div>
                </div>
            </div>
        `;
    }

    if (!html) {
        html = `
            <div class="insight-card insight-card--green">
                <div class="insight-card__icon">✅</div>
                <div>
                    <div class="insight-card__title"
                        style="color:var(--green)">
                        All Clear
                    </div>
                    <div class="insight-card__desc">
                        No pending endorsements or critical issues.
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderRecentActivity(activities) {
    const container = document.getElementById('recent_activity');

    if (!container) {
        return;
    }

    if (!activities?.length) {
        container.innerHTML = emptyState('No recent activity.');
        return;
    }

    container.innerHTML = activities.map(a => {
        const initial = (a.username ?? '?')[0].toUpperCase();
        const changes = a.changes ? JSON.parse(a.changes) : {};
        const desc = changes.after?.event
            ? `${a.username} performed: ${changes.after.event}`
            : `${a.username} ${a.action.toLowerCase()}d on ${a.table_name}`;

        return `
            <div class="activity-item">
                <div class="activity-avatar">${initial}</div>
                <div>
                    <div class="activity-action">${desc}</div>
                    <div class="activity-time">
                        ${a.action} · ${formatDate(a.timestamp)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTopOwners(owners) {
    const container = document.getElementById('top_owners');

    if (!container) {
        return;
    }

    if (!owners?.length) {
        container.innerHTML = emptyState('No owner data.');
        return;
    }

    const max = Math.max(...owners.map(o => parseInt(o.count)));

    container.innerHTML = owners.map(o => {
        const pct = max > 0 ? Math.round((o.count / max) * 100) : 0;

        return `
            <div class="cat-bar-row">
                <div class="cat-bar-label" style="font-size:11px">
                    ${o.name}
                </div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="cat-bar-count">${o.count}</div>
            </div>
        `;
    }).join('');
}

// ===== HELPERS =====
function setText(id, text) {
    const el = document.getElementById(id);

    if (el) {
        el.textContent = text;
    }
}

function calcPct(part, total) {
    if (!total) {
        return 0;
    }

    return Math.round((part / total) * 100);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}

function emptyState(msg) {
    return `
        <div class="empty-state">
            <div class="empty-state__desc">${msg}</div>
        </div>
    `;
}
