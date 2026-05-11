// assets/js/assets.js

let currentPage = 1;
let currentViewId = null;

const debounceSearch = debounce(value => {
    currentPage = 1;
    loadAssets(1);
}, 350);

document.addEventListener('DOMContentLoaded', () => {
    loadAssets(1);
    populateAssetFormDropdowns();
});

// ===== LOAD ASSETS =====
async function loadAssets(page = currentPage) {
    currentPage = page;

    const search = document.getElementById('asset_search')?.value ?? '';
    const status = document.getElementById('filter_status')?.value ?? '';
    const categoryId = document.getElementById('filter_category')?.value ?? '';
    const locationId = document.getElementById('filter_location')?.value ?? '';

    const params = new URLSearchParams({
        page,
        per_page: 25,
        search,
        status,
        category_id: categoryId,
        location_id: locationId,
    });

    try {
        const data = await apiFetch(`/src/api/assets.php?${params}`);
        renderAssetTable(data.data);
        renderPagination('assets_pagination', data.pagination, 'loadAssets');
    } catch (err) {
        showToast('Failed to load assets.', 'error');
    }
}

// ===== RENDER TABLE =====
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
            </tr>
        `;
        return;
    }

    tbody.innerHTML = assets.map(a => `
        <tr>
            <td>
                <span class="serial-chip">${a.serial_number}</span>
            </td>
            <td>${a.description}</td>
            <td>
                <span class="tag"
                    style="background:var(--navy-5);color:var(--white-2)">
                    ${a.category_name ?? '—'}
                </span>
            </td>
            <td style="font-size:11px;color:var(--white-3);max-width:160px;
                overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${a.po_number ?? '—'}
            </td>
            <td style="font-size:11px">${a.location_name ?? '—'}</td>
            <td style="font-size:11px">${a.owner_name ?? '—'}</td>
            <td>${statusTag(a.status)}</td>
            <td style="font-size:11px;color:var(--white-3)">
                ${formatDate(a.date_received)}
            </td>
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="viewAsset(${a.id})">
                        <i class="bi bi-eye"></i> View
                    </button>
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="openEditAsset(${a.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteAsset(${a.id}, '${a.serial_number}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== VIEW ASSET =====
async function viewAsset(id) {
    currentViewId = id;

    try {
        const data = await apiFetch(`/src/api/assets.php?id=${id}`);
        renderViewModal(data.data);
        openModal('view_asset');
    } catch (err) {
        showToast('Could not load asset details.', 'error');
    }
}

function renderViewModal(a) {
    document.getElementById('view_asset_title').textContent = `📦 ${a.description}`;

    document.getElementById('view_asset_body').innerHTML = `
        <div class="modal-section-title">Purchase Order Info</div>
        <div class="field-grid" style="margin-bottom:14px">
            <div class="form-field">
                <label>PO Number</label>
                <div class="info-field">
                    <div class="val" style="font-size:11px;font-family:monospace">
                        ${a.po_number ?? '—'}
                    </div>
                </div>
            </div>
            <div class="form-field">
                <label>Vendor</label>
                <div class="info-field">
                    <div class="val">${a.vendor_name ?? '—'}</div>
                </div>
            </div>
        </div>
        <div class="field-grid" style="margin-bottom:14px">
            <div class="form-field">
                <label>Date Received</label>
                <div class="info-field">
                    <div class="val">${formatDate(a.date_received)}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Date Endorsed</label>
                <div class="info-field">
                    <div class="val">${formatDate(a.date_endorsed) ?? '⏳ Pending'}</div>
                </div>
            </div>
        </div>
        <div class="modal-section-title">Assignment</div>
        <div class="field-grid" style="margin-bottom:14px">
            <div class="form-field">
                <label>Location</label>
                <div class="info-field">
                    <div class="val">${a.location_name ?? '—'}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Process Owner</label>
                <div class="info-field">
                    <div class="val">${a.owner_name ?? '—'}</div>
                </div>
            </div>
        </div>
        <div class="field-grid" style="margin-bottom:14px">
            <div class="form-field">
                <label>Category</label>
                <div class="info-field">
                    <div class="val">${a.category_name ?? '—'}</div>
                </div>
            </div>
            <div class="form-field">
                <label>Status</label>
                <div class="info-field">${statusTag(a.status)}</div>
            </div>
        </div>
        <div class="modal-section-title">Serial Number</div>
        <div style="margin-bottom:14px">
            <span class="serial-chip">${a.serial_number}</span>
        </div>
        <div class="modal-section-title">Remarks</div>
        <div class="info-field">
            <div class="val" style="color:${a.remarks ? 'var(--white)' : 'var(--white-4)'}">
                ${a.remarks || 'No remarks'}
            </div>
        </div>
    `;
}

function editAssetFromView() {
    closeModal('view_asset');
    openEditAsset(currentViewId);
}

// ===== ADD ASSET =====
function openAddAsset() {
    document.getElementById('asset_edit_id').value = '';
    document.getElementById('asset_modal_title').textContent = '📦 Add New Asset';
    document.getElementById('asset_serial').value = '';
    document.getElementById('asset_desc').value = '';
    document.getElementById('asset_category').value = '';
    document.getElementById('asset_status').value = 'active';
    document.getElementById('asset_po').value = '';
    document.getElementById('asset_location').value = '';
    document.getElementById('asset_owner').value = '';
    document.getElementById('asset_remarks').value = '';
    document.getElementById('asset_serial').removeAttribute('readonly');
    openModal('add_asset');
}

// ===== EDIT ASSET =====
async function openEditAsset(id) {
    try {
        const data = await apiFetch(`/src/api/assets.php?id=${id}`);
        const a = data.data;

        document.getElementById('asset_edit_id').value = id;
        document.getElementById('asset_modal_title').textContent = '✏️ Edit Asset';
        document.getElementById('asset_serial').value = a.serial_number;
        document.getElementById('asset_serial').setAttribute('readonly', true);
        document.getElementById('asset_desc').value = a.description;
        document.getElementById('asset_category').value = a.category_id ?? '';
        document.getElementById('asset_status').value = a.status;
        document.getElementById('asset_po').value = a.po_id ?? '';
        document.getElementById('asset_location').value = a.location_id ?? '';
        document.getElementById('asset_owner').value = a.owner_id ?? '';
        document.getElementById('asset_remarks').value = a.remarks ?? '';
        openModal('add_asset');
    } catch (err) {
        showToast('Could not load asset for editing.', 'error');
    }
}

// ===== SAVE ASSET =====
async function saveAsset() {
    const id = document.getElementById('asset_edit_id').value;
    const serial = document.getElementById('asset_serial').value.trim();
    const desc = document.getElementById('asset_desc').value.trim();
    const categoryId = document.getElementById('asset_category').value;
    const status = document.getElementById('asset_status').value;
    const poId = document.getElementById('asset_po').value;
    const locationId = document.getElementById('asset_location').value;
    const ownerId = document.getElementById('asset_owner').value;
    const remarks = document.getElementById('asset_remarks').value.trim();

    if (!serial || !desc || !categoryId) {
        showToast('Serial number, description, and category are required.', 'error');
        return;
    }

    const payload = {
        serial_number: serial,
        description: desc,
        category_id: categoryId,
        status,
        po_id: poId || null,
        location_id: locationId || null,
        owner_id: ownerId || null,
        remarks,
    };

    const isEdit = !!id;
    const url = isEdit
        ? `/src/api/assets.php?id=${id}`
        : '/src/api/assets.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_asset');
        showToast(`Asset ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
        loadAssets(currentPage);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== DELETE ASSET =====
function deleteAsset(id, serial) {
    showConfirm(
        `Delete Asset`,
        `Delete asset SN: ${serial}? This action is logged and cannot be undone.`,
        async () => {
            try {
                await apiFetch(`/src/api/assets.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Asset deleted.', 'success');
                loadAssets(currentPage);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}

// ===== POPULATE DROPDOWNS =====
async function populateAssetFormDropdowns() {
    await Promise.all([
        populateSelect('asset_category', '/src/api/categories.php', 'id', 'name'),
        populateSelect('asset_po', '/src/api/purchase_orders.php', 'id', 'po_number'),
        populateSelect('asset_location', '/src/api/locations.php', 'id', 'name'),
        populateSelect('asset_owner', '/src/api/process_owners.php', 'id', 'name'),
        populateSelect('filter_category', '/src/api/categories.php', 'id', 'name'),
        populateSelect('filter_location', '/src/api/locations.php', 'id', 'name'),
    ]);
}

async function populateSelect(selectId, url, valKey, labelKey) {
    const el = document.getElementById(selectId);

    if (!el) {
        return;
    }

    try {
        const data = await apiFetch(url);
        const items = data.data ?? [];

        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valKey];
            opt.textContent = item[labelKey];
            el.appendChild(opt);
        });
    } catch (err) {
        // Non-critical; dropdowns just stay empty
    }
}

// ===== EXPORT =====
async function exportAssets() {
    const status = document.getElementById('filter_status')?.value ?? '';
    const categoryId = document.getElementById('filter_category')?.value ?? '';

    const params = new URLSearchParams({
        action: 'export',
        status,
        category_id: categoryId,
    });

    window.location.href = `/src/api/import_export.php?${params}`;
}
