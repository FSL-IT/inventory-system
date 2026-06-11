// assets/js/users.js

let allUsers = [];

// ─── INIT ─────────────────────────────────────────────────────────
window.initUsers = function() {
    if (typeof registerGlobalSearch === 'function') {
        registerGlobalSearch(function (term) {
            applyUserSearch(term);
        });
    }
    loadUsers();
};

function applyUserSearch(term) {
    let q = (term || '').trim().toLowerCase();
    if (!q) {
        renderUserTable(allUsers);
        return;
    }
    renderUserTable(
        allUsers.filter(function (u) {
            return (u.username || '').toLowerCase().includes(q)
                || (u.role || '').toLowerCase().includes(q);
        })
    );
}

// ─── EVENT HANDLERS ─────────────────────────────────────────────────────────
window.onEditClick = function(e, id, username, role) {
    e.stopPropagation();
    window.openEditUser(id, username, role);
};

window.onDeleteClick = function(e, id, username) {
    e.stopPropagation();
    window.deleteUser(id, username);
};

// ─── LOAD & RENDER ──────────────────────────────────────────────────────────
async function loadUsers() {
    try {
        const data = await apiFetch('/src/api/users.php');
        allUsers = data.data || [];
        let topSearch = document.getElementById('topbar_search');
        applyUserSearch(topSearch ? topSearch.value : '');
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
            </tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => {
        const safeUser  = escapeHtml(u.username);
        const safeRole  = escapeHtml(u.role);
        const jsUser    = escapeJsStr(u.username);
        const jsRole    = escapeJsStr(u.role);
        const initial   = safeUser.charAt(0).toUpperCase();
        const roleClass = u.role === 'admin' ? 'tag-admin' : 'tag-user';
        
        const deleteBtn = u.username !== 'admin' ? `
            <button class="btn btn-danger btn-sm"
                    onclick="window.onDeleteClick(
                        event, ${u.id}, '${jsUser}'
                    )">
                <i class="bi bi-trash"></i>
            </button>` : '';

        return `
            <tr class="clickable-row" 
                    onclick="window.openEditUser(
                        ${u.id}, '${jsUser}', '${jsRole}'
                    )">
                <td>
                    <div class="user-row-wrapper">
                        <div class="user-avatar">${initial}</div>
                        <span class="user-name-text">${safeUser}</span>
                    </div>
                </td>
                <td>
                    <span class="tag ${roleClass}">${safeRole}</span>
                </td>
                <td class="cell-date">
                    ${formatDate(u.created_at)}
                </td>
                <td>
                    <span class="tag tag-active">● Active</span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-secondary btn-sm"
                                onclick="window.onEditClick(
                                    event, ${u.id}, '${jsUser}', '${jsRole}'
                                )">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        ${deleteBtn}
                    </div>
                </td>
            </tr>`;
    }).join('');
}

// ─── ADD / EDIT / DELETE ────────────────────────────────────────────────────
window.openAddUser = function() {
    window.resetUserForm();
    window.validateUserForm();
    window.openModal('add_user');
};

window.openEditUser = function(id, username, role) {
    const unEl = document.getElementById('user_username');
    
    safeSetVal('user_edit_id', id);
    safeSetText('user_modal_title', '✏️ Edit User');
    safeSetVal('user_role', role);
    
    ['user_password', 'user_confirm_password'].forEach(id => {
        safeSetVal(id, '');
    });
    
    if (unEl) {
        unEl.value = username;
        unEl.setAttribute('readonly', 'true');
    }
    
    const hintEl = document.getElementById('pw_hint');
    if (hintEl) hintEl.classList.remove('hidden');
    
    window.validateUserForm();
    window.openModal('add_user');
};

window.saveUser = async function() {
    const id       = getVal('user_edit_id');
    const username = getVal('user_username');
    const role     = getVal('user_role');
    const password = getVal('user_password');
    const confirm  = getVal('user_confirm_password');

    if (!username) {
        showToast('Username is required.', 'error');
        return;
    }
    
    if (password) {
        if (password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }
        if (password !== confirm) {
            showToast('Passwords do not match.', 'error');
            return;
        }
    }

    const payload = { 
        username: username, 
        role: role 
    };

    if (!id || password) {
        if (!password) {
            showToast('Password is required for new users.', 'error');
            return;
        }
        payload.password         = password;
        payload.confirm_password = confirm;
    }

    const isEdit = !!id;
    const url    = isEdit 
        ? `/src/api/users.php?id=${id}` 
        : '/src/api/users.php';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        await apiFetch(url, { 
            method: method, 
            body:   JSON.stringify(payload) 
        });
        
        window.closeModal('add_user');
        window.resetUserForm();
        showToast(`User ${isEdit ? 'updated' : 'created'}.`, 'success');
        loadUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteUser = function(id, username) {
    const msg = `Deactivate "${username}"? They won't be able to log in.`;
    
    window.showConfirm('Deactivate User', msg, async () => {
        try {
            await apiFetch(`/src/api/users.php?id=${id}`, {
                method: 'DELETE',
            });
            showToast('User deactivated.', 'success');
            loadUsers();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
};

window.resetUserForm = function() {
    const unEl = document.getElementById('user_username');
    
    safeSetVal('user_edit_id', '');
    safeSetText('user_modal_title', '👤 Add New User');
    safeSetVal('user_role', 'user');
    
    ['user_password', 'user_confirm_password'].forEach(id => {
        safeSetVal(id, '');
    });
    
    if (unEl) {
        unEl.value = '';
        unEl.removeAttribute('readonly');
    }
    
    const hintEl = document.getElementById('pw_hint');
    if (hintEl) hintEl.classList.add('hidden');
    
    const fillEl = document.getElementById('pw_strength_fill');
    if (fillEl) {
        fillEl.style.width = '0%';
    }
    
    safeSetText('pw_strength_text', '');
    safeSetText('pw_match_msg', '');
    
    const p1 = document.getElementById('user_password');
    const p2 = document.getElementById('user_confirm_password');
    
    if (p1) p1.type = 'password';
    if (p2) p2.type = 'password';
    
    document.querySelectorAll('.pw-toggle-btn').forEach(btn => {
        btn.innerHTML = '<i class="bi bi-eye"></i>';
    });
};

window.validateUserForm = function() {
    const id      = getVal('user_edit_id');
    const un      = getVal('user_username');
    const pw      = getVal('user_password');
    const cp      = getVal('user_confirm_password');
    const btn     = document.getElementById('user_save_btn');
    const errText = document.getElementById('user_form_error');
    const hintEl  = document.getElementById('pw_hint');

    let isValid = true;
    let errMsg  = '';

    if (hintEl && id) {
        if (pw.length > 0) {
            hintEl.classList.add('hidden');
        } else {
            hintEl.classList.remove('hidden');
        }
    }

    if (!un.trim()) {
        isValid = false;
        errMsg = 'Username is required.';
    } else if (!id && pw.length < 8) {
        isValid = false;
        errMsg = 'New users require an 8+ character password.';
    } else if (pw.length > 0 && pw.length < 8) {
        isValid = false;
        errMsg = 'Password must be at least 8 characters.';
    } else if (pw.length > 0 && pw !== cp) {
        isValid = false;
        errMsg = 'Passwords do not match.';
    }

    if (errText) errText.textContent = errMsg;
    
    if (btn) {
        btn.disabled = !isValid;
        if (!isValid) {
            btn.style.opacity = '0.5';
            btn.style.cursor  = 'not-allowed';
        } else {
            btn.style.opacity = '1';
            btn.style.cursor  = 'pointer';
        }
    }
};

// ─── PASSWORD UX & SECURITY ─────────────────────────────────────────────────
window.togglePwVis = function(inpId, btnEl) {
    const inp = document.getElementById(inpId);
    if (!inp) return;
    
    if (inp.type === 'password') {
        inp.type = 'text';
        btnEl.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        inp.type = 'password';
        btnEl.innerHTML = '<i class="bi bi-eye"></i>';
    }
};

window.evalPwStrength = function() {
    const val  = getVal('user_password');
    const fill = document.getElementById('pw_strength_fill');
    const text = document.getElementById('pw_strength_text');
    
    if (!fill || !text) return;
    
    if (!val) {
        fill.style.width = '0%';
        text.textContent = '';
        return;
    }
    
    let score = 0;
    if (val.length >= 8) { score++; }
    if (/[A-Z]/.test(val)) { score++; }
    if (/[0-9]/.test(val)) { score++; }
    if (/[^A-Za-z0-9]/.test(val)) { score++; }
    
    if (score <= 1) {
        fill.style.width      = '33%';
        fill.style.background = 'var(--red, #ef4444)';
        text.textContent      = 'Strength: Weak';
        text.className        = 'pw-text-sm text-red';
    } else if (score === 2 || score === 3) {
        fill.style.width      = '66%';
        fill.style.background = '#facc15';
        text.textContent      = 'Strength: Medium';
        text.className        = 'pw-text-sm text-yellow';
    } else {
        fill.style.width      = '100%';
        fill.style.background = 'var(--green, #22c55e)';
        text.textContent      = 'Strength: Strong';
        text.className        = 'pw-text-sm text-green';
    }
};

window.checkPwMatch = function() {
    const p1  = getVal('user_password');
    const p2  = getVal('user_confirm_password');
    const msg = document.getElementById('pw_match_msg');
    
    if (!msg) return;
    
    if (!p2) {
        msg.textContent = '';
        return;
    }
    
    if (p1 === p2) {
        msg.textContent = 'Passwords match';
        msg.className   = 'pw-text-sm text-green mt-3';
    } else {
        msg.textContent = 'Passwords do not match';
        msg.className   = 'pw-text-sm text-red mt-3';
    }
};