// assets/js/purchase_orders.js

let poCurrentPage = 1;
let poSort        = 'po.created_at';
let poDir         = 'desc';

const debouncePoSearch = debounce(() => { poCurrentPage = 1; loadPOs(1); }, 350);

document.addEventListener('DOMContentLoaded', () => {
    populatePoVendorDropdown();
    populatePoFormVendors();
    loadPOs(1);
});

// ─── Sort ──────────────────────────────────────────────────────────────────────
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
        active.className = `bi ${poDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down'} sort-icon`;
        active.style.opacity = '1';
        active.style.color   = 'var(--accent)';
    }
}

// ─── Load ──────────────────────────────────────────────────────────────────────
async function loadPOs(page = poCurrentPage) {
    poCurrentPage = page;

    const search   = document.getElementById('po_search')?.value      ?? '';
    const vendorId = document.getElementById('filter_vendor')?.value  ?? '';
    const endorsed = document.getElementById('filter_endorsed')?.value ?? '';
    const perPage  = document.getElementById('po_per_page')?.value    ?? 25;

    const params = new URLSearchParams({
        page, per_page: perPage,
        search, vendor_id: vendorId, endorsed,
        sort: poSort, dir: poDir,
    });

    const tbody = document.getElementById('po_body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--white-4)">
        <i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite"></i> Loading...
    </td></tr>`;

    try {
        const data = await apiFetch(`/src/api/purchase_orders.php?${params}`);
        renderPoTable(data.data);
        renderPagination('po_pagination', data.pagination, 'loadPOs');
        renderPoCounter(data.pagination);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red)">Failed to load.</td></tr>`;
        showToast('Failed to load purchase orders.', 'error');
    }
}

function renderPoCounter(pg) {
    const el = document.getElementById('po_counter');
    if (!el || !pg) return;
    if (pg.total === 0) { el.textContent = 'No results'; return; }
    const start = (pg.page - 1) * pg.per_page + 1;
    const end   = Math.min(pg.page * pg.per_page, pg.total);
    el.textContent = `${start}–${end} of ${pg.total}`;
}

function clearPoFilters() {
    ['po_search','filter_vendor','filter_endorsed'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    poSort = 'po.created_at'; poDir = 'desc';
    updatePoSortIcons();
    loadPOs(1);
}

// ─── Render ────────────────────────────────────────────────────────────────────
function renderPoTable(pos) {
    const tbody = document.getElementById('po_body');

    if (!pos.length) {
        tbody.innerHTML = `<tr><td colspan="6">
            <div class="empty-state">
                <i class="bi bi-file-earmark-x" style="font-size:36px;display:block;margin-bottom:8px"></i>
                <div class="empty-state__title">No purchase orders found</div>
            </div></td></tr>`;
        return;
    }

    tbody.innerHTML = pos.map(p => `
        <tr>
            <td class="cell-mono cell-accent">
                ${escapeHtml(p.po_number)}
            </td>
            <td class="cell-sm">${escapeHtml(p.vendor_name ?? '—')}</td>
            <td style="text-align:center">
                <span class="tag" style="background:var(--blue-dim);color:var(--blue-tag)">
                    ${p.asset_count ?? 0}
                </span>
            </td>
            <td style="font-size:12px;color:var(--white-3)">${formatDate(p.date_received)}</td>
            <td>
                ${p.date_endorsed
                    ? `<span class="tag tag-active"><i class="bi bi-check-circle" style="margin-right:4px"></i>${formatDate(p.date_endorsed)}</span>`
                    : `<span class="tag tag-repair"><i class="bi bi-clock" style="margin-right:4px"></i>Pending</span>`}
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openEditPO(${p.id})" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <?php if (isAdmin()): ?>
                    <button class="btn btn-danger btn-sm" onclick="deletePO(${p.id}, '${escHtml(p.po_number)}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                    <?php endif; ?>
                </div>
            </td>
        </tr>`).join('');
}

// ─── Add / Edit ────────────────────────────────────────────────────────────────
function openAddPO() {
    document.getElementById('po_edit_id').value = '';
    document.getElementById('po_modal_title').textContent = '📋 New Purchase Order';
    ['po_number','po_date_received','po_date_endorsed'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('po_vendor').value = '';
    openModal('add_po');
}

async function openEditPO(id) {
    try {
        // FIX: use direct id fetch instead of pagination hack
        const data = await apiFetch(`/src/api/purchase_orders.php?id=${id}`);
        const po   = data.data;

        document.getElementById('po_edit_id').value       = id;
        document.getElementById('po_modal_title').textContent = '✏️ Edit Purchase Order';
        document.getElementById('po_number').value        = po.po_number;
        document.getElementById('po_vendor').value        = po.vendor_id      ?? '';
        document.getElementById('po_date_received').value = po.date_received  ?? '';
        document.getElementById('po_date_endorsed').value = po.date_endorsed  ?? '';
        openModal('add_po');
    } catch (err) {
        console.error('openEditPO error:', err);
        showToast('Could not load PO for editing.', 'error');
    }
}
async function savePO() {
    const id           = document.getElementById('po_edit_id').value;
    const poNumber     = document.getElementById('po_number').value.trim();
    const vendorId     = document.getElementById('po_vendor').value;
    const dateReceived = document.getElementById('po_date_received').value;
    const dateEndorsed = document.getElementById('po_date_endorsed').value;

    if (!poNumber) { showToast('PO number is required.', 'error'); return; }

    const isEdit = !!id;
    try {
        await apiFetch(isEdit ? `/src/api/purchase_orders.php?id=${id}` : '/src/api/purchase_orders.php', {
            method: isEdit ? 'PUT' : 'POST',
            body: JSON.stringify({
                po_number: poNumber,
                vendor_id: vendorId || null,
                date_received: dateReceived || null,
                date_endorsed: dateEndorsed || null,
            }),
        });
        closeModal('add_po');
        showToast(`PO ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
        loadPOs(poCurrentPage);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deletePO(id, poNumber) {
    showConfirm('Delete Purchase Order', `Delete PO: ${poNumber}? All linked assets will be unlinked.`, async () => {
        try {
            await apiFetch(`/src/api/purchase_orders.php?id=${id}`, { method: 'DELETE' });
            showToast('PO deleted.', 'success');
            loadPOs(poCurrentPage);
        } catch (err) { showToast(err.message, 'error'); }
    });
}

// ─── Dropdowns ─────────────────────────────────────────────────────────────────
async function populatePoVendorDropdown() {
    const el = document.getElementById('filter_vendor');
    if (!el) return;
    try {
        const data = await apiFetch('/src/api/vendors.php?per_page=500');
        (data.data ?? []).forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id; opt.textContent = v.name; el.appendChild(opt);
        });
    } catch (_) {}
}

async function populatePoFormVendors() {
    const el = document.getElementById('po_vendor');
    if (!el) return;
    try {
        const data = await apiFetch('/src/api/vendors.php?per_page=500');
        (data.data ?? []).forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id; opt.textContent = v.name; el.appendChild(opt);
        });
    } catch (_) {}
}

function escHtml(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }