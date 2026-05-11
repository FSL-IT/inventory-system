<?php // src/views/shared/modals/modal_category.php ?>

<div class="modal-overlay" id="modal-add_category">
    <div class="modal" style="max-width:420px">
        <div class="modal-header">
            <div class="modal-title" id="category_modal_title">
                🏷 Add New Category
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_category')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="category_edit_id">
            <div class="form-field">
                <label for="category_name">Category Name *</label>
                <input
                    type="text"
                    id="category_name"
                    placeholder="e.g. Printer, UPS, Tablet...">
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_category')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                onclick="saveCategory()">
                <i class="bi bi-floppy"></i> Save
            </button>
        </div>
    </div>
</div>
