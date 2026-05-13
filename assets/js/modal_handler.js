// assets/js/modal_handler.js

function openModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) {
        console.warn(`openModal: #modal-${id} not found`);
        return;
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) return;
    overlay.classList.remove('open');

    if (!document.querySelector('.modal-overlay.open')) {
        document.body.style.overflow = '';
    }
}

function showConfirm(title, desc, onConfirm) {
    const titleEl  = document.getElementById('confirm_title');
    const descEl   = document.getElementById('confirm_desc');
    const btn      = document.getElementById('confirm_action_btn');

    if (!titleEl || !descEl || !btn) {
        console.error('showConfirm: confirm modal elements not found. Make sure modal_confirm.php is included in this page.');
        return;
    }

    titleEl.textContent = title;
    descEl.textContent  = desc;

    btn.onclick = () => {
        closeModal('confirm');
        onConfirm();
    };

    openModal('confirm');
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target !== overlay) return;
            const id = overlay.id.replace('modal-', '');
            closeModal(id);
        });
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        // Close the topmost open modal
        const openModals = document.querySelectorAll('.modal-overlay.open');
        if (openModals.length) {
            const last = openModals[openModals.length - 1];
            closeModal(last.id.replace('modal-', ''));
        }
    });
});