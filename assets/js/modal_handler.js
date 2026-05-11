// assets/js/modal_handler.js

function openModal(id) {
    const overlay = document.getElementById(`modal-${id}`);

    if (!overlay) {
        return;
    }

    overlay.classList.add('open');
}

function closeModal(id) {
    const overlay = document.getElementById(`modal-${id}`);

    if (!overlay) {
        return;
    }

    overlay.classList.remove('open');
}

function showConfirm(title, desc, onConfirm) {
    document.getElementById('confirm_title').textContent = title;
    document.getElementById('confirm_desc').textContent = desc;

    const btn = document.getElementById('confirm_action_btn');

    btn.onclick = () => {
        closeModal('confirm');
        onConfirm();
    };

    openModal('confirm');
}

// Close on overlay click
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target !== overlay) {
                return;
            }

            const id = overlay.id.replace('modal-', '');
            closeModal(id);
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') {
            return;
        }

        document.querySelectorAll('.modal-overlay.open').forEach(overlay => {
            const id = overlay.id.replace('modal-', '');
            closeModal(id);
        });
    });
});
