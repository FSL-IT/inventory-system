// assets/js/modal_handler.js
// Uses pure event delegation — all modals work regardless of
// when they are inserted into the DOM (initial load or SPA swap).

// ─── OPEN ────────────────────────────────────────────────────────
function openModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) {
        console.warn(`openModal: #modal-${id} not found`);
        return;
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// ─── CLOSE ───────────────────────────────────────────────────────
function closeModal(id) {
    const overlay = document.getElementById(`modal-${id}`);
    if (!overlay) {
        return;
    }
    overlay.classList.remove('open');

    // Restore body scroll only when no other modals are open
    if (!document.querySelector('.modal-overlay.open')) {
        document.body.style.overflow = '';
    }
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────────
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
        // Clone node to remove any previous onclick binding
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        fresh.onclick = () => {
            closeModal('confirm');
            onConfirm();
        };
    }

    openModal('confirm');
}

// ─── EVENT DELEGATION ────────────────────────────────────────────
// ONE listener on document for all modal interactions.
// Works for modals added before AND after page load.

// Close button (X) or any element with data-close-modal
document.addEventListener('click', e => {
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

    // Backdrop click — only fires when clicking the overlay
    // itself, not its children
    if (
        e.target.classList.contains('modal-overlay') &&
        e.target.classList.contains('open')
    ) {
        closeModal(e.target.id.replace('modal-', ''));
    }
});

// Escape key — closes topmost open modal
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') {
        return;
    }
    const open = document.querySelectorAll('.modal-overlay.open');
    if (open.length) {
        const last = open[open.length - 1];
        closeModal(last.id.replace('modal-', ''));
    }
});