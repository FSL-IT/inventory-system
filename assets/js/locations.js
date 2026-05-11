// assets/js/locations.js

document.addEventListener('DOMContentLoaded', loadLocations);

async function loadLocations() {
    try {
        const data = await apiFetch('/src/api/locations.php');
        renderLocationTable(data.data);
    } catch (err) {
        showToast('Failed to load locations.', 'error');
    }
}

function renderLocationTable(locations) {
    const tbody = document.getElementById('locations_body');

    if (!locations.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-state__title">No locations yet.</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = locations.map(l => `
        <tr>
            <td style="font-weight:500">${l.name}</td>
            <td>${l.asset_count ?? 0}</td>
            <td style="font-size:11px;color:var(--white-3)">
                ${formatDate(l.created_at)}
            </td>
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="openEditLocation(${l.id}, '${l.name}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteLocation(${l.id}, '${l.name}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openEditLocation(id, name) {
    document.getElementById('location_edit_id').value = id;
    document.getElementById('location_modal_title').textContent = '✏️ Edit Location';
    document.getElementById('location_name').value = name;
    openModal('add_location');
}

async function saveLocation() {
    const id = document.getElementById('location_edit_id').value;
    const name = document.getElementById('location_name').value.trim();

    if (!name) {
        showToast('Location name is required.', 'error');
        return;
    }

    const isEdit = !!id;
    const url = isEdit
        ? `/src/api/locations.php?id=${id}`
        : '/src/api/locations.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify({ name }) });
        closeModal('add_location');
        document.getElementById('location_edit_id').value = '';
        document.getElementById('location_name').value = '';
        document.getElementById('location_modal_title').textContent = '📍 Add New Location';
        showToast(`Location ${isEdit ? 'updated' : 'created'}.`, 'success');
        loadLocations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteLocation(id, name) {
    showConfirm(
        'Delete Location',
        `Delete location "${name}"?`,
        async () => {
            try {
                await apiFetch(`/src/api/locations.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Location deleted.', 'success');
                loadLocations();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}
