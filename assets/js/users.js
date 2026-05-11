// assets/js/users.js

document.addEventListener('DOMContentLoaded', loadUsers);

async function loadUsers() {
    try {
        const data = await apiFetch('/src/api/users.php');
        renderUserTable(data.data);
    } catch (err) {
        showToast('Failed to load users.', 'error');
    }
}

function renderUserTable(users) {
    const tbody = document.getElementById('users_body');

    if (!users.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state__title">No users found.</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="width:28px;height:28px;
                        background:linear-gradient(135deg,var(--blue-mid),var(--accent));
                        border-radius:50%;display:flex;align-items:center;
                        justify-content:center;font-size:11px;font-weight:700;color:#fff">
                        ${u.username[0].toUpperCase()}
                    </div>
                    <span style="font-weight:500">${u.username}</span>
                </div>
            </td>
            <td>
                <span class="tag ${u.role === 'admin' ? 'tag-admin' : 'tag-user'}">
                    ${u.role}
                </span>
            </td>
            <td style="font-size:11px;color:var(--white-3)">
                ${formatDate(u.created_at)}
            </td>
            <td><span class="tag tag-active">● Active</span></td>
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="openEditUser(${u.id}, '${u.username}', '${u.role}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    ${u.username !== 'admin' ? `
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="deleteUser(${u.id}, '${u.username}')">
                        <i class="bi bi-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function openEditUser(id, username, role) {
    document.getElementById('user_edit_id').value = id;
    document.getElementById('user_modal_title').textContent = '✏️ Edit User';
    document.getElementById('user_username').value = username;
    document.getElementById('user_username').setAttribute('readonly', true);
    document.getElementById('user_role').value = role;
    document.getElementById('user_password').value = '';
    document.getElementById('user_confirm_password').value = '';
    document.getElementById('pw_hint').classList.remove('hidden');
    openModal('add_user');
}

async function saveUser() {
    const id = document.getElementById('user_edit_id').value;
    const username = document.getElementById('user_username').value.trim();
    const role = document.getElementById('user_role').value;
    const password = document.getElementById('user_password').value;
    const confirmPassword = document.getElementById('user_confirm_password').value;

    if (!username) {
        showToast('Username is required.', 'error');
        return;
    }

    const payload = { username, role };

    if (!id || password) {
        if (!password) {
            showToast('Password is required for new users.', 'error');
            return;
        }

        payload.password = password;
        payload.confirm_password = confirmPassword;
    }

    const isEdit = !!id;
    const url = isEdit ? `/src/api/users.php?id=${id}` : '/src/api/users.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { method, body: JSON.stringify(payload) });
        closeModal('add_user');
        resetUserForm();
        showToast(`User ${isEdit ? 'updated' : 'created'}.`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function deleteUser(id, username) {
    showConfirm(
        'Deactivate User',
        `Deactivate account "${username}"? They will no longer be able to log in.`,
        async () => {
            try {
                await apiFetch(`/src/api/users.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('User deactivated.', 'success');
                loadUsers();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    );
}

function resetUserForm() {
    document.getElementById('user_edit_id').value = '';
    document.getElementById('user_modal_title').textContent = '👤 Add New User';
    document.getElementById('user_username').value = '';
    document.getElementById('user_username').removeAttribute('readonly');
    document.getElementById('user_role').value = 'user';
    document.getElementById('user_password').value = '';
    document.getElementById('user_confirm_password').value = '';
    document.getElementById('pw_hint').classList.add('hidden');
}
