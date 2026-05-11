<?php // src/views/shared/modals/modal_owner.php ?>

<div class="modal-overlay" id="modal-add_owner">
    <div class="modal" style="max-width:420px">
        <div class="modal-header">
            <div class="modal-title" id="owner_modal_title">
                🏢 Add Process Owner
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_owner')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="owner_edit_id">
            <div class="form-field">
                <label for="owner_name">Team / Department Name *</label>
                <input
                    type="text"
                    id="owner_name"
                    placeholder="e.g. Eligibility Services, Truckstop_TruckHub">
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_owner')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                onclick="saveOwner()">
                <i class="bi bi-floppy"></i> Save
            </button>
        </div>
    </div>
</div>
