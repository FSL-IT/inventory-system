// assets/js/vendors.js

// Make the initialization async to prevent race conditions
window.initVendors = async function() {
    
    // Safety Check: Force-load RefTable if it's missing on hard-reload
    if (typeof window.RefTable === 'undefined') {
        if (typeof injectScript === 'function') {
            await injectScript('/assets/js/ref_table.js');
        } else {
            console.error("Critical System Error: Missing ref_table.js");
            return;
        }
    }

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
                <td style="font-weight:600">${escapeHtml(v.name)}</td>
                <td>
                    <span class="tag" style="background:var(--blue-dim);color:var(--blue-tag)">
                        ${v.po_count ?? 0} PO${v.po_count != 1 ? 's' : ''}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--white-3)">
                    ${formatDate(v.created_at)}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" 
                            onclick="openEditVendor(${v.id}, '${escapeJsStr(v.name)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" 
                            onclick="deleteVendor(${v.id}, '${escapeJsStr(v.name)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`,
    });
    window._refTable.init();
};

window.loadVendors = function (page = 1) {
    window._refTable.page = page;
    window._refTable.load();
};

window.openAddVendor = function () {
    document.getElementById('vendor_edit_id').value = '';
    document.getElementById('vendor_modal_title').textContent = '🏭 Add New Vendor';
    document.getElementById('vendor_name').value = '';
    openModal('add_vendor');
};

window.openEditVendor = function (id, name) {
    document.getElementById('vendor_edit_id').value = id;
    document.getElementById('vendor_modal_title').textContent = '✏️ Edit Vendor';
    document.getElementById('vendor_name').value = name;
    openModal('add_vendor');
};

window.saveVendor = async function () {
    const id   = document.getElementById('vendor_edit_id').value;
    const name = document.getElementById('vendor_name').value.trim();

    if (!name) { 
        showToast('Vendor name is required.', 'error'); 
        return; 
    }

    const isEdit = !!id;
    try {
        let url = isEdit ? `/src/api/vendors.php?id=${id}` : '/src/api/vendors.php';
        await apiFetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            body:   JSON.stringify({ name }),
        });
        closeModal('add_vendor');
        showToast(`Vendor ${isEdit ? 'updated' : 'created'}.`, 'success');
        window._refTable.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteVendor = function (id, name) {
    let msg = `Delete vendor "${name}"? This cannot be undone.`;
    showConfirm('Delete Vendor', msg, async () => {
        try {
            await apiFetch(`/src/api/vendors.php?id=${id}`, { method: 'DELETE' });
            showToast('Vendor deleted.', 'success');
            window._refTable.reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
};