// assets/js/process_owners.js

document.addEventListener('DOMContentLoaded', () => {
    window._refTable = new RefTable({
        apiUrl:      '/src/api/process_owners.php',
        tbodyId:     'owners_body',
        paginationId:'owner_pagination',
        counterId:   'ref_counter',
        defaultSort: 'name',
        emptyLabel:  'No process owners found.',
        columns: [
            { key: 'name',        label: 'Owner / Team',  sortable: true },
            { key: 'asset_count', label: 'Assets Owned',  sortable: true },
            { key: 'created_at',  label: 'Date Added',    sortable: true },
            { key: '_actions',    label: 'Actions',       sortable: false },
        ],
        renderRow: (o) => `
            <tr>
                <td style="font-weight:600">
                    <i class="bi bi-people" style="color:var(--yellow);margin-right:6px;font-size:12px"></i>
                    ${o.name}
                </td>
                <td>
                    <span class="tag" style="background:var(--yellow-dim);color:var(--yellow)">
                        ${o.asset_count ?? 0} asset${o.asset_count != 1 ? 's' : ''}
                    </span>
                </td>
                <td style="font-size:12px;color:var(--white-3)">${formatDate(o.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openEditOwner(${o.id}, '${escHtml(o.name)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteOwner(${o.id}, '${escHtml(o.name)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`,
    });
    window._refTable.init();
});

function loadOwners(page = 1) {
    window._refTable.page = page;
    window._refTable.load();
}

function openAddOwner() {
    document.getElementById('owner_edit_id').value = '';
    document.getElementById('owner_modal_title').textContent = '🏢 Add Process Owner';
    document.getElementById('owner_name').value = '';
    openModal('add_owner');
}

function openEditOwner(id, name) {
    document.getElementById('owner_edit_id').value = id;
    document.getElementById('owner_modal_title').textContent = '✏️ Edit Process Owner';
    document.getElementById('owner_name').value = name;
    openModal('add_owner');
}

async function saveOwner() {
    const id   = document.getElementById('owner_edit_id').value;
    const name = document.getElementById('owner_name').value.trim();

    if (!name) { showToast('Owner name is required.', 'error'); return; }

    const isEdit = !!id;
    try {
        await apiFetch(isEdit ? `/src/api/process_owners.php?id=${id}` : '/src/api/process_owners.php', {
            method: isEdit ? 'PUT' : 'POST',
            body:   JSON.stringify({ name }),
        });
        closeModal('add_owner');
        showToast(`Owner ${isEdit ? 'updated' : 'created'}.`, 'success');
        window._refTable.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteOwner(id, name) {
    showConfirm('Delete Process Owner', `Delete "${name}"? Linked assets will become unassigned.`, async () => {
        try {
            await apiFetch(`/src/api/process_owners.php?id=${id}`, { method: 'DELETE' });
            showToast('Owner deleted.', 'success');
            window._refTable.reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function escHtml(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }