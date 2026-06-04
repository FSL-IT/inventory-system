// assets/js/modal_handler.js

(function () {
    window.openModal = function (id) {
        let overlay = document.getElementById(`modal-${id}`);
        if (!overlay) {
            console.warn(`openModal: #modal-${id} not found`);
            return;
        }
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = function (id) {
        let overlay = document.getElementById(`modal-${id}`);
        if (!overlay) {
            return;
        }
        overlay.classList.remove('open');

        if (!document.querySelector('.modal-overlay.open')) {
            document.body.style.overflow = '';
        }
    };

    window.showConfirm = function (title, desc, onConfirm) {
        let titleEl = document.getElementById('confirm_title');
        let descEl  = document.getElementById('confirm_desc');
        let btn     = document.getElementById('confirm_action_btn');

        if (titleEl) {
            titleEl.textContent = title;
        }
        if (descEl) {
            descEl.textContent = desc;
        }

        if (btn) {
            let fresh = btn.cloneNode(true);
            btn.parentNode.replaceChild(fresh, btn);
            fresh.onclick = function () {
                window.closeModal('confirm');
                onConfirm();
            };
        }

        window.openModal('confirm');
    };

    document.addEventListener('click', function (e) {
        let closeBtn = e.target.closest('.modal-close, [data-close-modal]');
        if (closeBtn) {
            let overlay = closeBtn.closest('.modal-overlay');
            if (overlay) {
                window.closeModal(overlay.id.replace('modal-', ''));
            }
            return;
        }

        if (
            e.target.classList.contains('modal-overlay') &&
            e.target.classList.contains('open')
        ) {
            window.closeModal(e.target.id.replace('modal-', ''));
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') {
            return;
        }
        let open = document.querySelectorAll('.modal-overlay.open');
        if (open.length) {
            let last = open[open.length - 1];
            window.closeModal(last.id.replace('modal-', ''));
        }
    });
})();