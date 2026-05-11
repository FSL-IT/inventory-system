// assets/js/backup.js

document.addEventListener('DOMContentLoaded', loadBackupList);

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

    if (!backups.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
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
            <td>
                <div class="table-actions">
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="confirmRestore('${b.filename}')">
                        <i class="bi bi-arrow-counterclockwise"></i> Restore
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function createBackup() {
    try {
        const data = await apiFetch(
            '/src/api/backup.php?action=backup',
            { method: 'POST' }
        );
        showToast(`Backup created: ${data.data.filename}`, 'success');
        loadBackupList();
    } catch (err) {
        showToast(err.message ?? 'Backup failed.', 'error');
    }
}

function confirmRestore(filename) {
    showConfirm(
        'Restore Database',
        `Restore from "${filename}"? This will OVERWRITE the current database. Type to confirm.`,
        () => executeRestore(filename)
    );
}

async function executeRestore(filename) {
    showToast('Restore in progress...', 'warning');

    try {
        const formData = new FormData();
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
