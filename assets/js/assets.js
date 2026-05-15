// assets/js/assets.js

let currentPage   = 1;
let currentSort   = 'a.created_at';
let currentDir    = 'desc';
let currentViewId = null;

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const safeSetVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
};

const getVal = (id) => document.getElementById(id)?.value.trim() ?? '';

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const debounceSearch = debounce(() => {
    currentPage = 1;
    loadAssets(1);
}, 350);

// ─── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSearch = urlParams.get('search');

    if (urlSearch) {
        const searchEl = document.getElementById('asset_search');
        if (searchEl) searchEl.value = urlSearch;
    }

    loadAssets(1);
    populateAssetFormDropdowns();
});

// ─── SORT & FILTERS ─────────────────────────────────────────────────────────
function sortAssets(col) {
    if (currentSort === col) {
        currentDir = currentDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort = col;
        currentDir  = 'asc';
    }
    currentPage = 1;
    updateSortIcons();
    loadAssets(1);
}

function updateSortIcons() {
    document.querySelectorAll('.sort-icon').forEach(el => {
        el.className = 'bi bi-arrow-down-up sort-icon';
        el.style.opacity = '0.35';
    });
    
    const active = document.getElementById(`sort_${currentSort}`);
    if (active) {
        const dirClass = currentDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
        active.className = `bi ${dirClass} sort-icon`;
        active.style.opacity = '1';
        active.style.color   = 'var(--accent)';
    }
}

function clearAssetFilters() {
    ['asset_search', 'filter_status', 'filter_category', 
     'filter_location', 'filter_owner'].forEach(id => safeSetVal(id, ''));
     
    currentSort = 'a.created_at';
    currentDir  = 'desc';
    
    updateSortIcons();
    loadAssets(1);
}

function onPerPageChange() { 
    currentPage = 1; 
    loadAssets(1); 
}

// ─── LOAD & RENDER ──────────────────────────────────────────────────────────
async function loadAssets(page = currentPage) {
    currentPage = page;

    const params = new URLSearchParams({
        page:        page,
        per_page:    getVal('asset_per_page') || 25,
        search:      getVal('asset_search'),
        status:      getVal('filter_status'),
        category_id: getVal('filter_category'),
        location_id: getVal('filter_location'),
        owner_id:    getVal('filter_owner'),
        sort:        currentSort,
        dir:         currentDir,
    });

    const tbody = document.getElementById('assets_body');
    tbody.innerHTML = `
        <tr>
            <td colspan="9" 
                style="text-align:center;padding:30px;color:var(--white-4)">
                <i class="bi bi-arrow-repeat" 
                   style="animation:spin 1s linear infinite"></i> Loading...
            </td>
        </tr>`;

    try {
        const data = await apiFetch(`/src/api/assets.php?${params}`);
        renderAssetTable(data.data);
        renderPagination('assets_pagination', data.pagination, 'loadAssets');
        renderCounter(data.pagination);
    } catch (err) {
        console.error('loadAssets error:', err);
        showToast('Failed to load assets.', 'error');
    }
}

function renderCounter(pg) {
    const el = document.getElementById('asset_counter');
    if (!el || !pg) return;
    
    if (pg.total === 0) { 
        el.textContent = 'No results'; 
        return; 
    }
    
    const start = (pg.page - 1) * pg.per_page + 1;
    const end   = Math.min(pg.page * pg.per_page, pg.total);
    el.textContent = `${start}–${end} of ${pg.total}`;
}

function renderAssetTable(assets) {
    const tbody = document.getElementById('assets_body');

    if (!assets.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <div class="empty-state__icon">📦</div>
                        <div class="empty-state__title">No assets found</div>
                        <div class="empty-state__desc">
                            Try adjusting your search or filters.
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const isAdminUser = typeof IS_ADMIN !== 'undefined' && IS_ADMIN;

    tbody.innerHTML = assets.map(a => {
        const adminBtn = isAdminUser ? `
            <button class="btn btn-danger btn-sm" 
                    onclick="deleteAsset(${a.id}, 
                    '${escapeHtml(a.serial_number)}')" title="Delete">
                <i class="bi bi-trash"></i>
            </button>` : '';

        return `
            <tr>
                <td>
                    <span class="serial-chip">
                        ${escapeHtml(a.serial_number)}
                    </span>
                </td>
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
                <td class="cell-date">${formatDate(a.date_received)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm"
                                onclick="viewAsset(${a.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-secondary btn-sm"
                                onclick="openEditAsset(${a.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${adminBtn}
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ─── VIEW MODAL ─────────────────────────────────────────────────────────────
async function viewAsset(id) {
    currentViewId = id;

    try {
        const data = await apiFetch(`/src/api/assets.php?id=${id}`);
        renderViewModal(data.data);
        openModal('view_asset');
    } catch (err) {
        console.error('viewAsset error:', err);
        showToast('Could not load asset details.', 'error');
    }
}

function renderViewModal(a) {
    const titleEl = document.getElementById('view_asset_title');
    titleEl.textContent = `📦 ${a.description}`;
    
    const dateEndorsed = a.date_endorsed 
        ? formatDate(a.date_endorsed) 
        : '⏳ Pending';
        
    const remarksCls = a.remarks ? '' : 'val-empty';
    const remarksTxt = a.remarks ? escapeHtml(a.remarks) : 'No remarks';

    document.getElementById('view_asset_body').innerHTML = `
        <div class="modal-section-title">Purchase Order Info</div>
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
                    <div class="val">${escapeHtml(a.vendor_name ?? '—')}</div>
                </div>
            </div>
        </div>
        <div class="field-grid">
            <div class="form-field">
                <label>Date Received</label>
                <div class="info-field">
                    <div class="val">${formatDate(a.date_received)}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Date Endorsed</label>
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
                    <div class="val">${escapeHtml(a.location_name ?? '—')}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Process Owner</label>
                <div class="info-field">
                    <div class="val">${escapeHtml(a.owner_name ?? '—')}</div>
                </div>
            </div>
        </div>
        <div class="field-grid">
            <div class="form-field">
                <label>Category</label>
                <div class="info-field">
                    <div class="val">${escapeHtml(a.category_name ?? '—')}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Status</label>
                <div class="info-field">${statusTag(a.status)}</div>
            </div>
        </div>
        <div class="modal-section-title">Serial Number</div>
        <div class="serial-chip-wrap">
            <span class="serial-chip">${escapeHtml(a.serial_number)}</span>
        </div>
        <div class="modal-section-title">Remarks</div>
        <div class="info-field">
            <div class="val ${remarksCls}">${remarksTxt}</div>
        </div>
    `;
}

function editAssetFromView() {
    closeModal('view_asset');
    openEditAsset(currentViewId);
}

// ─── ADD / EDIT / DELETE ────────────────────────────────────────────────────
function openAddAsset() {
    document.getElementById('asset_modal_title').textContent = 
        '📦 Add New Asset';
        
    ['asset_edit_id','asset_serial','asset_desc','asset_category',
     'asset_po','asset_location','asset_owner','asset_remarks',
     'asset_vendor'].forEach(id => safeSetVal(id, ''));

    safeSetVal('asset_status', 'active');
    
    const serialEl = document.getElementById('asset_serial');
    if (serialEl) serialEl.removeAttribute('readonly');
    
    openModal('add_asset');
}

async function openEditAsset(id) {
    try {
        const data = await apiFetch(`/src/api/assets.php?id=${id}`);
        const a    = data.data;

        document.getElementById('asset_modal_title').textContent = 
            '✏️ Edit Asset';
            
        safeSetVal('asset_edit_id',  id);
        safeSetVal('asset_serial',   a.serial_number);
        safeSetVal('asset_desc',     a.description);
        safeSetVal('asset_category', a.category_id ?? '');
        safeSetVal('asset_status',   a.status);
        safeSetVal('asset_po',       a.po_id       ?? '');
        safeSetVal('asset_vendor',   a.vendor_name ?? '');
        safeSetVal('asset_location', a.location_id ?? '');
        safeSetVal('asset_owner',    a.owner_id    ?? '');
        safeSetVal('asset_remarks',  a.remarks     ?? '');

        const serialEl = document.getElementById('asset_serial');
        if (serialEl) serialEl.setAttribute('readonly', true);
        
        openModal('add_asset');
    } catch (err) {
        console.error('openEditAsset error:', err);
        showToast('Could not load asset for editing.', 'error');
    }
}

async function saveAsset() {
    const id         = getVal('asset_edit_id');
    const serial     = getVal('asset_serial');
    const desc       = getVal('asset_desc');
    const categoryId = getVal('asset_category');
    const status     = getVal('asset_status');
    const poId       = getVal('asset_po');
    const locationId = getVal('asset_location');
    const ownerId    = getVal('asset_owner');
    const remarks    = getVal('asset_remarks');

    if (!serial || !desc || !categoryId) {
        showToast('Serial, description, and category are required.', 'error');
        return;
    }

    const payload = {
        serial_number: serial,
        description:   desc,
        category_id:   categoryId,
        status:        status,
        po_id:         poId       || null,
        location_id:   locationId || null,
        owner_id:      ownerId    || null,
        remarks:       remarks,
    };

    const isEdit = !!id;
    const url    = isEdit ? `/src/api/assets.php?id=${id}` : '/src/api/assets.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_asset');
        showToast(
            `Asset ${isEdit ? 'updated' : 'created'} successfully.`, 
            'success'
        );
        loadAssets(currentPage);
    } catch (err) {
        console.error('saveAsset error:', err);
        showToast(err.message, 'error');
    }
}

function deleteAsset(id, serial) {
    const msg = `Delete asset SN: ${serial}? This cannot be undone.`;
    showConfirm('Delete Asset', msg, async () => {
        try {
            await apiFetch(`/src/api/assets.php?id=${id}`, { 
                method: 'DELETE' 
            });
            showToast('Asset deleted.', 'success');
            loadAssets(currentPage);
        } catch (err) { 
            showToast(err.message, 'error'); 
        }
    });
}

// ─── DROPDOWNS ──────────────────────────────────────────────────────────────
async function populateAssetFormDropdowns() {
    await Promise.all([
        populateSelect('asset_category',  '/src/api/categories.php',     
                       'id', 'name'),
        populateSelect('asset_po',        '/src/api/purchase_orders.php',
                       'id', 'po_number', 'vendor_name'),
        populateSelect('asset_location',  '/src/api/locations.php',      
                       'id', 'name'),
        populateSelect('asset_owner',     '/src/api/process_owners.php', 
                       'id', 'name'),
        populateSelect('filter_category', '/src/api/categories.php',     
                       'id', 'name'),
        populateSelect('filter_location', '/src/api/locations.php',      
                       'id', 'name'),
        populateSelect('filter_owner',    '/src/api/process_owners.php', 
                       'id', 'name'),
    ]);
}

async function populateSelect(selId, url, valKey, lblKey, extraKey = null) {
    const el = document.getElementById(selId);
    if (!el) return;

    try {
        const data  = await apiFetch(`${url}?per_page=500`);
        const items = data.data ?? [];

        items.forEach(item => {
            const opt       = document.createElement('option');
            opt.value       = item[valKey];
            opt.textContent = item[lblKey];
            
            if (extraKey) {
                opt.dataset[extraKey] = item[extraKey] ?? '';
            }
            el.appendChild(opt);
        });
    } catch (err) {
        console.error(`populateSelect(${selId}) error:`, err);
    }
}

function onPoChange(selectEl) {
    const sel = selectEl.options[selectEl.selectedIndex];
    safeSetVal('asset_vendor', sel?.dataset?.vendorName || '');
}

// ─── EXPORT & IMPORT ────────────────────────────────────────────────────────
async function exportAssets() {
    const status = getVal('filter_status');
    const catId  = getVal('filter_category');
    const locId  = getVal('filter_location');
    const search = getVal('asset_search');

    const params = new URLSearchParams({ 
        action:      'export', 
        status:      status, 
        category_id: catId,
        location_id: locId,
        search:      search
    });
    
    window.location.href = `/src/api/import_export.php?${params}`;
}

let importFile = null;

function openImportModal() {
    importFile = null;
    safeSetVal('import_file', '');
    
    const zoneLabel = document.getElementById('import_zone_label');
    if (zoneLabel) zoneLabel.textContent = 'Drop your .xlsx file here';
    
    const submitBtn = document.getElementById('import_submit_btn');
    if (submitBtn) submitBtn.disabled = true;
    
    showImportStep('upload');
    openModal('import_assets');
}

function showImportStep(step) {
    ['upload','progress','results'].forEach(s => {
        const el = document.getElementById(`import_step_${s}`);
        if (el) el.style.display = s === step ? '' : 'none';
    });
        
    const footer = document.getElementById('import_modal_footer');
    if (!footer) return;
    
    if (step === 'results') {
        footer.innerHTML = `
            <button class="btn btn-secondary" 
                    onclick="closeModal('import_assets')">Close</button>
            <button class="btn btn-primary" 
                    onclick="openImportModal()">Import Another</button>
        `;
    } else if (step === 'upload') {
        footer.innerHTML = `
            <button class="btn btn-secondary" 
                    onclick="closeModal('import_assets')">Cancel</button>
        `;
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
    const mb = file.size / 1048576;
    const kb = file.size / 1024;
    const sizeStr = file.size > 1048576 
        ? mb.toFixed(1) + ' MB' 
        : kb.toFixed(0) + ' KB';
        
    const zoneLabel = document.getElementById('import_zone_label');
    if (zoneLabel) {
        zoneLabel.textContent = `✓ ${file.name} (${sizeStr})`;
    }
    
    const submitBtn = document.getElementById('import_submit_btn');
    if (submitBtn) submitBtn.disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
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
});

async function submitImport() {
    if (!importFile) return;
    showImportStep('progress');
    
    const fd = new FormData();
    fd.append('import_file', importFile);
    
    try {
        const res  = await fetch('/src/api/import_export.php?action=import', {
            method:  'POST', 
            headers: { 'X-CSRF-Token': getCsrfToken() }, 
            body:    fd,
        });
        
        const json = await res.json();
        
        if (!json.success && !json.data) {
            throw new Error(json.message ?? 'Import failed.');
        }
        
        renderImportResults(json.data);
        showImportStep('results');
        
        if (json.data.success > 0) loadAssets(1);
    } catch (err) {
        showImportStep('upload');
        showToast(err.message ?? 'Import failed.', 'error');
    }
}

function renderImportResults(r) {
    let html = `
        <div style="display:flex;gap:12px;margin-bottom:18px">
            <div style="flex:1;background:var(--green-dim);
                        border:1px solid rgba(34,197,94,.25);
                        border-radius:var(--radius-sm);padding:14px;
                        text-align:center">
                <div style="font-size:28px;font-weight:800;
                            color:var(--green)">
                    ${r.success}
                </div>
                <div style="font-size:11px;color:var(--white-3);
                            margin-top:2px">
                    Imported
                </div>
            </div>
            <div style="flex:1;background:var(--red-dim);
                        border:1px solid rgba(239,68,68,.25);
                        border-radius:var(--radius-sm);padding:14px;
                        text-align:center">
                <div style="font-size:28px;font-weight:800;
                            color:var(--red)">
                    ${r.failed}
                </div>
                <div style="font-size:11px;color:var(--white-3);
                            margin-top:2px">
                    Skipped
                </div>
            </div>
        </div>`;
        
    if (r.errors?.length) {
        html += `
            <div style="font-size:11px;font-weight:700;
                        text-transform:uppercase;letter-spacing:1px;
                        color:var(--white-4);margin-bottom:8px">
                Skipped Rows
            </div>
            <div style="max-height:200px;overflow-y:auto;display:flex;
                        flex-direction:column;gap:4px">
                ${r.errors.map(e => `
                    <div style="background:var(--navy-2);
                                border:1px solid var(--border);
                                border-left:3px solid var(--red);
                                border-radius:6px;padding:7px 10px;
                                font-size:12px;color:var(--white-3)">
                        ${escapeHtml(e)}
                    </div>`).join('')}
            </div>`;
    } else if (r.success > 0) {
        html += `
            <div style="text-align:center;padding:8px 0;font-size:13px;
                        color:var(--green)">
                ✅ All rows imported successfully!
            </div>`;
    }
    
    document.getElementById('import_results_body').innerHTML = html;
}