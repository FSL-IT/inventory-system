// assets/js/dashboard.js

window.loadDashboard = async function loadDashboard() {
    if (typeof registerGlobalSearch === 'function') {
        registerGlobalSearch(function (term) {
            let q = (term || '').trim();
            if (!q) {
                return;
            }
            appNavigate(
                '/src/views/assets.php?search=' +
                encodeURIComponent(q)
            );
        });
    }

    try {
        const data  = await apiFetch('/src/api/dashboard.php');
        const stats = data.data;

        renderAlerts(stats);
        renderMainStatCards(stats);
        renderCategoryBreakdown(stats.by_category);
        renderStatusBreakdown(stats.by_status, stats.total_assets);
        renderRecentActivity(stats.recent_activity);
        renderTopOwners(stats.top_owners);
    } catch (err) {
        console.error('loadDashboard error:', err);
        showToast('Failed to load dashboard data.', 'error');
    }
};

// ─── ALERTS (action items) ────────────────────────────────────────────────────
function renderAlerts(stats) {
    const container = document.getElementById('dashboard_alerts');
    if (!container) {
        return;
    }

    const overdue   = stats.overdue_pos         ?? 0;
    const pending   = stats.pending_endorsement ?? 0;
    const missingSn = stats.total_missing_sn    ?? 0;
    const oldest    = stats.oldest_overdue_po   ?? null;
    const defective = (stats.by_status?.defective ?? 0)
                    + (stats.by_status?.in_repair  ?? 0);

    const items = [];

    if (overdue > 0) {
        items.push({
            tone:  'red',
            icon:  'bi-exclamation-octagon',
            title: `${overdue} PO${overdue !== 1 ? 's' : ''} overdue for endorsement`,
            desc:  oldest
                ? `Oldest: ${oldest.po_number} — ${oldest.days_overdue} day${
                    oldest.days_overdue !== 1 ? 's' : ''
                } waiting.`
                : 'POs received more than 3 days ago still need admin endorsement.',
            action: 'Review overdue POs',
            url:    '/src/views/purchase_orders.php?endorsed=overdue',
        });
    } else if (pending > 0) {
        items.push({
            tone:  'yellow',
            icon:  'bi-hourglass-split',
            title: `${pending} asset${pending !== 1 ? 's' : ''} awaiting PO endorsement`,
            desc:  'These assets are on POs that have not been endorsed by admin yet.',
            action: 'View pending POs',
            url:    '/src/views/purchase_orders.php?endorsed=pending',
        });
    }

    if (missingSn > 0) {
        items.push({
            tone:  'yellow',
            icon:  'bi-upc-scan',
            title: `${missingSn} asset${missingSn !== 1 ? 's' : ''} missing serial numbers`,
            desc:  'Every unit should have a serial before deployment.',
            action: 'Find assets without SN',
            url:    '/src/views/assets.php?missing_sn=1',
        });
    }

    if (defective > 0) {
        items.push({
            tone:  'red',
            icon:  'bi-tools',
            title: `${defective} asset${defective !== 1 ? 's' : ''} need attention`,
            desc:  'Defective or in-repair units require follow-up.',
            action: 'View defective assets',
            url:    '/src/views/assets.php?attention=1',
        });
    }

    if (!items.length) {
        container.innerHTML = `
            <div class="dashboard-alert dashboard-alert--ok">
                <div class="dashboard-alert__icon">
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <div class="dashboard-alert__body">
                    <div class="dashboard-alert__title">All clear</div>
                    <div class="dashboard-alert__desc">
                        No overdue POs, missing serials, or defective
                        assets right now.
                    </div>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = items.map(function (item) {
        return `
            <div class="dashboard-alert dashboard-alert--${item.tone}">
                <div class="dashboard-alert__icon">
                    <i class="bi ${item.icon}"></i>
                </div>
                <div class="dashboard-alert__body">
                    <div class="dashboard-alert__title">${item.title}</div>
                    <div class="dashboard-alert__desc">${item.desc}</div>
                </div>
                <button type="button"
                        class="btn btn-secondary btn-sm dashboard-alert__btn"
                        onclick="appNavigate('${item.url}')">
                    ${item.action}
                    <i class="bi bi-arrow-right"></i>
                </button>
            </div>`;
    }).join('');
}

// ─── MAIN STAT CARDS (clickable) ─────────────────────────────────────────────
function renderMainStatCards(stats) {
    const container = document.getElementById('stat_grid_main');
    if (!container) {
        return;
    }

    const byStatus  = stats.by_status ?? {};
    const active    = (byStatus.active ?? 0) + (byStatus.deployed ?? 0);
    const defective = (byStatus.defective ?? 0) + (byStatus.in_repair ?? 0);
    const total     = stats.total_assets ?? 0;

    const cards = [
        {
            tone:  'orange',
            icon:  'bi-box-seam',
            num:   total,
            label: 'Total Assets',
            sub:   'All serialized inventory',
            url:   '/src/views/assets.php',
        },
        {
            tone:  'blue',
            icon:  'bi-file-earmark-text',
            num:   stats.total_pos ?? 0,
            label: 'Purchase Orders',
            sub:   'PO tracker records',
            url:   '/src/views/purchase_orders.php',
        },
        {
            tone:  'green',
            icon:  'bi-check-circle',
            num:   active,
            label: 'Active / Deployed',
            sub:   `${calcPct(active, total)}% of inventory`,
            url:   '/src/views/assets.php?operational=1',
        },
        {
            tone:  'red',
            icon:  'bi-tools',
            num:   defective,
            label: 'Need Attention',
            sub:   'Defective or in repair',
            url:   '/src/views/assets.php?attention=1',
        },
    ];

    container.innerHTML = cards.map(function (c) {
        return `
            <button type="button"
                    class="stat-card stat-card--link stat-card--${c.tone}"
                    onclick="appNavigate('${c.url}')">
                <div class="stat-card__icon">
                    <i class="bi ${c.icon}"></i>
                </div>
                <div class="stat-card__num">${c.num}</div>
                <div class="stat-card__label">${c.label}</div>
                <div class="stat-card__change">${c.sub}</div>
                <span class="stat-card__go">
                    Open <i class="bi bi-arrow-right"></i>
                </span>
            </button>`;
    }).join('');
}

// ─── CATEGORY BREAKDOWN ───────────────────────────────────────────────────────
function renderCategoryBreakdown(categories) {
    const container = document.getElementById('category_breakdown');
    if (!container) {
        return;
    }

    if (!categories?.length) {
        container.innerHTML = emptyState('No assets categorized yet.');
        return;
    }

    const max = Math.max(...categories.map(c => parseInt(c.count, 10)));

    container.innerHTML = categories.map(function (cat) {
        const pct = max > 0
            ? Math.round((cat.count / max) * 100)
            : 0;
        const url = cat.id
            ? `/src/views/assets.php?category_id=${cat.id}`
            : '/src/views/assets.php';

        return `
            <button type="button"
                    class="cat-bar-row cat-bar-row--link"
                    onclick="appNavigate('${url}')"
                    title="View ${escapeHtml(cat.name)} assets">
                <div class="cat-bar-label">${escapeHtml(cat.name)}</div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="cat-bar-count">${cat.count}</div>
            </button>`;
    }).join('');
}

// ─── STATUS BREAKDOWN ─────────────────────────────────────────────────────────
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

    const entries = Object.entries(byStatus || {});
    if (!entries.length) {
        container.innerHTML = emptyState('No assets yet.');
        return;
    }

    container.innerHTML = entries.map(function ([status, count]) {
        const pct   = total > 0 ? calcPct(count, total) : 0;
        const color = colorMap[status] ?? 'var(--white-4)';
        const url   = `/src/views/assets.php?status=${encodeURIComponent(status)}`;

        return `
            <button type="button"
                    class="status-row status-row--link"
                    onclick="appNavigate('${url}')">
                <div class="status-dot" style="background:${color}"></div>
                <div class="status-name">${capitalize(status)}</div>
                <div class="status-count">${count}</div>
                <div class="status-pct">${pct}%</div>
            </button>`;
    }).join('');
}

// ─── RECENT ACTIVITY ──────────────────────────────────────────────────────────
function renderRecentActivity(activities) {
    const container = document.getElementById('recent_activity');
    if (!container) {
        return;
    }

    if (!activities?.length) {
        container.innerHTML = emptyState('No recent activity.');
        return;
    }

    container.innerHTML = activities.map(function (a) {
        const initial = (a.username ?? '?')[0].toUpperCase();
        let desc;
        try {
            const changes = a.changes ? JSON.parse(a.changes) : {};
            desc = changes.after?.event
                ? `${escapeHtml(a.username)} — ${escapeHtml(changes.after.event)}`
                : `${escapeHtml(a.username)} ${a.action.toLowerCase()}d ${escapeHtml(a.table_name)}`;
        } catch (e) {
            desc = `${escapeHtml(a.username)} — ${escapeHtml(a.action)}`;
        }

        return `
            <div class="activity-item">
                <div class="activity-avatar">${initial}</div>
                <div>
                    <div class="activity-action">${desc}</div>
                    <div class="activity-time">
                        ${formatDate(a.timestamp)}
                    </div>
                </div>
            </div>`;
    }).join('');
}

// ─── TOP OWNERS ───────────────────────────────────────────────────────────────
function renderTopOwners(owners) {
    const container = document.getElementById('top_owners');
    if (!container) {
        return;
    }

    if (!owners?.length) {
        container.innerHTML = emptyState('No owner assignments yet.');
        return;
    }

    const max = Math.max(...owners.map(o => parseInt(o.count, 10)));

    container.innerHTML = owners.map(function (o) {
        const pct = max > 0 ? Math.round((o.count / max) * 100) : 0;
        const url = o.id
            ? `/src/views/assets.php?owner_id=${o.id}`
            : '/src/views/assets.php';

        return `
            <button type="button"
                    class="cat-bar-row cat-bar-row--link"
                    onclick="appNavigate('${url}')"
                    title="View assets for ${escapeHtml(o.name)}">
                <div class="cat-bar-label">${escapeHtml(o.name)}</div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="cat-bar-count">${o.count}</div>
            </button>`;
    }).join('');
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function calcPct(part, total) {
    if (!total) {
        return 0;
    }
    return Math.round((part / total) * 100);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase()
        + str.slice(1).replace('_', ' ');
}

function emptyState(msg) {
    return `
        <div class="empty-state">
            <div class="empty-state__desc">${msg}</div>
        </div>`;
}
