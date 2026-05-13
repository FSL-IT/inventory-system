// assets/js/locations.js

document.addEventListener('DOMContentLoaded', () => {
    window._refTable = new RefTable({
        apiUrl:      '/src/api/locations.php',
        tbodyId:     'locations_body',
        paginationId:'location_pagination',
        counterId:   'ref_counter',
        defaultSort: 'name',
        emptyLabel:  'No locations found.',
        columns: [
            { key: 'name',        label: 'Location Name', sortable: true },
            { key: 'asset_count', label: 'Assets',        sortable: true },
            { key: 'created_at',  label: 'Date Added',    sortable: true },
            { key: '_actions',    label: 'Actions',       sortable: false },
        ],
        renderRow: (l) => `
            <tr>
                <td style="font-weight:600">
                    <i class="bi bi-geo-alt" style="color:var(--accent);margin-right:6px;font-size:12px"></i>
                    ${l.name}
                </td>
                <td>
                    <span class="tag" style="background:var(--green-dim);color:var(--green)">
                        ${l.asset_count ?? 0} asset${l.asset_count != 1 ? 's' : ''}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--white-3)">${formatDate(l.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openEditLocation(${l.id}, '${escHtml(l.name)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteLocation(${l.id}, '${escHtml(l.name)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`,
    });
    window._refTable.init();
});

function loadLocations(page = 1) {
    window._refTable.page = page;
    window._refTable.load();
}

function openAddLocation() {
    document.getElementById('location_edit_id').value = '';
    document.getElementById('location_modal_title').textContent = '📍 Add New Location';
    document.getElementById('location_name').value = '';
    openModal('add_location');
}

function openEditLocation(id, name) {
    document.getElementById('location_edit_id').value = id;
    document.getElementById('location_modal_title').textContent = '✏️ Edit Location';
    document.getElementById('location_name').value = name;
    openModal('add_location');
}

async function saveLocation() {
    const id   = document.getElementById('location_edit_id').value;
    const name = document.getElementById('location_name').value.trim();

    if (!name) { showToast('Location name is required.', 'error'); return; }

    const isEdit = !!id;
    try {
        await apiFetch(isEdit ? `/src/api/locations.php?id=${id}` : '/src/api/locations.php', {
            method: isEdit ? 'PUT' : 'POST',
            body:   JSON.stringify({ name }),
        });
        closeModal('add_location');
        showToast(`Location ${isEdit ? 'updated' : 'created'}.`, 'success');
        window._refTable.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteLocation(id, name) {
    showConfirm('Delete Location', `Delete "${name}"? Assets here will become unassigned.`, async () => {
        try {
            await apiFetch(`/src/api/locations.php?id=${id}`, { method: 'DELETE' });
            showToast('Location deleted.', 'success');
            window._refTable.reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function escHtml(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }