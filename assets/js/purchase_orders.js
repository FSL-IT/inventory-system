// assets/js/purchase_orders.js

let poCurrentPage = 1;

const debouncePoSearch = debounce(value => {
    poCurrentPage = 1;
    loadPOs(1);
}, 350);

document.addEventListener('DOMContentLoaded', () => {
    loadPOs(1);
    populatePoVendorDropdown();
    populatePoFormVendors();
});

async function loadPOs(page = poCurrentPage) {
    poCurrentPage = page;

    const search = document.getElementById('po_search')?.value ?? '';
    const vendorId = document.getElementById('filter_vendor')?.value ?? '';

    const params = new URLSearchParams({
        page,
        per_page: 25,
        search,
        vendor_id: vendorId,
    });

    try {
        const data = await apiFetch(`/src/api/purchase_orders.php?${params}`);
        renderPoTable(data.data);
        renderPagination('po_pagination', data.pagination, 'loadPOs');
    } catch (err) {
        showToast('Failed to load purchase orders.', 'error');
    }
}

function renderPoTable(pos) {
    const tbody = document.getElementById('po_body');

    if (!pos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-state__icon">📋</div>
                        <div class="empty-state__title">No POs found</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = pos.map(p => `
        <tr>
            <td style="font-family:monospace;font-size:11px;color:var(--accent)">
                ${escapeHtml(p.po_number)}
            </td>
            <td style="font-size:11px">${escapeHtml(p.vendor_name ?? '-')}</td>
            <td style="text-align:center;font-weight:700">
                ${escapeHtml(p.asset_count ?? 0)}
            </td>
            <td style="font-size:11px;color:var(--white-3)">
                ${formatDate(p.date_received)}
            </td>
            <td>
                ${p.date_endorsed
                    ? `<span class="tag tag-active">${formatDate(p.date_endorsed)}</span>`
                    : `<span class="tag tag-repair">Pending</span>`
                }
            </td>
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="openEditPO(${p.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deletePO(${p.id}, '${escapeJsArg(p.po_number)}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function openEditPO(id) {
    try {
        const params = new URLSearchParams({ id, per_page: 1, page: 1 });
        const data = await apiFetch(`/src/api/purchase_orders.php?${params}`);
        const po = data.data[0];

        if (!po) {
            showToast('PO not found.', 'error');
            return;
        }

        document.getElementById('po_edit_id').value = id;
        document.getElementById('po_modal_title').textContent = '✏️ Edit Purchase Order';
        document.getElementById('po_number').value = po.po_number;
        document.getElementById('po_vendor').value = po.vendor_id ?? '';
        document.getElementById('po_date_received').value = po.date_received ?? '';
        document.getElementById('po_date_endorsed').value = po.date_endorsed ?? '';
        openModal('add_po');
    } catch (err) {
        showToast('Could not load PO for editing.', 'error');
    }
}

async function savePO() {
    const id = document.getElementById('po_edit_id').value;
    const poNumber = document.getElementById('po_number').value.trim();
    const vendorId = document.getElementById('po_vendor').value;
    const dateReceived = document.getElementById('po_date_received').value;
    const dateEndorsed = document.getElementById('po_date_endorsed').value;

    if (!poNumber) {
        showToast('PO number is required.', 'error');
        return;
    }

    const payload = {
        po_number: poNumber,
        vendor_id: vendorId || null,
        date_received: dateReceived || null,
        date_endorsed: dateEndorsed || null,
    };

    const isEdit = !!id;
    const url = isEdit
        ? `/src/api/purchase_orders.php?id=${id}`
        : '/src/api/purchase_orders.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_po');
        showToast(`PO ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
        loadPOs(poCurrentPage);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deletePO(id, poNumber) {
    showConfirm(
        'Delete Purchase Order',
        `Delete PO: ${poNumber}?`,
        async () => {
            try {
                await apiFetch(`/src/api/purchase_orders.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('PO deleted.', 'success');
                loadPOs(poCurrentPage);
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}

async function populatePoVendorDropdown() {
    await populateFilterSelect(
        'filter_vendor',
        '/src/api/vendors.php',
        'id',
        'name'
    );
}

async function populatePoFormVendors() {
    await populateFilterSelect(
        'po_vendor',
        '/src/api/vendors.php',
        'id',
        'name'
    );
}

async function populateFilterSelect(selectId, url, valKey, labelKey) {
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
        // Non-critical
    }
}
