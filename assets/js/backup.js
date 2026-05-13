// assets/js/backup.js

document.addEventListener('DOMContentLoaded', () => {
    loadBackupList();
    initRestoreDropzone();
});

function initRestoreDropzone() {
    const zone = document.getElementById('restore_zone');
    const input = document.getElementById('restore_file');
    if (!zone || !input) return;

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
        if (!file) return;

        // Manually assign to the file input and trigger handler
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        uploadRestore(input);
    });
}

async function loadBackupList() {
    try {
        const data = await apiFetch('/src/api/backup.php');
        renderBackupTable(data.data);
    } catch (err) {
        showToast('Failed to load backup list.', 'error');
    }
}

function renderBackupTable(backups) {
    const tbody = document.getElementById('backup_list');

    if (!backups || !backups.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    <div class="empty-state">
                        <div class="empty-state__icon">🗄️</div>
                        <div class="empty-state__title">No backups yet.</div>
                        <div class="empty-state__desc">
                            Click "Create Backup Now" to generate the first one.
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = backups.map(b => `
        <tr>
            <td style="font-size:12px">${b.created}</td>
            <td style="font-size:12px">${formatBytes(b.size)}</td>
            <td style="font-size:12px;font-family:monospace;color:var(--white-3)">${b.filename}</td>
            <td>
                <div class="table-actions">
                    <a
                        class="btn btn-secondary btn-sm"
                        href="/src/api/backup.php?action=download&filename=${encodeURIComponent(b.filename)}"
                        title="Download backup">
                        <i class="bi bi-download"></i>
                    </a>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="confirmRestore('${b.filename}')"
                        title="Restore this backup">
                        <i class="bi bi-arrow-counterclockwise"></i> Restore
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function createBackup() {
    const btn = document.querySelector('[onclick="createBackup()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Creating...'; }

    try {
        const data = await apiFetch(
            '/src/api/backup.php?action=backup',
            { method: 'POST' }
        );
        showToast(`Backup created: ${data.data.filename}`, 'success');
        loadBackupList();
    } catch (err) {
        showToast(err.message ?? 'Backup failed.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-upload"></i> Create Backup Now'; }
    }
}

function confirmRestore(filename) {
    showConfirm(
        'Restore Database',
        `Restore from "${filename}"? This will OVERWRITE the current database and cannot be undone.`,
        () => executeRestore(filename)
    );
}

async function executeRestore(filename) {
    showToast('Restore in progress...', 'warning');

    try {
        const response = await fetch(
            '/src/api/backup.php?action=restore_server',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken(),
                },
                body: JSON.stringify({ filename }),
            }
        );
        const json = await response.json();

        if (!json.success) {
            throw new Error(json.message);
        }

        showToast('Database restored successfully.', 'success');
    } catch (err) {
        showToast(err.message ?? 'Restore failed.', 'error');
    }
}

async function uploadRestore(input) {
    const file = input.files[0];

    if (!file) {
        return;
    }

    if (!file.name.endsWith('.sql')) {
        showToast('Only .sql files are accepted.', 'error');
        input.value = '';
        return;
    }

    showConfirm(
        'Restore Database',
        `Restore from "${file.name}"? This will OVERWRITE the current database.`,
        async () => {
            const formData = new FormData();
            formData.append('backup_file', file);

            try {
                showToast('Restoring...', 'info');

                const response = await fetch(
                    '/src/api/backup.php?action=restore',
                    {
                        method: 'POST',
                        headers: { 'X-CSRF-Token': getCsrfToken() },
                        body: formData,
                    }
                );
                const json = await response.json();

                if (!json.success) {
                    throw new Error(json.message);
                }

                showToast('Database restored successfully.', 'success');
                loadBackupList();
            } catch (err) {
                showToast(err.message ?? 'Restore failed.', 'error');
            }

            input.value = '';
        }
    );
}

function formatBytes(bytes) {
    if (!bytes) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
