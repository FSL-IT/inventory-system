// assets/js/modal_handler.js

function openModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) return;
    
    overlay.classList.add('open');
}

function closeModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) return;

    overlay.classList.remove('open');

    setTimeout(() => {
        const form = overlay.querySelector('form');
        if (form) {
            form.reset();
            const hiddenId = form.querySelector('input[type="hidden"]');
            if (hiddenId) hiddenId.value = '';
        }
    }, 300);
}

function showConfirm(title, desc, onConfirm) {
    const titleEl = document.getElementById('confirm_title');
    const descEl  = document.getElementById('confirm_desc');
    const btn     = document.getElementById('confirm_action_btn');

    if (titleEl) titleEl.textContent = title;
    if (descEl)  descEl.textContent  = desc;

    if (btn) {
        btn.onclick = () => {
            closeModal('confirm');
            onConfirm();
        };
    }

    openModal('confirm');
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                const id = overlay.id.replace('modal-', '');
                closeModal(id);
            }
        });
    });

    document.body.addEventListener('click', e => {
        const closeBtn = e.target.closest('.modal-close, [data-close-modal]');
        if (closeBtn) {
            const overlay = closeBtn.closest('.modal-overlay');
            if (overlay) {
                const id = overlay.id.replace('modal-', '');
                closeModal(id);
            }
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay.open');
            modals.forEach(overlay => {
                const id = overlay.id.replace('modal-', '');
                closeModal(id);
            });
        }
    });
});