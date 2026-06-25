// assets/js/backup.js

window.loadBackupList  = loadBackupList;
window.initBackup      = function () {
    loadBackupList();
    initRestoreDropzone();
};

document.addEventListener('DOMContentLoaded', () => {
    loadBackupList();
    initRestoreDropzone();
});

// ─── DROPZONE ─────────────────────────────────────────────────────
function initRestoreDropzone() {
    const zone  = document.getElementById('restore_zone');
    const input = document.getElementById('restore_file');
    if (!zone || !input) {
        return;
    }

    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (!file) {
            return;
        }
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        uploadRestore(input);
    });
}

// ─── LOAD BACKUP LIST ─────────────────────────────────────────────
async function loadBackupList() {
    try {
        const data = await apiFetch('/src/api/backup.php');
        renderBackupTable(data.data);
    } catch (err) {
        const tbody = document.getElementById('backup_list');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3"
                            style="text-align:center;
                                   padding:20px;
                                   color:var(--red)">
                        Could not load backup list.
                    </td>
                </tr>`;
        }
    }
}

// ─── RENDER TABLE ─────────────────────────────────────────────────
function renderBackupTable(backups) {
    const tbody = document.getElementById('backup_list');
    if (!tbody) {
        return;
    }

    if (!backups || !backups.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        <div class="empty-state__icon">🗄️</div>
                        <div class="empty-state__title">
                            No backups yet
                        </div>
                        <div class="empty-state__desc">
                            Click "Create Backup Now" to generate
                            the first backup.
                        </div>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = backups.map(b => `
        <tr>
            <td style="font-size:12px">
                ${escapeHtml(b.created)}
            </td>
            <td style="font-size:12px">
                ${formatBytes(b.size)}
            </td>
            <td>
                <div class="table-actions">
                    <a class="btn btn-secondary btn-sm"
                            href="/src/api/backup.php?action=download&filename=${
                                encodeURIComponent(b.filename)
                            }"
                            title="Download this backup">
                        <i class="bi bi-download"></i>
                        Download
                    </a>
                    <button class="btn btn-warning btn-sm"
                            onclick="confirmRestore(
                                '${escapeHtml(b.filename)}'
                            )"
                            title="Restore from this backup">
                        <i class="bi bi-arrow-counterclockwise">
                        </i>
                        Restore
                    </button>
                </div>
            </td>
        </tr>`).join('');
}

// ─── CREATE BACKUP ────────────────────────────────────────────────
async function createBackup() {
    const btn = document.getElementById('btn_create_backup');
    if (btn) {
        btn.disabled  = true;
        btn.innerHTML =
            '<i class="bi bi-hourglass-split"></i> '
            + 'Creating backup...';
    }

    try {
        const data = await apiFetch(
            '/src/api/backup.php?action=backup',
            { method: 'POST' }
        );
        showToast(
            `✅ Backup saved: ${data.data.filename}`,
            'success'
        );
        loadBackupList();
    } catch (err) {
        showToast(
            err.message ?? 'Backup failed. Please try again.',
            'error'
        );
    } finally {
        if (btn) {
            btn.disabled  = false;
            btn.innerHTML =
                '<i class="bi bi-cloud-upload"></i> '
                + 'Create Backup Now';
        }
    }
}

// ─── CONFIRM + EXECUTE RESTORE FROM SERVER ────────────────────────
function confirmRestore(filename) {
    showConfirm(
        'Restore Database',
        `Restore from "${filename}"?\n\n`
        + 'This will OVERWRITE your current assets and PO data. '
        + 'This action cannot be undone.',
        () => executeRestore(filename)
    );
}

async function executeRestore(filename) {
    window.openModal('restore_progress');

    try {
        const response = await fetch('/src/api/backup.php?action=restore_server', {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'X-CSRF-Token':  getCsrfToken(),
            },
            body: JSON.stringify({ filename }),
        });
        const json = await response.json();

        if (!json.success) throw new Error(json.message);

        showToast('✅ Database restored successfully.', 'success');
        loadBackupList();
    } catch (err) {
        showToast(err.message ?? 'Restore failed.', 'error');
    } finally {
        window.closeModal('restore_progress');
    }
}

// ─── UPLOAD RESTORE ───────────────────────────────────────────────
async function uploadRestore(input) {
    const file = input.files[0];
    if (!file || !file.name.endsWith('.xlsx')) return;

    showConfirm(
        'Restore from Excel File',
        `Restore from "${file.name}"? This will overwrite current data.`,
        async () => {
            window.openModal('restore_progress');
            
            const formData = new FormData();
            formData.append('backup_file', file);

            try {
                const response = await fetch('/src/api/backup.php?action=restore', {
                    method:  'POST',
                    headers: { 'X-CSRF-Token': getCsrfToken() },
                    body: formData,
                });
                const json = await response.json();

                if (!json.success) throw new Error(json.message);

                showToast('✅ Database restored successfully.', 'success');
                loadBackupList();
            } catch (err) {
                showToast(err.message ?? 'Restore failed.', 'error');
            } finally {
                window.closeModal('restore_progress');
                input.value = '';
            }
        }
    );
}

// ─── UPLOAD RESTORE ───────────────────────────────────────────────
async function uploadRestore(input) {
    const file = input.files[0];
    if (!file) {
        return;
    }

    if (!file.name.endsWith('.xlsx')) {
        showToast(
            'Only Excel backup files (.xlsx) are accepted.',
            'error'
        );
        input.value = '';
        return;
    }

    const labelEl = document.getElementById('restore_zone_label');
    if (labelEl) {
        labelEl.textContent = `📂 Selected: ${file.name}`;
    }

    showConfirm(
        'Restore from Excel File',
        `Restore from "${file.name}"?\n\n`
        + 'This will OVERWRITE your current assets and PO data. '
        + 'This action cannot be undone.',
        async () => {
            const formData = new FormData();
            formData.append('backup_file', file);

            try {
                showToast('Restoring... please wait.', 'info');

                const response = await fetch(
                    '/src/api/backup.php?action=restore',
                    {
                        method:  'POST',
                        headers: {
                            'X-CSRF-Token': getCsrfToken(),
                        },
                        body: formData,
                    }
                );
                const json = await response.json();

                if (!json.success) {
                    throw new Error(json.message);
                }

                showToast(
                    '✅ Database restored successfully.',
                    'success'
                );
                loadBackupList();

                if (labelEl) {
                    labelEl.textContent =
                        'Drop your backup Excel file here';
                }
            } catch (err) {
                showToast(
                    err.message ??
                    'Restore failed. Please try again.',
                    'error'
                );
            }

            input.value = '';
        }
    );
}

// ─── HELPER ───────────────────────────────────────────────────────
function formatBytes(bytes) {
    if (!bytes) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const i     = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}