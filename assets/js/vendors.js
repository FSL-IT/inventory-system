// assets/js/vendors.js

document.addEventListener('DOMContentLoaded', loadVendors);

async function loadVendors() {
    try {
        const data = await apiFetch('/src/api/vendors.php');
        renderVendorTable(data.data);
    } catch (err) {
        showToast('Failed to load vendors.', 'error');
    }
}

function renderVendorTable(vendors) {
    const tbody = document.getElementById('vendors_body');

    if (!vendors.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-state__title">No vendors yet.</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = vendors.map(v => `
        <tr>
            <td style="font-weight:500">${escapeHtml(v.name)}</td>
            <td>${escapeHtml(v.po_count ?? 0)}</td>
            <td style="font-size:11px;color:var(--white-3)">
                ${formatDate(v.created_at)}
            </td>
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="openEditVendor(${v.id}, '${escapeJsArg(v.name)}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteVendor(${v.id}, '${escapeJsArg(v.name)}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openEditVendor(id, name) {
    document.getElementById('vendor_edit_id').value = id;
    document.getElementById('vendor_modal_title').textContent = '✏️ Edit Vendor';
    document.getElementById('vendor_name').value = name;
    openModal('add_vendor');
}

async function saveVendor() {
    const id = document.getElementById('vendor_edit_id').value;
    const name = document.getElementById('vendor_name').value.trim();

    if (!name) {
        showToast('Vendor name is required.', 'error');
        return;
    }

    const isEdit = !!id;
    const url = isEdit
        ? `/src/api/vendors.php?id=${id}`
        : '/src/api/vendors.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify({ name }) });
        closeModal('add_vendor');
        document.getElementById('vendor_edit_id').value = '';
        document.getElementById('vendor_name').value = '';
        document.getElementById('vendor_modal_title').textContent = '🏭 Add New Vendor';
        showToast(`Vendor ${isEdit ? 'updated' : 'created'}.`, 'success');
        loadVendors();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteVendor(id, name) {
    showConfirm(
        'Delete Vendor',
        `Delete vendor "${name}"?`,
        async () => {
            try {
                await apiFetch(`/src/api/vendors.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Vendor deleted.', 'success');
                loadVendors();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}
