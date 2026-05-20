// assets/js/purchase_orders.js

let allPOs         = [];
let filteredPOs    = [];
let poCurrentPage  = 1;
let poItemsPerPage = 25;
let poSort         = 'po.created_at';
let poDir          = 'desc';
let currentViewId  = null;

const MAX_CAT_CHIPS     = 3;
const ENDORSE_WARN_DAYS = 3;

// ─── UTILITIES ───────────────────────────────────────────────────────────────
const getVal = (id) =>
    document.getElementById(id)?.value.trim() ?? '';

const safeSetVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
        el.value = val;
    }
};

// Uses global escapeHtml from app.js

const debouncedApplyPoFilters = debounce(() => {
    poCurrentPage = 1;
    applyClientPoFilters();
}, 350);

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    populatePoVendorDropdown();
    populatePoFormVendors();
    populatePoCategoryFilter();
    populatePoOwnerFilter();
    populatePoFiscalYearFilter();
    fetchInitialPOs();
});

// ─── EVENT HANDLERS ──────────────────────────────────────────────────────────
function onEditClick(e, id) {
    e.stopPropagation();
    openEditPO(id);
}

function onDeleteClick(e, id, poNumber) {
    e.stopPropagation();
    deletePO(id, poNumber);
}

function onEndorseClick(e, id) {
    e.stopPropagation();
    endorsePO(id);
}

// ─── DATA FETCHING ────────────────────────────────────────────────────────────
async function fetchInitialPOs() {
    const tbody = document.getElementById('po_body');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="cell-date"
                    style="text-align:center;padding:30px">
                <i class="bi bi-arrow-repeat spin"></i>
                Loading POs...
            </td>
        </tr>`;

    try {
        const data = await apiFetch(
            '/src/api/purchase_orders.php?per_page=5000'
        );
        allPOs = data.data || [];
        applyClientPoFilters();
    } catch (err) {
        console.error('fetchInitialPOs error:', err);
        showToast('Failed to load purchase orders.', 'error');
    }
}

// ─── FILTERING & SORTING ──────────────────────────────────────────────────────
function clearPoFilters() {
    [
        'po_search', 'filter_vendor', 'filter_endorsed',
        'filter_category', 'filter_owner', 'filter_fiscal_year',
    ].forEach(id => safeSetVal(id, ''));

    poSort = 'po.created_at';
    poDir  = 'desc';
    updatePoSortIcons();
    debouncedApplyPoFilters();
}

function onPoPerPageChange() {
    poItemsPerPage = parseInt(getVal('po_per_page')) || 25;
    poCurrentPage  = 1;
    applyClientPoFilters();
}

function sortPOs(col) {
    if (poSort === col) {
        poDir = poDir === 'asc' ? 'desc' : 'asc';
    } else {
        poSort = col;
        poDir  = 'asc';
    }
    poCurrentPage = 1;
    updatePoSortIcons();
    applyClientPoFilters();
}

function updatePoSortIcons() {
    document.querySelectorAll('[id^="posort_"]').forEach(el => {
        el.className = 'bi bi-arrow-down-up sort-icon';
    });

    const active = document.getElementById(`posort_${poSort}`);
    if (active) {
        const dirClass = poDir === 'asc'
            ? 'bi-sort-up'
            : 'bi-sort-down';
        active.className = `bi ${dirClass} sort-icon sort-active`;
    }
}

function applyClientPoFilters() {
    const search    = getVal('po_search').toLowerCase();
    const vendorId  = getVal('filter_vendor');
    const endorsed  = getVal('filter_endorsed');
    const catFilter = getVal('filter_category').toLowerCase();
    const ownFilter = getVal('filter_owner').toLowerCase();
    const fyFilter  = getVal('filter_fiscal_year').toUpperCase();

    filteredPOs = allPOs.filter(p => {
        const matchSearch = !search ||
            (p.po_number   &&
             p.po_number.toLowerCase().includes(search)) ||
            (p.vendor_name &&
             p.vendor_name.toLowerCase().includes(search));

        const matchVendor = !vendorId ||
            String(p.vendor_id) === vendorId;

        const days = parseInt(p.days_since_received) || 0;
        let matchEndorsed = true;
        if (endorsed === 'yes') {
            matchEndorsed = !!p.date_endorsed;
        } else if (endorsed === 'no') {
            matchEndorsed = !p.date_endorsed;
        } else if (endorsed === 'overdue') {
            matchEndorsed = !p.date_endorsed &&
                days > ENDORSE_WARN_DAYS;
        }

        const matchCat = !catFilter ||
            (p.categories &&
             p.categories.toLowerCase().includes(catFilter));

        const matchOwner = !ownFilter ||
            (p.owners &&
             p.owners.toLowerCase().includes(ownFilter));

        const matchFy = !fyFilter ||
            (p.fiscal_year &&
             p.fiscal_year.toUpperCase() === fyFilter);

        return matchSearch && matchVendor && matchEndorsed &&
               matchCat && matchOwner && matchFy;
    });

    const SORT_MAP = {
        'po.po_number':     'po_number',
        'v.name':           'vendor_name',
        'asset_count':      'asset_count',
        'po.date_received': 'date_received',
        'po.date_endorsed': 'date_endorsed',
        'po.created_at':    'created_at',
    };

    const jsSortKey = SORT_MAP[poSort] || 'created_at';

    filteredPOs.sort((a, b) => {
        let valA = a[jsSortKey] ?? '';
        let valB = b[jsSortKey] ?? '';

        if (jsSortKey === 'asset_count') {
            valA = parseInt(valA) || 0;
            valB = parseInt(valB) || 0;
        } else {
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
            }
            if (typeof valB === 'string') {
                valB = valB.toLowerCase();
            }
        }

        if (valA < valB) { return poDir === 'asc' ? -1 : 1; }
        if (valA > valB) { return poDir === 'asc' ? 1 : -1; }
        return 0;
    });

    renderCurrentPoPage();
}

window.changePoClientPage = function (page) {
    poCurrentPage = page;
    renderCurrentPoPage();
};

function renderCurrentPoPage() {
    const totalItems = filteredPOs.length;
    const totalPages = Math.ceil(totalItems / poItemsPerPage) || 1;

    if (poCurrentPage > totalPages) {
        poCurrentPage = totalPages;
    }

    const startIdx = (poCurrentPage - 1) * poItemsPerPage;
    const pageData = filteredPOs.slice(
        startIdx, startIdx + poItemsPerPage
    );

    renderPoTable(pageData);

    const mockPg = {
        page:        poCurrentPage,
        per_page:    poItemsPerPage,
        total:       totalItems,
        total_pages: totalPages,
    };

    renderPagination('po_pagination', mockPg, 'changePoClientPage');
    renderPoCounter(mockPg);
}

function renderPoCounter(pg) {
    const el = document.getElementById('po_counter');
    if (!el || !pg) {
        return;
    }

    if (!pg.total) {
        el.textContent = 'No results';
        return;
    }

    const start = (pg.page - 1) * pg.per_page + 1;
    const end   = Math.min(pg.page * pg.per_page, pg.total);
    el.textContent = `${start}–${end} of ${pg.total}`;
}

// ─── TABLE HELPERS ────────────────────────────────────────────────────────────
function buildCatChips(categoriesStr) {
    if (!categoriesStr || categoriesStr === '—') {
        return '<span class="cell-date">—</span>';
    }

    const cats  = categoriesStr.split(', ');
    const shown = cats
        .slice(0, MAX_CAT_CHIPS)
        .map(c =>
            `<span class="tag tag-category">${escapeHtml(c)}</span>`
        )
        .join('');

    const more = cats.length > MAX_CAT_CHIPS
        ? `<span class="tag">+${cats.length - MAX_CAT_CHIPS}</span>`
        : '';

    return shown + more;
}

/**
 * Returns an age badge if the PO is pending endorsement
 * beyond ENDORSE_WARN_DAYS.
 */
function buildAgeTag(po) {
    if (po.date_endorsed) {
        return '';
    }

    const days = parseInt(po.days_since_received) || 0;
    if (days <= ENDORSE_WARN_DAYS) {
        return '';
    }

    return `<span class="tag tag-defective"
                  title="${days} days since received">
                <i class="bi bi-exclamation-circle"></i>
                ${days}d overdue
            </span>`;
}

// ─── RENDER TABLE ─────────────────────────────────────────────────────────────
function renderPoTable(pos) {
    const tbody      = document.getElementById('po_body');
    const isAdminUsr = typeof IS_ADMIN !== 'undefined' && IS_ADMIN;

    if (!pos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="bi bi-file-earmark-x
                                  empty-state__icon"></i>
                        <div class="empty-state__title">
                            No purchase orders found
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = pos.map(p => {
        const safePoNum = escapeHtml(p.po_number);

        const fyTag = p.fiscal_year
            ? `<span class="tag"
                     style="font-size:10px;padding:1px 6px;
                            margin-top:3px">
                   ${escapeHtml(p.fiscal_year)}
               </span>`
            : '';

        const endorsedCell = p.date_endorsed
            ? `<span class="tag tag-active">
                   <i class="bi bi-check-circle"></i>
                   ${formatDate(p.date_endorsed)}
               </span>`
            : `<div style="display:flex;flex-direction:column;
                            gap:4px">
                   <span class="tag tag-repair">
                       <i class="bi bi-clock"></i> Pending
                   </span>
                   ${buildAgeTag(p)}
               </div>`;

        const endorseBtn = !p.date_endorsed
            ? `<button class="btn btn-secondary btn-sm"
                       onclick="onEndorseClick(event, ${p.id})"
                       title="Mark endorsed today">
                   <i class="bi bi-pen-fill"></i>
               </button>`
            : '';

        const adminBtn = isAdminUsr
            ? `<button class="btn btn-danger btn-sm"
                       onclick="onDeleteClick(
                           event, ${p.id}, '${safePoNum}'
                       )"
                       title="Delete">
                   <i class="bi bi-trash"></i>
               </button>`
            : '';

        return `
            <tr class="clickable-row"
                    onclick="viewPO(${p.id})">
                <td>
                    <div style="display:flex;
                                flex-direction:column;gap:2px">
                        <span class="cell-accent val-mono">
                            ${safePoNum}
                        </span>
                        ${fyTag}
                    </div>
                </td>
                <td class="cell-sm">
                    ${escapeHtml(p.vendor_name ?? '—')}
                </td>
                <td>
                    <div class="table-actions">
                        ${buildCatChips(p.categories)}
                    </div>
                </td>
                <td style="text-align:center">
                    <span class="tag tag-deployed">
                        ${escapeHtml(p.asset_count ?? 0)}
                    </span>
                </td>
                <td class="cell-date">
                    ${formatDate(p.date_received)}
                </td>
                <td>${endorsedCell}</td>
                <td>
                    <div class="table-actions">
                        ${endorseBtn}
                        <button class="btn btn-secondary btn-sm"
                                onclick="onEditClick(event, ${p.id})"
                                title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${adminBtn}
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ─── ONE-CLICK ENDORSE ────────────────────────────────────────────────────────
function endorsePO(id) {
    const po = allPOs.find(x => x.id === id);
    if (!po) {
        return;
    }

    showConfirm(
        'Endorse PO',
        `Mark PO "${po.po_number}" as endorsed today?`,
        async () => {
            try {
                const res = await apiFetch(
                    `/src/api/purchase_orders.php`
                    + `?id=${id}&action=endorse`,
                    { method: 'PUT' }
                );
                showToast('PO endorsed successfully.', 'success');

                // Update in-memory — avoid full reload
                po.date_endorsed = res.data.date_endorsed;
                applyClientPoFilters();
            } catch (err) {
                console.error('endorsePO error:', err);
                showToast(err.message, 'error');
            }
        }
    );
}

// ─── VIEW MODAL ───────────────────────────────────────────────────────────────
async function viewPO(id) {
    currentViewId = id;

    const po = allPOs.find(x => x.id === id);
    if (!po) {
        showToast('Could not find PO.', 'error');
        return;
    }

    renderViewPoSummary(po);
    openModal('view_po');

    const assetBody = document.getElementById('view_po_asset_body');
    assetBody.innerHTML = `
        <tr>
            <td colspan="6" class="cell-date"
                    style="text-align:center;padding:16px">
                <i class="bi bi-arrow-repeat spin"></i>
                Loading items…
            </td>
        </tr>`;

    try {
        const data = await apiFetch(
            `/src/api/purchase_orders.php?id=${id}&action=assets`
        );
        renderViewPoAssets(data.data || []);
    } catch (err) {
        console.error('viewPO assets error:', err);
        assetBody.innerHTML = `
            <tr>
                <td colspan="6"
                        style="text-align:center;padding:16px;
                               color:var(--red)">
                    Failed to load items.
                </td>
            </tr>`;
    }
}

function renderViewPoSummary(po) {
    const titleEl = document.getElementById('view_po_title');
    const bodyEl  = document.getElementById('view_po_summary');

    if (!titleEl || !bodyEl) {
        return;
    }

    titleEl.textContent = `📋 PO: ${po.po_number}`;

    const dateEndorsed = po.date_endorsed
        ? formatDate(po.date_endorsed)
        : '⏳ Pending';

    const fyRow = po.fiscal_year
        ? `<div class="form-field">
               <label>Fiscal Year</label>
               <div class="info-field">
                   <div class="val">
                       ${escapeHtml(po.fiscal_year)}
                   </div>
               </div>
           </div>`
        : '';

    bodyEl.innerHTML = `
        <div class="field-grid">
            <div class="form-field">
                <label>PO Number</label>
                <div class="info-field">
                    <div class="val val-mono">
                        ${escapeHtml(po.po_number ?? '—')}
                    </div>
                </div>
            </div>
            <div class="form-field">
                <label>Vendor</label>
                <div class="info-field">
                    <div class="val">
                        ${escapeHtml(po.vendor_name ?? '—')}
                    </div>
                </div>
            </div>
        </div>
        <div class="field-grid">
            <div class="form-field">
                <label>Date Received</label>
                <div class="info-field">
                    <div class="val">
                        ${formatDate(po.date_received)}
                    </div>
                </div>
            </div>
            <div class="form-field">
                <label>Date Endorsed by Admin</label>
                <div class="info-field">
                    <div class="val">${dateEndorsed}</div>
                </div>
            </div>
        </div>
        ${fyRow}`;
}

function renderViewPoAssets(rows) {
    const tbody = document.getElementById('view_po_asset_body');
    if (!tbody) {
        return;
    }

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="cell-date"
                        style="text-align:center;padding:16px">
                    No assets linked to this PO yet.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td>
                <span class="tag tag-category">
                    ${escapeHtml(r.category ?? '—')}
                </span>
            </td>
            <td class="cell-sm">
                ${escapeHtml(r.description ?? '—')}
            </td>
            <td style="text-align:center">
                <span class="tag tag-deployed">
                    ${escapeHtml(r.quantity ?? 0)}
                </span>
            </td>
            <td class="cell-sm">
                ${escapeHtml(r.location ?? '—')}
            </td>
            <td class="cell-sm">
                ${escapeHtml(r.owner ?? '—')}
            </td>
            <td class="cell-date">
                ${escapeHtml(r.remarks || 'NA')}
            </td>
        </tr>`).join('');
}

function editPoFromView() {
    closeModal('view_po');
    openEditPO(currentViewId);
}

// ─── ADD / EDIT / DELETE ──────────────────────────────────────────────────────
function openAddPO() {
    safeSetVal('po_edit_id', '');
    document.getElementById('po_modal_title').textContent =
        '📋 New Purchase Order';

    ['po_number', 'po_date_received',
     'po_date_endorsed', 'po_vendor']
        .forEach(id => safeSetVal(id, ''));

    openModal('add_po');
}

function openEditPO(id) {
    const po = allPOs.find(x => x.id === id);
    if (!po) {
        showToast('Could not load PO for editing.', 'error');
        return;
    }

    safeSetVal('po_edit_id', id);
    document.getElementById('po_modal_title').textContent =
        '✏️ Edit Purchase Order';

    safeSetVal('po_number',        po.po_number);
    safeSetVal('po_vendor',        po.vendor_id     ?? '');
    safeSetVal('po_date_received', po.date_received ?? '');
    safeSetVal('po_date_endorsed', po.date_endorsed ?? '');

    openModal('add_po');
}

async function savePO() {
    const id           = getVal('po_edit_id');
    const poNumber     = getVal('po_number');
    const vendorId     = getVal('po_vendor');
    const dateReceived = getVal('po_date_received');
    const dateEndorsed = getVal('po_date_endorsed');

    if (!poNumber) {
        showToast('PO number is required.', 'error');
        return;
    }

    const payload = {
        po_number:     poNumber,
        vendor_id:     vendorId     || null,
        date_received: dateReceived || null,
        date_endorsed: dateEndorsed || null,
    };

    const isEdit = !!id;
    const url    = isEdit
        ? `/src/api/purchase_orders.php?id=${id}`
        : '/src/api/purchase_orders.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_po');
        showToast(
            `PO ${isEdit ? 'updated' : 'created'} successfully.`,
            'success'
        );
        fetchInitialPOs();
    } catch (err) {
        console.error('savePO error:', err);
        showToast(err.message, 'error');
    }
}

function deletePO(id, poNumber) {
    showConfirm(
        'Delete Purchase Order',
        `Delete PO: ${poNumber}? All linked assets will be unlinked.`,
        async () => {
            try {
                await apiFetch(
                    `/src/api/purchase_orders.php?id=${id}`,
                    { method: 'DELETE' }
                );
                showToast('PO deleted.', 'success');
                fetchInitialPOs();
            } catch (err) {
                console.error('deletePO error:', err);
                showToast(err.message, 'error');
            }
        }
    );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportPoTracker() {
    window.location.href =
        '/src/api/import_export.php?action=export_po_tracker';
}

// ─── DROPDOWNS ────────────────────────────────────────────────────────────────
function appendOptions(selectId, items, valKey, labelKey) {
    const el = document.getElementById(selectId);
    if (!el) {
        return;
    }
    items.forEach(item => {
        const opt       = document.createElement('option');
        opt.value       = item[valKey];
        opt.textContent = item[labelKey];
        el.appendChild(opt);
    });
}

async function populatePoVendorDropdown() {
    try {
        const d = await apiFetch('/src/api/vendors.php?per_page=500');
        appendOptions('filter_vendor', d.data ?? [], 'id', 'name');
    } catch (err) {
        console.error('populatePoVendorDropdown error:', err);
    }
}

async function populatePoFormVendors() {
    try {
        const d = await apiFetch('/src/api/vendors.php?per_page=500');
        appendOptions('po_vendor', d.data ?? [], 'id', 'name');
    } catch (err) {
        console.error('populatePoFormVendors error:', err);
    }
}

async function populatePoCategoryFilter() {
    try {
        const d = await apiFetch(
            '/src/api/categories.php?per_page=200'
        );
        appendOptions(
            'filter_category', d.data ?? [], 'name', 'name'
        );
    } catch (err) {
        console.error('populatePoCategoryFilter error:', err);
    }
}

async function populatePoOwnerFilter() {
    try {
        const d = await apiFetch(
            '/src/api/process_owners.php?per_page=500'
        );
        appendOptions(
            'filter_owner', d.data ?? [], 'name', 'name'
        );
    } catch (err) {
        console.error('populatePoOwnerFilter error:', err);
    }
}

async function populatePoFiscalYearFilter() {
    const el = document.getElementById('filter_fiscal_year');
    if (!el) {
        return;
    }

    try {
        const d = await apiFetch(
            '/src/api/purchase_orders.php?per_page=5000'
        );
        const years = [
            ...new Set(
                (d.data ?? [])
                    .map(p => p.fiscal_year)
                    .filter(Boolean)
            ),
        ].sort().reverse();

        years.forEach(fy => {
            const opt       = document.createElement('option');
            opt.value       = fy;
            opt.textContent = fy;
            el.appendChild(opt);
        });
    } catch (err) {
        console.error('populatePoFiscalYearFilter error:', err);
    }
}

function globalSearch(term) {
    safeSetVal('po_search', term);
    debouncedApplyPoFilters();
}