// assets/js/categories.js

document.addEventListener('DOMContentLoaded', () => {
    window._refTable = new RefTable({
        apiUrl:      '/src/api/categories.php',
        tbodyId:     'category_list',
        paginationId:'category_pagination',
        counterId:   'ref_counter',
        defaultSort: 'name',
        emptyLabel:  'No categories found.',
        columns: [
            { key: 'name',        label: 'Category',    sortable: true },
            { key: 'asset_count', label: 'Assets',      sortable: true },
            { key: 'created_at',  label: 'Date Added',  sortable: true },
            { key: '_actions',    label: 'Actions',     sortable: false },
        ],
        renderRow: (c) => `
            <tr>
                <td style="font-weight:600">
                    <i class="bi bi-tag" style="color:var(--purple);margin-right:6px;font-size:12px"></i>
                    ${c.name}
                </td>
                <td>
                    ${c.asset_count > 0
                        ? `<span class="tag" style="background:var(--purple-dim);color:var(--purple)">${c.asset_count} asset${c.asset_count != 1 ? 's' : ''}</span>`
                        : `<span style="color:var(--white-4);font-size:12px">—</span>`
                    }
                </td>
                <td style="font-size:12px;color:var(--white-3)">${formatDate(c.created_at)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openEditCategory(${c.id}, '${escHtml(c.name)}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" ${c.asset_count > 0 ? 'disabled title="Reassign assets first"' : ''} onclick="deleteCategory(${c.id}, '${escHtml(c.name)}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`,
    });
    window._refTable.init();
});

function loadCategories(page = 1) {
    window._refTable.page = page;
    window._refTable.load();
}

function openAddCategory() {
    document.getElementById('category_edit_id').value = '';
    document.getElementById('category_modal_title').textContent = '🏷 Add New Category';
    document.getElementById('category_name').value = '';
    openModal('add_category');
}

function openEditCategory(id, name) {
    document.getElementById('category_edit_id').value = id;
    document.getElementById('category_modal_title').textContent = '✏️ Edit Category';
    document.getElementById('category_name').value = name;
    openModal('add_category');
}

async function saveCategory() {
    const id   = document.getElementById('category_edit_id').value;
    const name = document.getElementById('category_name').value.trim();

    if (!name) { showToast('Category name is required.', 'error'); return; }

    const isEdit = !!id;
    try {
        await apiFetch(isEdit ? `/src/api/categories.php?id=${id}` : '/src/api/categories.php', {
            method: isEdit ? 'PUT' : 'POST',
            body:   JSON.stringify({ name }),
        });
        closeModal('add_category');
        showToast(`Category ${isEdit ? 'updated' : 'created'}.`, 'success');
        window._refTable.reload();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteCategory(id, name) {
    showConfirm('Delete Category', `Delete "${name}"? This fails if assets still use it.`, async () => {
        try {
            await apiFetch(`/src/api/categories.php?id=${id}`, { method: 'DELETE' });
            showToast('Category deleted.', 'success');
            window._refTable.reload();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function escHtml(s) { return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;'); }