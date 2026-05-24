// assets/js/reports.js

// Cache both report types so switching tabs never re-fetches
const reportCache = {
    by_location: null,
    by_owner:    null,
};

let reportType   = 'by_location';
let reportSearch = '';

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document
        .getElementById('tab_by_location')
        ?.addEventListener('click', () => switchTab('by_location'));

    document
        .getElementById('tab_by_owner')
        ?.addEventListener('click', () => switchTab('by_owner'));

    document
        .getElementById('btn_print')
        ?.addEventListener('click', () => window.print());

    document
        .getElementById('report_search')
        ?.addEventListener('input', e => filterReport(e.target.value));

    loadReport('by_location');
});

// ─── TAB SWITCH — uses cache, no re-fetch ─────────────────────────
function switchTab(type) {
    if (reportType === type && reportCache[type]) {
        // Already loaded and cached — just re-render with current search
        reportType = type;
        setReportTab(type);
        renderReport();
        return;
    }
    loadReport(type);
}

function setReportTab(type) {
    const btnLoc = document.getElementById('tab_by_location');
    const btnOwn = document.getElementById('tab_by_owner');

    if (btnLoc) {
        btnLoc.className = type === 'by_location'
            ? 'btn btn-primary'
            : 'btn btn-secondary';
    }
    if (btnOwn) {
        btnOwn.className = type === 'by_owner'
            ? 'btn btn-primary'
            : 'btn btn-secondary';
    }
}

// ─── LOAD ─────────────────────────────────────────────────────────
async function loadReport(type) {
    reportType   = type;
    reportSearch = '';

    const searchEl = document.getElementById('report_search');
    if (searchEl) {
        searchEl.value = '';
    }

    setReportTab(type);

    // Return cached data without showing loading spinner
    if (reportCache[type]) {
        renderReport();
        return;
    }

    const body = document.getElementById('report_body');
    if (!body) {
        return;
    }

    body.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-arrow-repeat spin
                      empty-state__icon"></i>
            <div class="empty-state__title">
                Loading report...
            </div>
        </div>`;

    try {
        const res = await apiFetch(
            `/src/api/reports.php?type=${type}`
        );
        reportCache[type] = res.data || [];
        renderReport();
    } catch (err) {
        console.error('loadReport error:', err);
        body.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__title"
                        style="color:var(--red)">
                    Failed to load report.
                </div>
                <div class="empty-state__desc">
                    ${escapeHtml(err.message ?? '')}
                </div>
            </div>`;
    }
}

// ─── FILTER ───────────────────────────────────────────────────────
function filterReport(term) {
    reportSearch = term.toLowerCase();
    renderReport();
}

// ─── RENDER ───────────────────────────────────────────────────────
function renderReport() {
    const body    = document.getElementById('report_body');
    const metaEl  = document.getElementById('report_meta');
    const data    = reportCache[reportType] || [];

    if (!body) {
        return;
    }

    const isLocType = reportType === 'by_location';
    const groupKey  = isLocType ? 'location_name' : 'owner_name';
    const groupIcon = isLocType ? '📍' : '👤';
    const colLabel  = isLocType ? 'Process Owner' : 'Location';
    const colKey    = isLocType ? 'owner'         : 'location';

    let totalGroups = 0;
    let totalAssets = 0;
    let html        = '';

    data.forEach(group => {
        const groupName = group[groupKey] ?? '—';

        const assets = reportSearch
            ? group.assets.filter(a =>
                assetMatchesSearch(a, reportSearch)
              )
            : group.assets;

        if (!assets.length) {
            return;
        }

        totalGroups++;
        totalAssets += assets.length;

        const rows = assets.map((a, i) => `
            <tr>
                <td style="text-align:center;
                           color:var(--white-4);
                           font-size:11px">
                    ${i + 1}
                </td>
                <td>
                    <span class="tag tag-category"
                            style="font-size:11px">
                        ${escapeHtml(a.category ?? '—')}
                    </span>
                </td>
                <td style="font-family:monospace;
                           font-size:12px;
                           color:var(--accent)">
                    ${escapeHtml(a.serial_number ?? '—')}
                </td>
                <td style="font-size:12px">
                    ${escapeHtml(a.description ?? '—')}
                </td>
                <td>${statusTag(a.status)}</td>
                <td style="font-size:11px;
                           color:var(--white-3)">
                    ${escapeHtml(a[colKey] ?? '—')}
                </td>
                <td style="font-family:monospace;
                           font-size:11px;
                           color:var(--white-4)">
                    ${escapeHtml(a.po_number ?? '—')}
                </td>
                <td class="cell-date">
                    ${formatDate(a.date_received)}
                </td>
            </tr>`).join('');

        html += `
            <div class="report-group">
                <div class="report-group__header">
                    <span class="report-group__icon">
                        ${groupIcon}
                    </span>
                    <span class="report-group__name">
                        ${escapeHtml(groupName)}
                    </span>
                    <span class="tag tag-deployed"
                            style="margin-left:8px">
                        ${assets.length}
                        asset${assets.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div class="table-wrapper"
                        style="margin-top:0;
                               border-top:none">
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width:36px">
                                        #
                                    </th>
                                    <th>Category</th>
                                    <th>Serial Number</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>${colLabel}</th>
                                    <th>PO #</th>
                                    <th>Date Received</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    });

    if (!html) {
        body.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-search empty-state__icon"></i>
                <div class="empty-state__title">
                    No assets found.
                </div>
                <div class="empty-state__desc">
                    Add assets with a location and owner assigned
                    to see them here.
                </div>
            </div>`;
        if (metaEl) {
            metaEl.textContent = '';
        }
        return;
    }

    const typeLabel = isLocType
        ? 'By Location'
        : 'By Process Owner';
    const printDate = new Date().toLocaleDateString('en-PH', {
        year:  'numeric',
        month: 'long',
        day:   'numeric',
    });

    body.innerHTML = `
        <div class="report-print-header">
            <div class="report-print-header__title">
                FSL Inventory — ${typeLabel} Report
            </div>
            <div class="report-print-header__date">
                Generated: ${printDate}
            </div>
        </div>
        ${html}`;

    if (metaEl) {
        metaEl.textContent =
            `${totalGroups} group${totalGroups !== 1 ? 's' : ''}`
            + ` · ${totalAssets}`
            + ` asset${totalAssets !== 1 ? 's' : ''}`;
    }
}

function assetMatchesSearch(a, term) {
    return (
        (a.serial_number &&
         a.serial_number.toLowerCase().includes(term)) ||
        (a.description   &&
         a.description.toLowerCase().includes(term))   ||
        (a.category      &&
         a.category.toLowerCase().includes(term))      ||
        (a.po_number     &&
         a.po_number.toLowerCase().includes(term))
    );
}