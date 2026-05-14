// assets/js/process_owners.js

document.addEventListener('DOMContentLoaded', loadOwners);

async function loadOwners() {
    try {
        const data = await apiFetch('/src/api/process_owners.php');
        renderOwnerTable(data.data);
    } catch (err) {
        showToast('Failed to load process owners.', 'error');
    }
}

function renderOwnerTable(owners) {
    const tbody = document.getElementById('owners_body');

    if (!owners.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-state__title">No owners yet.</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = owners.map(o => `
        <tr>
            <td style="font-weight:500">${escapeHtml(o.name)}</td>
            <td>${escapeHtml(o.asset_count ?? 0)}</td>
            <td style="font-size:11px;color:var(--white-3)">
                ${formatDate(o.created_at)}
            </td>
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="openEditOwner(${o.id}, '${escapeJsArg(o.name)}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteOwner(${o.id}, '${escapeJsArg(o.name)}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openEditOwner(id, name) {
    document.getElementById('owner_edit_id').value = id;
    document.getElementById('owner_modal_title').textContent = '✏️ Edit Process Owner';
    document.getElementById('owner_name').value = name;
    openModal('add_owner');
}

async function saveOwner() {
    const id = document.getElementById('owner_edit_id').value;
    const name = document.getElementById('owner_name').value.trim();

    if (!name) {
        showToast('Owner name is required.', 'error');
        return;
    }

    const isEdit = !!id;
    const url = isEdit
        ? `/src/api/process_owners.php?id=${id}`
        : '/src/api/process_owners.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify({ name }) });
        closeModal('add_owner');
        document.getElementById('owner_edit_id').value = '';
        document.getElementById('owner_name').value = '';
        document.getElementById('owner_modal_title').textContent = '🏢 Add Process Owner';
        showToast(`Owner ${isEdit ? 'updated' : 'created'}.`, 'success');
        loadOwners();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteOwner(id, name) {
    showConfirm(
        'Delete Process Owner',
        `Delete "${name}"? Assets linked to this owner will be unassigned.`,
        async () => {
            try {
                await apiFetch(`/src/api/process_owners.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Owner deleted.', 'success');
                loadOwners();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}
