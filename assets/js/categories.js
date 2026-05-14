// assets/js/categories.js

document.addEventListener('DOMContentLoaded', loadCategories);

async function loadCategories() {
    try {
        const data = await apiFetch('/src/api/categories.php');
        renderCategoryList(data.data);
    } catch (err) {
        showToast('Failed to load categories.', 'error');
    }
}

function renderCategoryList(categories) {
    const container = document.getElementById('category_list');

    if (!categories.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__title">No categories yet.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = categories.map(c => `
        <div style="display:flex;align-items:center;gap:12px;
            padding:10px 0;border-bottom:1px solid var(--border-2)">
            <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--white)">
                    ${escapeHtml(c.name)}
                </div>
                <div style="font-size:11px;color:var(--white-4)">
                    ${escapeHtml(c.asset_count)} assets
                </div>
            </div>
            <div class="table-actions">
                <button
                    class="btn btn-secondary btn-sm"
                    onclick="openEditCategory(${c.id}, '${escapeJsArg(c.name)}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button
                    class="btn btn-danger btn-sm"
                    onclick="deleteCategory(${c.id}, '${escapeJsArg(c.name)}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openEditCategory(id, name) {
    document.getElementById('category_edit_id').value = id;
    document.getElementById('category_modal_title').textContent = '✏️ Edit Category';
    document.getElementById('category_name').value = name;
    openModal('add_category');
}

async function saveCategory() {
    const id = document.getElementById('category_edit_id').value;
    const name = document.getElementById('category_name').value.trim();

    if (!name) {
        showToast('Category name is required.', 'error');
        return;
    }

    const payload = { name };
    const isEdit = !!id;
    const url = isEdit
        ? `/src/api/categories.php?id=${id}`
        : '/src/api/categories.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_category');
        document.getElementById('category_edit_id').value = '';
        document.getElementById('category_name').value = '';
        document.getElementById('category_modal_title').textContent = '🏷 Add New Category';
        showToast(`Category ${isEdit ? 'updated' : 'created'}.`, 'success');
        loadCategories();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteCategory(id, name) {
    showConfirm(
        'Delete Category',
        `Delete category "${name}"? This will fail if assets still use it.`,
        async () => {
            try {
                await apiFetch(`/src/api/categories.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Category deleted.', 'success');
                loadCategories();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}
