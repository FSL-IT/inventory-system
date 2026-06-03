// assets/js/modal_handler.js

function openModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) {
        return;
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) {
        return;
    }
    overlay.classList.remove('open');

    const stillOpen = document.querySelectorAll(
        '.modal-overlay.open'
    );
    if (!stillOpen.length) {
        document.body.style.overflow = '';
    }

    setTimeout(() => {
        const inputs = overlay.querySelectorAll(
            'input:not([type="hidden"]), textarea, select'
        );
        inputs.forEach(el => { el.value = ''; });

        const hidden = overlay.querySelectorAll(
            'input[type="hidden"]'
        );
        hidden.forEach(el => { el.value = ''; });
    }, 300);
}

function showConfirm(title, desc, onConfirm) {
    const titleEl = document.getElementById('confirm_title');
    const descEl  = document.getElementById('confirm_desc');
    const btn     = document.getElementById('confirm_action_btn');

    if (titleEl) {
        titleEl.textContent = title;
    }
    if (descEl) {
        descEl.textContent = desc;
    }

    if (btn) {
        // Clone to remove any previous onclick
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => {
            closeModal('confirm');
            onConfirm();
        };
    }

    openModal('confirm');
}

document.addEventListener('click', e => {
    // Close button or [data-close-modal]
    const closeBtn = e.target.closest(
        '.modal-close, [data-close-modal]'
    );
    if (closeBtn) {
        const overlay = closeBtn.closest('.modal-overlay');
        if (overlay) {
            closeModal(overlay.id.replace('modal-', ''));
        }
        return;
    }

    const overlay = e.target.closest('.modal-overlay');
    if (overlay && e.target === overlay) {
        closeModal(overlay.id.replace('modal-', ''));
    }
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') {
        return;
    }
    const openModals = document.querySelectorAll(
        '.modal-overlay.open'
    );
    if (openModals.length) {
        const last = openModals[openModals.length - 1];
        closeModal(last.id.replace('modal-', ''));
    }
});