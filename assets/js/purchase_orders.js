// assets/js/purchase_orders.js

let poCurrentPage = 1;
let poSort        = 'po.created_at';
let poDir         = 'desc';

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const getVal = (id) => document.getElementById(id)?.value.trim() ?? '';

const safeSetVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
        el.value = val;
    }
};

function escapeHtml(str) {
    if (!str) {
        return '';
    }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const debouncePoSearch = debounce(() => { 
    poCurrentPage = 1; 
    loadPOs(1); 
}, 350);

// ─── INIT ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    populatePoVendorDropdown();
    populatePoFormVendors();
    loadPOs(1);
});

// ─── EVENT HANDLERS (Stops Event Bubbling) ──────────────────────────────────
function onEditClick(e, id) {
    e.stopPropagation();
    openEditPO(id);
}

function onDeleteClick(e, id, poNumber) {
    e.stopPropagation();
    deletePO(id, poNumber);
}

// ─── SORT & FILTERS ─────────────────────────────────────────────────────────
function sortPOs(col) {
    if (poSort === col) {
        poDir = poDir === 'asc' ? 'desc' : 'asc';
    } else {
        poSort = col;
        poDir  = 'asc';
    }
    poCurrentPage = 1;
    updatePoSortIcons();
    loadPOs(1);
}

function updatePoSortIcons() {
    document.querySelectorAll('[id^="posort_"]').forEach(el => {
        el.className = 'bi bi-arrow-down-up sort-icon';
        el.style.opacity = '0.35';
        el.style.color = '';
    });
    
    const active = document.getElementById(`posort_${poSort}`);
    if (active) {
        const dirClass = poDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
        active.className = `bi ${dirClass} sort-icon`;
        active.style.opacity = '1';
        active.style.color   = 'var(--accent)';
    }
}

function clearPoFilters() {
    ['po_search', 'filter_vendor', 'filter_endorsed'].forEach(id => {
        safeSetVal(id, '');
    });
    poSort = 'po.created_at'; 
    poDir  = 'desc';
    updatePoSortIcons();
    loadPOs(1);
}

// ─── LOAD ───────────────────────────────────────────────────────────────────
async function loadPOs(page = poCurrentPage) {
    poCurrentPage = page;

    const params = new URLSearchParams({
        page:      page, 
        per_page:  getVal('po_per_page') || 25,
        search:    getVal('po_search'), 
        vendor_id: getVal('filter_vendor'), 
        endorsed:  getVal('filter_endorsed'),
        sort:      poSort, 
        dir:       poDir,
    });

    const tbody = document.getElementById('po_body');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" 
                    style="text-align:center;padding:30px;
                           color:var(--white-4)">
                <i class="bi bi-arrow-repeat" 
                        style="animation:spin 1s linear infinite"></i> 
                Loading...
            </td>
        </tr>`;

    try {
        const data = await apiFetch(`/src/api/purchase_orders.php?${params}`);
        renderPoTable(data.data);
        renderPagination('po_pagination', data.pagination, 'loadPOs');
        renderPoCounter(data.pagination);
    } catch (err) {
        console.error('loadPOs error:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" 
                        style="text-align:center;padding:30px;color:var(--red)">
                    Failed to load.
                </td>
            </tr>`;
        showToast('Failed to load purchase orders.', 'error');
    }
}

function renderPoCounter(pg) {
    const el = document.getElementById('po_counter');
    if (!el || !pg) {
        return;
    }
    if (pg.total === 0) { 
        el.textContent = 'No results'; 
        return; 
    }
    
    const start = (pg.page - 1) * pg.per_page + 1;
    const end   = Math.min(pg.page * pg.per_page, pg.total);
    el.textContent = `${start}–${end} of ${pg.total}`;
}

// ─── RENDER ─────────────────────────────────────────────────────────────────
function renderPoTable(pos) {
    const tbody = document.getElementById('po_body');

    if (!pos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="bi bi-file-earmark-x" 
                                style="font-size:36px;display:block;
                                       margin-bottom:8px"></i>
                        <div class="empty-state__title">
                            No purchase orders found
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    const isAdminUser = typeof IS_ADMIN !== 'undefined' && IS_ADMIN;

    tbody.innerHTML = pos.map(p => {
        const safePoNum = escapeHtml(p.po_number);
        
        const endorsedTag = p.date_endorsed
            ? `<span class="tag tag-active">
                   <i class="bi bi-check-circle" style="margin-right:4px"></i>
                   ${formatDate(p.date_endorsed)}
               </span>`
            : `<span class="tag tag-repair">
                   <i class="bi bi-clock" style="margin-right:4px"></i>
                   Pending
               </span>`;

        const adminBtn = isAdminUser ? `
            <button class="btn btn-danger btn-sm" 
                    onclick="onDeleteClick(event, ${p.id}, '${safePoNum}')" 
                    title="Delete">
                <i class="bi bi-trash"></i>
            </button>` : '';

        return `
            <tr class="clickable-row" 
                    onclick="openEditPO(${p.id})">
                <td style="font-family:monospace;font-size:12px;
                           color:var(--accent);font-weight:600">
                    ${safePoNum}
                </td>
                <td style="font-size:12px">
                    ${escapeHtml(p.vendor_name ?? '—')}
                </td>
                <td style="text-align:center">
                    <span class="tag" 
                            style="background:var(--blue-dim);
                                   color:var(--blue-tag)">
                        ${escapeHtml(p.asset_count ?? 0)}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--white-3)">
                    ${formatDate(p.date_received)}
                </td>
                <td>${endorsedTag}</td>
                <td>
                    <div class="table-actions">
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

// ─── ADD / EDIT ─────────────────────────────────────────────────────────────
function openAddPO() {
    safeSetVal('po_edit_id', '');
    document.getElementById('po_modal_title').textContent = 
        '📋 New Purchase Order';
        
    ['po_number','po_date_received','po_date_endorsed','po_vendor'].forEach(
        id => safeSetVal(id, '')
    );
    
    openModal('add_po');
}

async function openEditPO(id) {
    try {
        const data = await apiFetch(`/src/api/purchase_orders.php?id=${id}`);
        const po   = data.data;
        
        safeSetVal('po_edit_id', id);
        document.getElementById('po_modal_title').textContent = 
            '✏️ Edit Purchase Order';
            
        safeSetVal('po_number',        po.po_number);
        safeSetVal('po_vendor',        po.vendor_id     ?? '');
        safeSetVal('po_date_received', po.date_received ?? '');
        safeSetVal('po_date_endorsed', po.date_endorsed ?? '');
        
        openModal('add_po');
    } catch (err) {
        console.error('openEditPO error:', err);
        showToast('Could not load PO for editing.', 'error');
    }
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
    const url    = isEdit ? `/src/api/purchase_orders.php?id=${id}` 
                          : '/src/api/purchase_orders.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, {
            method: method,
            body:   JSON.stringify(payload),
        });
        
        closeModal('add_po');
        showToast(
            `PO ${isEdit ? 'updated' : 'created'} successfully.`, 
            'success'
        );
        loadPOs(poCurrentPage);
    } catch (err) {
        console.error('savePO error:', err);
        showToast(err.message, 'error');
    }
}

function deletePO(id, poNumber) {
    const msg = `Delete PO: ${poNumber}? All linked assets will be unlinked.`;
    showConfirm('Delete Purchase Order', msg, async () => {
        try {
            await apiFetch(`/src/api/purchase_orders.php?id=${id}`, { 
                method: 'DELETE' 
            });
            showToast('PO deleted.', 'success');
            loadPOs(poCurrentPage);
        } catch (err) { 
            console.error('deletePO error:', err);
            showToast(err.message, 'error'); 
        }
    });
}

// ─── DROPDOWNS ──────────────────────────────────────────────────────────────
async function populatePoVendorDropdown() {
    const el = document.getElementById('filter_vendor');
    if (!el) {
        return;
    }
    
    try {
        const data = await apiFetch('/src/api/vendors.php?per_page=500');
        (data.data ?? []).forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id; 
            opt.textContent = v.name; 
            el.appendChild(opt);
        });
    } catch (err) {
        console.error('populatePoVendorDropdown error:', err);
    }
}

async function populatePoFormVendors() {
    const el = document.getElementById('po_vendor');
    if (!el) {
        return;
    }
    
    try {
        const data = await apiFetch('/src/api/vendors.php?per_page=500');
        (data.data ?? []).forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id; 
            opt.textContent = v.name; 
            el.appendChild(opt);
        });
    } catch (err) {
        console.error('populatePoFormVendors error:', err);
    }
}