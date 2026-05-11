<?php // src/views/shared/modals/modal_location.php ?>

<div class="modal-overlay" id="modal-add_location">
    <div class="modal" style="max-width:420px">
        <div class="modal-header">
            <div class="modal-title" id="location_modal_title">
                📍 Add New Location
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_location')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="location_edit_id">
            <div class="form-field">
                <label for="location_name">Location Name *</label>
                <input
                    type="text"
                    id="location_name"
                    placeholder="e.g. Manila-Science Hub T1 2F">
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_location')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                onclick="saveLocation()">
                <i class="bi bi-floppy"></i> Save
            </button>
        </div>
    </div>
</div>
