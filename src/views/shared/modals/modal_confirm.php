<?php // src/views/shared/modals/modal_confirm.php ?>

<div class="modal-overlay" id="modal-confirm">
    <div class="confirm-dialog">
        <div class="confirm-dialog__icon" id="confirm_icon">⚠️</div>
        <div class="confirm-dialog__title" id="confirm_title">
            Confirm Action
        </div>
        <div class="confirm-dialog__desc" id="confirm_desc">
            Are you sure you want to proceed?
        </div>
        <div class="confirm-dialog__actions">
            <button
                class="btn btn-secondary"
                onclick="closeModal('confirm')">
                Cancel
            </button>
            <button
                class="btn btn-danger"
                id="confirm_action_btn">
                Confirm
            </button>
        </div>
    </div>
</div>
