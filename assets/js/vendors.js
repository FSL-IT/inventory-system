// assets/js/vendors.js

document.addEventListener('DOMContentLoaded', () => {
    window._refTable = new RefTable({
        apiUrl:      '/src/api/vendors.php',
        tbodyId:     'vendors_body',
        paginationId:'vendor_pagination',
        counterId:   'ref_counter',
        defaultSort: 'name',
        emptyLabel:  'No vendors found.',
        columns: [
            { key: 'name',       label: 'Vendor Name',  sortable: true },
            { key: 'po_count',   label: 'PO Count',     sortable: true },
            { key: 'created_at', label: 'Date Added',   sortable: true },
            { key: '_actions',   label: 'Actions',      sortable: false },
        ],
        renderRow: (v) => `
            <tr>
                <td style="font-weight:600">${v.name}</td>
                <td>
                    <span class="tag" style="background:var(--blue-dim);color:var(--blue-tag)">
                        ${v.po_count ?? 0} PO${v.po_count != 1 ? 's' : ''}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--white-3)">${formatDate(v.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openEditVendor(${v.id}, '${escHtml(v.name)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteVendor(${v.id}, '${escHtml(v.name)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`,
    });
    window._refTable.init();
});

// Wire topbar global search into local search field
function loadVendors(page = 1) {
    window._refTable.page = page;
    window._refTable.load();
}

function openAddVendor() {
    document.getElementById('vendor_edit_id').value = '';
    document.getElementById('vendor_modal_title').textContent = '🏭 Add New Vendor';
    document.getElementById('vendor_name').value = '';
    openModal('add_vendor');
}

function openEditVendor(id, name) {
    document.getElementById('vendor_edit_id').value = id;
    document.getElementById('vendor_modal_title').textContent = '✏️ Edit Vendor';
    document.getElementById('vendor_name').value = name;
    openModal('add_vendor');
}

async function saveVendor() {
    const id   = document.getElementById('vendor_edit_id').value;
    const name = document.getElementById('vendor_name').value.trim();

    if (!name) { showToast('Vendor name is required.', 'error'); return; }

    const isEdit = !!id;
    try {
        await apiFetch(isEdit ? `/src/api/vendors.php?id=${id}` : '/src/api/vendors.php', {
            method: isEdit ? 'PUT' : 'POST',
            body:   JSON.stringify({ name }),
        });
        closeModal('add_vendor');
        showToast(`Vendor ${isEdit ? 'updated' : 'created'}.`, 'success');
        window._refTable.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteVendor(id, name) {
    showConfirm('Delete Vendor', `Delete vendor "${name}"? This cannot be undone.`, async () => {
        try {
            await apiFetch(`/src/api/vendors.php?id=${id}`, { method: 'DELETE' });
            showToast('Vendor deleted.', 'success');
            window._refTable.reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function escHtml(s) {
    return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}