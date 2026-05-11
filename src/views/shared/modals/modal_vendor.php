<?php // src/views/shared/modals/modal_vendor.php ?>

<div class="modal-overlay" id="modal-add_vendor">
    <div class="modal" style="max-width:420px">
        <div class="modal-header">
            <div class="modal-title" id="vendor_modal_title">
                🏭 Add New Vendor
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_vendor')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="vendor_edit_id">
            <div class="form-field">
                <label for="vendor_name">Vendor Name *</label>
                <input
                    type="text"
                    id="vendor_name"
                    placeholder="e.g. Trends & Technologies, Inc.">
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_vendor')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                onclick="saveVendor()">
                <i class="bi bi-floppy"></i> Save
            </button>
        </div>
    </div>
</div>
