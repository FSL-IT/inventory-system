// assets/js/assets.js

var allAssets      = [];
var filteredAssets = [];
var currentPage    = 1;
var itemsPerPage   = 25;
var currentSort    = 'a.created_at';
var currentDir     = 'desc';
var assetViewId    = null; 
var assetMode      = 'single';

// ─── INIT ─────────────────────────────────────────────────────────
window.initAssets = function () {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');

    if (urlSearch) {
        safeSetVal('asset_search', urlSearch);
    }

    fetchInitialAssets();
    populateAssetFormDropdowns();
    setupImportDropZone();
};

// ─── EVENT HANDLERS ───────────────────────────────────────────────
function onViewClick(e, id) {
    e.stopPropagation();
    viewAsset(id);
}

function onEditClick(e, id) {
    e.stopPropagation();
    openEditAsset(id);
}

function onDeleteClick(e, id, serial) {
    e.stopPropagation();
    deleteAsset(id, serial);
}

// ─── FETCH ────────────────────────────────────────────────────────
async function fetchInitialAssets() {
    const tbody = document.getElementById('assets_body');
    if (!tbody) {
        return; // SAFEGUARD: Exit if navigated away
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="cell-date"
                    style="text-align:center;padding:30px">
                <i class="bi bi-arrow-repeat spin"></i>
                Loading database...
            </td>
        </tr>`;

    try {
        const data = await apiFetch(
            '/src/api/assets.php?per_page=10000'
        );
        allAssets = data.data || [];
        applyClientFilters();
    } catch (err) {
        console.error('fetchInitialAssets error:', err);
        showToast('Failed to load assets.', 'error');
    }
}

// ─── FILTERING & SORTING ──────────────────────────────────────────
function debouncedLoadAssets() {
    currentPage = 1;
    applyClientFilters();
}

function clearAssetFilters() {
    [
        'asset_search', 'filter_status', 'filter_category',
        'filter_location', 'filter_owner',
    ].forEach(id => safeSetVal(id, ''));

    currentSort = 'a.created_at';
    currentDir  = 'desc';
    updateSortIcons();
    debouncedLoadAssets();
}

function onPerPageChange() {
    itemsPerPage = parseInt(getVal('asset_per_page')) || 25;
    currentPage  = 1;
    applyClientFilters();
}

function sortAssets(col) {
    if (currentSort === col) {
        currentDir = currentDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = col;
        currentDir  = 'asc';
    }
    currentPage = 1;
    updateSortIcons();
    applyClientFilters();
}

function updateSortIcons() {
    document.querySelectorAll('.sort-icon').forEach(el => {
        el.className = 'bi bi-arrow-down-up sort-icon';
    });

    const active = document.getElementById(`sort_${currentSort}`);
    if (active) {
        const dirClass = currentDir === 'asc'
            ? 'bi-sort-up'
            : 'bi-sort-down';
        active.className = `bi ${dirClass} sort-icon sort-active`;
    }
}

function applyClientFilters() {
    const search = getVal('asset_search').toLowerCase();
    const status = getVal('filter_status');
    const catId  = getVal('filter_category');
    const locId  = getVal('filter_location');
    const ownId  = getVal('filter_owner');

    filteredAssets = allAssets.filter(a => {
        const matchSearch = !search ||
            (a.serial_number &&
             a.serial_number.toLowerCase().includes(search)) ||
            (a.description &&
             a.description.toLowerCase().includes(search)) ||
            (a.po_number &&
             a.po_number.toLowerCase().includes(search)) ||
            (a.vendor_name &&
             a.vendor_name.toLowerCase().includes(search));

        const matchStatus = !status || String(a.status) === status;
        const matchCat = !catId || String(a.category_id) === catId;
        const matchLoc = !locId || String(a.location_id) === locId;
        const matchOwn = !ownId || String(a.owner_id) === ownId;

        return matchSearch && matchStatus &&
               matchCat && matchLoc && matchOwn;
    });

    const SORT_MAP = {
        'a.serial_number':  'serial_number',
        'a.description':    'description',
        'c.name':           'category_name',
        'l.name':           'location_name',
        'o.name':           'owner_name',
        'a.status':         'status',
        'po.date_received': 'date_received',
        'a.created_at':     'created_at',
    };

    const jsSortKey = SORT_MAP[currentSort] || 'created_at';

    filteredAssets.sort((a, b) => {
        let valA = a[jsSortKey] || '';
        let valB = b[jsSortKey] || '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return currentDir === 'asc' ? -1 : 1;
        if (valA > valB) return currentDir === 'asc' ? 1 : -1;
        return 0;
    });

    renderCurrentPage();
}

window.changeClientPage = function (page) {
    currentPage = page;
    renderCurrentPage();
};

function renderCurrentPage() {
    const totalItems = filteredAssets.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const pageData = filteredAssets.slice(
        startIdx, startIdx + itemsPerPage
    );

    renderAssetTable(pageData);

    const mockPg = {
        page:        currentPage,
        per_page:    itemsPerPage,
        total:       totalItems,
        total_pages: totalPages,
    };

    renderPagination(
        'assets_pagination', mockPg, 'changeClientPage'
    );
    renderCounter(mockPg);
}

function renderCounter(pg) {
    const el = document.getElementById('asset_counter');
    if (!el || !pg) return;

    if (!pg.total) {
        el.textContent = 'No results';
        return;
    }

    const start = (pg.page - 1) * pg.per_page + 1;
    const end   = Math.min(pg.page * pg.per_page, pg.total);
    el.textContent = `${start}–${end} of ${pg.total}`;
}

// ─── TABLE RENDER ─────────────────────────────────────────────────
function renderAssetTable(assets) {
    const tbody = document.getElementById('assets_body');
    if (!tbody) {
        return; // SAFEGUARD
    }

    if (!assets.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <div class="empty-state__icon">📦</div>
                        <div class="empty-state__title">
                            No assets found
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = assets.map(a => {
        const safeSn = escapeHtml(a.serial_number);

        return `
            <tr class="clickable-row" onclick="viewAsset(${a.id})">
                <td><span class="serial-chip">${safeSn}</span></td>
                <td>${escapeHtml(a.description)}</td>
                <td>
                    <span class="tag tag-category">
                        ${escapeHtml(a.category_name ?? '—')}
                    </span>
                </td>
                <td class="cell-mono cell-truncate">
                    ${escapeHtml(a.po_number ?? '—')}
                </td>
                <td class="cell-sm">
                    ${escapeHtml(a.location_name ?? '—')}
                </td>
                <td class="cell-sm">
                    ${escapeHtml(a.owner_name ?? '—')}
                </td>
                <td>${statusTag(a.status)}</td>
                <td class="cell-date">
                    ${formatDate(a.date_received)}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm"
                                onclick="onEditClick(
                                    event, ${a.id}
                                )"
                                title="Edit Asset">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm"
                                onclick="onDeleteClick(
                                    event, ${a.id}, '${safeSn}'
                                )"
                                title="Delete Asset">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ─── VIEW MODAL ───────────────────────────────────────────────────
async function viewAsset(id) {
    assetViewId = id;
    const asset = allAssets.find(x => x.id === id);

    if (asset) {
        renderViewModal(asset);
        openModal('view_asset');
        loadTransferHistory(id);
    } else {
        showToast('Could not find asset.', 'error');
    }
}

function renderViewModal(a) {
    // DRY Principle: Use safeSetText instead of direct assignment
    safeSetText('view_asset_title', `📦 ${a.description}`);

    const bodyEl = document.getElementById('view_asset_body');
    if (!bodyEl) {
        return; // SAFEGUARD
    }

    const dateEndorsed = a.date_endorsed
        ? formatDate(a.date_endorsed)
        : '⏳ Pending';

    bodyEl.innerHTML = `
        <div class="modal-section-title">
            Purchase Order Info
        </div>
        <div class="field-grid">
            <div class="form-field">
                <label>PO Number</label>
                <div class="info-field">
                    <div class="val val-mono">
                        ${escapeHtml(a.po_number ?? '—')}
                    </div>
                </div>
            </div>
            <div class="form-field">
                <label>Vendor</label>
                <div class="info-field">
                    <div class="val">
                        ${escapeHtml(a.vendor_name ?? '—')}
                    </div>
                </div>
            </div>
        </div>
        <div class="field-grid">
            <div class="form-field">
                <label>Date Received</label>
                <div class="info-field">
                    <div class="val">
                        ${formatDate(a.date_received)}
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
        <div class="modal-section-title">Assignment</div>
        <div class="field-grid">
            <div class="form-field">
                <label>Location</label>
                <div class="info-field">
                    <div class="val">
                        ${escapeHtml(a.location_name ?? '—')}
                    </div>
                </div>
            </div>
            <div class="form-field">
                <label>Process Owner</label>
                <div class="info-field">
                    <div class="val">
                        ${escapeHtml(a.owner_name ?? '—')}
                    </div>
                </div>
            </div>
        </div>
        <div class="field-grid">
            <div class="form-field">
                <label>Category</label>
                <div class="info-field">
                    <div class="val">
                        ${escapeHtml(a.category_name ?? '—')}
                    </div>
                </div>
            </div>
            <div class="form-field">
                <label>Status</label>
                <div class="info-field">
                    ${statusTag(a.status)}
                </div>
            </div>
        </div>
        <div class="modal-section-title">Serial Number</div>
        <div style="margin:8px 0">
            <span class="serial-chip">
                ${escapeHtml(a.serial_number)}
            </span>
        </div>
        <div class="modal-section-title">Remarks</div>
        <div class="info-field">
            <div class="val">
                ${escapeHtml(a.remarks || 'No remarks')}
            </div>
        </div>`;
}

function editAssetFromView() {
    closeModal('view_asset');
    openEditAsset(assetViewId);
}

async function loadTransferHistory(assetId) {
    const section = document.getElementById('view_transfer_section');
    const body    = document.getElementById('view_transfer_body');
    if (!section || !body) return;

    try {
        const res = await apiFetch(
            `/src/api/assets.php?id=${assetId}&action=transfers`
        );
        const rows = res.data || [];

        if (!rows.length) {
            section.style.display = 'none';
            return;
        }

        section.style.display = '';
        body.innerHTML = rows.map(r => {
            const locChange = (r.from_location || r.to_location)
                ? `<span style="font-size:11px;color:var(--white-3)">
                       📍 ${escapeHtml(r.from_location ?? '—')}
                       → ${escapeHtml(r.to_location ?? '—')}
                   </span>` : '';

            const ownChange = (r.from_owner || r.to_owner)
                ? `<span style="font-size:11px;color:var(--white-3)">
                       👤 ${escapeHtml(r.from_owner ?? '—')}
                       → ${escapeHtml(r.to_owner ?? '—')}
                   </span>` : '';

            const note = r.notes
                ? `<span class="cell-date"
                           style="font-size:11px;font-style:italic">
                       "${escapeHtml(r.notes)}"
                   </span>` : '';

            return `
                <div class="activity-item">
                    <div class="activity-avatar">
                        ${(r.transferred_by ?? '?')[0].toUpperCase()}
                    </div>
                    <div style="display:flex;
                                flex-direction:column;gap:2px;flex:1">
                        <div style="display:flex;
                                    gap:8px;flex-wrap:wrap">
                            ${locChange}
                            ${ownChange}
                        </div>
                        ${note}
                        <div class="activity-time">
                            ${escapeHtml(r.transferred_by ?? '—')}
                            · ${formatDate(r.transferred_at)}
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('loadTransferHistory error:', err);
        section.style.display = 'none';
    }
}

// ─── ADD / EDIT ───────────────────────────────────────────────────
function openAddAsset() {
    // DRY Principle: Use safeSetText instead of direct assignment
    safeSetText('asset_modal_title', '📦 Add New Asset');

    [
        'asset_edit_id', 'asset_serial', 'asset_desc',
        'asset_po', 'asset_location', 'asset_owner',
        'asset_remarks', 'asset_vendor', 'asset_serials_bulk',
        'asset_status',
    ].forEach(id => safeSetVal(id, ''));

    resetSearchableSelect('asset_category', '— Select Category —');
    resetSearchableSelect('asset_location', '— Select Location —');
    resetSearchableSelect('asset_owner', '— Select Owner —');

    clearAllFieldErrors();

    const serialEl = document.getElementById('asset_serial');
    if (serialEl) {
        serialEl.removeAttribute('readonly');
    }

    hidePoAutofillHint();
    setAssetMode('single');
    showModeToggle(true);
    openModal('add_asset');
}

function openEditAsset(id) {
    const a = allAssets.find(x => x.id === id);
    if (!a) {
        showToast('Could not load asset for editing.', 'error');
        return;
    }

    // DRY Principle: Use safeSetText instead of direct assignment
    safeSetText('asset_modal_title', '✏️ Edit Asset');

    safeSetVal('asset_edit_id', id);
    safeSetVal('asset_serial',  a.serial_number);
    safeSetVal('asset_desc',    a.description);
    safeSetVal('asset_status',  a.status);
    safeSetVal('asset_po',      a.po_id       ?? '');
    safeSetVal('asset_vendor',  a.vendor_name ?? '');
    safeSetVal('asset_remarks', a.remarks     ?? '');

    setSearchableSelectValue('asset_category', a.category_id ?? '');
    setSearchableSelectValue('asset_location', a.location_id ?? '');
    setSearchableSelectValue('asset_owner',    a.owner_id ?? '');

    clearAllFieldErrors();

    const serialEl = document.getElementById('asset_serial');
    if (serialEl) {
        serialEl.setAttribute('readonly', true);
    }

    hidePoAutofillHint();
    showModeToggle(false);
    setAssetMode('single');
    openModal('add_asset');
}

// ─── FIELD VALIDATION ─────────────────────────────────────────────
function clearFieldError(fieldId) {
    safeSetText(`err_${fieldId}`, '');
    const el = document.getElementById(fieldId);
    if (el) {
        el.classList.remove('has-error');
    }
}

function clearAllFieldErrors() {
    document.querySelectorAll('.field-error')
        .forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.has-error')
        .forEach(el => el.classList.remove('has-error'));
    document.querySelectorAll('.searchable-select-trigger')
        .forEach(el => el.classList.remove('has-error'));
}

function showFieldError(fieldId, msg) {
    safeSetText(`err_${fieldId}`, msg);
    const el = document.getElementById(fieldId);
    if (el) {
        el.classList.add('has-error');
    }
}

function validateAssetForm(isBulk = false) {
    clearAllFieldErrors();

    const status     = getVal('asset_status');
    const desc       = getVal('asset_desc');
    const categoryId = getVal('asset_category');
    const locationId = getVal('asset_location');
    const ownerId    = getVal('asset_owner');

    let isValid = true;

    if (!isBulk) {
        const serial = getVal('asset_serial');
        if (!serial) {
            showFieldError('asset_serial', 'Required.');
            isValid = false;
        }
    } else {
        const raw = getVal('asset_serials_bulk');
        if (!parseSerialInput(raw).length) {
            showFieldError('asset_serials_bulk', 'Required.');
            isValid = false;
        }
    }

    if (!desc) {
        showFieldError('asset_desc', 'Description is required.');
        isValid = false;
    }
    if (!categoryId) {
        showSelectError('asset_category', 'Select a category.');
        isValid = false;
    }
    if (!status) {
        showFieldError('asset_status', 'Select a status.');
        isValid = false;
    }
    if (!locationId) {
        showSelectError('asset_location', 'Select a location.');
        isValid = false;
    }
    if (!ownerId) {
        showSelectError('asset_owner', 'Select a process owner.');
        isValid = false;
    }

    return isValid;
}

// ─── SAVE ─────────────────────────────────────────────────────────
async function saveAsset() {
    const id = getVal('asset_edit_id');

    if (assetMode === 'bulk' && !id) {
        await saveBulkAssets();
        return;
    }

    if (!validateAssetForm(false)) return;

    const payload = {
        serial_number: getVal('asset_serial'),
        description:   getVal('asset_desc'),
        category_id:   getVal('asset_category'),
        status:        getVal('asset_status'),
        po_id:         getVal('asset_po') || null,
        location_id:   getVal('asset_location'),
        owner_id:      getVal('asset_owner'),
        remarks:       getVal('asset_remarks') || '',
    };

    const isEdit = !!id;
    const url    = isEdit
        ? `/src/api/assets.php?id=${id}`
        : '/src/api/assets.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_asset');
        showToast(
            `Asset ${isEdit ? 'updated' : 'created'} successfully.`,
            'success'
        );
        fetchInitialAssets();
    } catch (err) {
        console.error('saveAsset error:', err);
        showToast(err.message, 'error');
    }
}

async function saveBulkAssets() {
    if (!validateAssetForm(true)) return;

    const payload = {
        serials:      parseSerialInput(getVal('asset_serials_bulk')),
        description:  getVal('asset_desc'),
        category_id:  getVal('asset_category'),
        status:       getVal('asset_status'),
        po_id:        getVal('asset_po') || null,
        location_id:  getVal('asset_location'),
        owner_id:     getVal('asset_owner'),
        remarks:      getVal('asset_remarks') || '',
    };

    try {
        const res = await apiFetch(
            '/src/api/assets.php?action=bulk',
            { method: 'POST', body: JSON.stringify(payload) }
        );

        closeModal('add_asset');
        const { inserted, skipped } = res.data;
        let   msg = `${inserted} asset(s) created.`;
        
        if (skipped.length) {
            msg += ` ${skipped.length} skipped (duplicates).`;
        }

        showToast(msg, inserted ? 'success' : 'error');
        fetchInitialAssets();
    } catch (err) {
        console.error('saveBulkAssets error:', err);
        showToast(err.message, 'error');
    }
}

// ─── DELETE ───────────────────────────────────────────────────────
function deleteAsset(id, serial) {
    showConfirm(
        'Delete Asset',
        `Delete asset SN: ${serial}? This cannot be undone.`,
        async () => {
            try {
                await apiFetch(`/src/api/assets.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Asset deleted.', 'success');
                fetchInitialAssets();
            } catch (err) {
                console.error('deleteAsset error:', err);
                showToast(err.message, 'error');
            }
        }
    );
}

// ─── MODE TOGGLE ──────────────────────────────────────────────────
function setAssetMode(mode) {
    assetMode = mode;
    const isBulk = mode === 'bulk';

    const singleField = document.getElementById('field_single_serial');
    const bulkField   = document.getElementById('field_bulk_serials');
    const hintEl      = document.getElementById('asset_mode_hint');
    const saveLabel   = document.getElementById('asset_save_label');
    const btnSingle   = document.getElementById('btn_mode_single');
    const btnBulk     = document.getElementById('btn_mode_bulk');

    if (singleField) singleField.style.display = isBulk ? 'none' : '';
    if (bulkField) bulkField.style.display = isBulk ? '' : 'none';
    
    if (hintEl) {
        hintEl.textContent = isBulk
            ? 'Paste multiple serials — one per line'
            : 'Single serial entry';
    }
    
    if (saveLabel) {
        saveLabel.textContent = isBulk ? 'Save All' : 'Save Asset';
    }
    
    if (btnSingle) {
        btnSingle.className = isBulk
            ? 'btn btn-secondary btn-sm'
            : 'btn btn-primary btn-sm';
    }
    
    if (btnBulk) {
        btnBulk.className = isBulk
            ? 'btn btn-primary btn-sm'
            : 'btn btn-secondary btn-sm';
    }

    updateBulkCount();
}

function showModeToggle(isVisible) {
    const el = document.getElementById('asset_mode_toggle');
    if (el) el.style.display = isVisible ? '' : 'none';
}

function updateBulkCount() {
    const countEl = document.getElementById('bulk_sn_count');
    if (!countEl) return;
    
    const n = parseSerialInput(getVal('asset_serials_bulk')).length;
    countEl.textContent =
        `${n} serial number${n !== 1 ? 's' : ''} detected`;
}

function parseSerialInput(raw) {
    return raw
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
}

// ─── SMART PO AUTO-FILL ───────────────────────────────────────────
async function onPoChange(selectEl) {
    const poId = selectEl.value;
    hidePoAutofillHint();

    if (!poId) {
        safeSetVal('asset_vendor', '');
        return;
    }

    const opt = selectEl.options[selectEl.selectedIndex];
    if (opt?.dataset?.vendorName) {
        safeSetVal('asset_vendor', opt.dataset.vendorName);
    }

    try {
        const res = await apiFetch(
            `/src/api/po_hints.php?po_id=${poId}`
        );
        applyPoHints(res.data);
    } catch (err) {
        console.error('onPoChange hint error:', err);
    }
}

function applyPoHints(hints) {
    if (!hints) return;
    const filled = [];

    if (hints.vendor_name) {
        safeSetVal('asset_vendor', hints.vendor_name);
    }
    if (hints.location_id) {
        setSearchableSelectValue('asset_location', hints.location_id);
        filled.push('Location');
    }
    if (hints.owner_id) {
        setSearchableSelectValue('asset_owner', hints.owner_id);
        filled.push('Process Owner');
    }
    if (hints.category_id) {
        setSearchableSelectValue('asset_category', hints.category_id);
        filled.push('Category');
    }
    if (hints.description) {
        safeSetVal('asset_desc', hints.description);
        filled.push('Description');
    }

    if (filled.length) showPoAutofillHint(filled);
}

function showPoAutofillHint(fields) {
    const wrap = document.getElementById('po_autofill_hint');
    const msg  = document.getElementById('po_autofill_msg');
    
    if (!wrap || !msg) return;
    
    msg.textContent =
        `Auto-filled from PO history: ${fields.join(', ')}. `
        + 'You can override any field.';
    wrap.style.display = '';
}

function hidePoAutofillHint() {
    const wrap = document.getElementById('po_autofill_hint');
    if (wrap) wrap.style.display = 'none';
}

// ─── DROPDOWNS ────────────────────────────────────────────────────
async function populateAssetFormDropdowns() {
    await Promise.all([
        populateSearchableSelectFromApi(
            'asset_category',
            '/src/api/categories.php',
            'id', 'name', '— Select Category —'
        ),
        populateSearchableSelectFromApi(
            'asset_location',
            '/src/api/locations.php',
            'id', 'name', '— Select Location —'
        ),
        populateSearchableSelectFromApi(
            'asset_owner',
            '/src/api/process_owners.php',
            'id', 'name', '— Select Owner —'
        ),
        populateSelect(
            'asset_po',
            '/src/api/purchase_orders.php',
            'id', 'po_number',
            { dataKey: 'vendor_name', dataAttr: 'vendorName' }
        ),
        populateSelect(
            'filter_category',
            '/src/api/categories.php',
            'id', 'name'
        ),
        populateSelect(
            'filter_location',
            '/src/api/locations.php',
            'id', 'name'
        ),
        populateSelect(
            'filter_owner',
            '/src/api/process_owners.php',
            'id', 'name'
        ),
    ]);
}

async function populateSearchableSelectFromApi(
    fieldId, url, valKey, lblKey, placeholder
) {
    try {
        const data  = await apiFetch(`${url}?per_page=500`);
        const items = data.data ?? [];
        populateSearchableSelect(
            fieldId, items, valKey, lblKey, placeholder
        );
    } catch (err) {
        console.error('populateSearchableSelectFromApi error:', err);
    }
}

async function populateSelect(
    selId, url, valKey, lblKey, extra = null
) {
    const el = document.getElementById(selId);
    if (!el) return;

    try {
        const data  = await apiFetch(`${url}?per_page=500`);
        const items = data.data ?? [];

        items.forEach(item => {
            const opt       = document.createElement('option');
            opt.value       = item[valKey];
            opt.textContent = item[lblKey];

            if (extra?.dataKey) {
                opt.dataset[extra.dataAttr] = item[extra.dataKey] ?? '';
            }
            el.appendChild(opt);
        });
    } catch (err) {
        console.error(`populateSelect(${selId}) error:`, err);
    }
}

// ─── EXPORT ───────────────────────────────────────────────────────
async function exportToExcel() {
    const params = new URLSearchParams({
        action:      'export',
        status:      getVal('filter_status'),
        category_id: getVal('filter_category'),
        location_id: getVal('filter_location'),
        owner_id:    getVal('filter_owner'),
        search:      getVal('asset_search'),
    });

    window.location.href = `/src/api/import_export.php?${params}`;
}

// ─── IMPORT ───────────────────────────────────────────────────────
var importFile = null;

function openImportModal() {
    importFile = null;
    safeSetVal('import_file', '');
    safeSetText('import_zone_label', 'Drop your .xlsx file here');

    const submitBtn = document.getElementById('import_submit_btn');
    if (submitBtn) submitBtn.disabled = true;

    showImportStep('upload');
    openModal('import_assets');
}

function showImportStep(step) {
    ['upload', 'progress', 'results'].forEach(s => {
        const el = document.getElementById(`import_step_${s}`);
        if (el) el.style.display = s === step ? '' : 'none';
    });

    const footer = document.getElementById('import_modal_footer');
    if (!footer) return;

    if (step === 'results') {
        footer.innerHTML = `
            <button class="btn btn-secondary"
                    onclick="closeModal('import_assets')">
                Close
            </button>
            <button class="btn btn-primary"
                    onclick="openImportModal()">
                Import Another
            </button>`;
    } else if (step === 'upload') {
        footer.innerHTML = `
            <button class="btn btn-secondary"
                    onclick="closeModal('import_assets')">
                Cancel
            </button>`;
    } else {
        footer.innerHTML = '';
    }
}

function onImportFileSelected(input) {
    const file = input.files[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
        showToast('Only .xlsx files are accepted.', 'error');
        input.value = '';
        return;
    }

    importFile = file;
    const sizeStr = file.size > 1048576
        ? (file.size / 1048576).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(0) + ' KB';

    safeSetText(
        'import_zone_label', 
        `✓ ${file.name} (${sizeStr})`
    );

    const submitBtn = document.getElementById('import_submit_btn');
    if (submitBtn) submitBtn.disabled = false;
}

function setupImportDropZone() {
    const zone = document.getElementById('import_drop_zone');
    const inp  = document.getElementById('import_file');
    if (!zone || !inp) return;

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');

        const f = e.dataTransfer.files[0];
        if (!f) return;

        const dt = new DataTransfer();
        dt.items.add(f);
        inp.files = dt.files;
        onImportFileSelected(inp);
    });
}

async function submitImport() {
    if (!importFile) return;
    showImportStep('progress');

    const fd = new FormData();
    fd.append('import_file', importFile);

    try {
        const res = await fetch(
            '/src/api/import_export.php?action=import',
            {
                method:  'POST',
                headers: { 'X-CSRF-Token': getCsrfToken() },
                body: fd,
            }
        );

        const json = await res.json();
        if (!json.success && !json.data) {
            throw new Error(json.message ?? 'Import failed.');
        }

        renderImportResults(json.data);
        showImportStep('results');

        if (json.data.success > 0) fetchInitialAssets();
    } catch (err) {
        showImportStep('upload');
        showToast(err.message ?? 'Import failed.', 'error');
    }
}

function renderImportResults(r) {
    const inserted = r.success      ?? 0;
    const failed   = r.failed       ?? 0;
    const infDupes = r.infile_dupes ?? [];
    const dbDupes  = r.db_dupes     ?? [];
    const errors   = r.errors       ?? [];

    let html = `
        <div style="display:flex;gap:12px;margin-bottom:18px">
            <div style="flex:1;background:var(--green-dim);
                        border:1px solid rgba(34,197,94,.25);
                        border-radius:var(--radius-sm);
                        padding:14px;text-align:center">
                <div style="font-size:28px;font-weight:800;
                            color:var(--green)">
                    ${inserted}
                </div>
                <div style="font-size:11px;
                            color:var(--white-3);
                            margin-top:2px">
                    Imported
                </div>
            </div>
            <div style="flex:1;background:var(--red-dim);
                        border:1px solid rgba(239,68,68,.25);
                        border-radius:var(--radius-sm);
                        padding:14px;text-align:center">
                <div style="font-size:28px;font-weight:800;
                            color:var(--red)">
                    ${failed}
                </div>
                <div style="font-size:11px;
                            color:var(--white-3);
                            margin-top:2px">
                    Skipped
                </div>
            </div>
        </div>`;

    if (infDupes.length) {
        html += buildResultSection(
            '⚠️ Duplicate within file',
            `${infDupes.length} serial(s) appeared more than once:`,
            infDupes, 'var(--yellow)', 'rgba(245,158,11,.15)'
        );
    }

    if (dbDupes.length) {
        html += buildResultSection(
            '🔁 Already in system',
            `${dbDupes.length} serial(s) already exist:`,
            dbDupes, 'var(--accent)', 'var(--navy-2)'
        );
    }

    if (errors.length) {
        html += buildResultSection(
            '❌ Row errors',
            `${errors.length} row(s) had errors:`,
            errors, 'var(--red)', 'var(--red-dim)'
        );
    }

    if (!infDupes.length && !dbDupes.length && !errors.length && inserted > 0) {
        html += `
            <div style="text-align:center;padding:8px 0;
                        font-size:13px;color:var(--green)">
                ✅ All rows imported successfully!
            </div>`;
    }

    const bodyEl = document.getElementById('import_results_body');
    if (bodyEl) bodyEl.innerHTML = html;
}

function buildResultSection(
    title, desc, items, borderColor, bgColor
) {
    const rows = items.map(item => `
        <div style="background:${bgColor};
                    border:1px solid var(--border);
                    border-left:3px solid ${borderColor};
                    border-radius:6px;padding:7px 10px;
                    font-size:12px;color:var(--white-3);
                    font-family:monospace">
            ${escapeHtml(String(item))}
        </div>`).join('');

    return `
        <div style="margin-bottom:14px">
            <div style="font-size:12px;font-weight:600;
                        color:var(--white-2);margin-bottom:4px">
                ${title}
                <span class="tag"
                        style="font-size:11px;margin-left:4px">
                    ${items.length}
                </span>
            </div>
            <div style="font-size:11px;color:var(--white-4);
                        margin-bottom:8px">
                ${desc}
            </div>
            <div style="max-height:160px;overflow-y:auto;
                        display:flex;flex-direction:column;
                        gap:4px">
                ${rows}
            </div>
        </div>`;
}