<?php // src/views/shared/modals/modal_po.php ?>

<div class="modal-overlay" id="modal-add_po">
    <div class="modal" style="max-width:600px">
        <div class="modal-header">
            <div class="modal-title" id="po_modal_title">
                📋 New Purchase Order
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_po')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="po_edit_id">
            <div class="field-grid">
                <div class="form-field">
                    <label for="po_number">PO Number *</label>
                    <input
                        type="text"
                        id="po_number"
                        placeholder="7100/NT/FY25/XXXXX/QXXXXX">
                </div>
                <div class="form-field">
                    <label for="po_vendor">Vendor *</label>
                    <select id="po_vendor">
                        <option value="">— Select Vendor —</option>
                    </select>
                </div>
            </div>
            <div class="field-grid">
                <div class="form-field">
                    <label for="po_date_received">Date Received</label>
                    <input type="date" id="po_date_received">
                </div>
                <div class="form-field">
                    <label for="po_date_endorsed">Date Endorsed</label>
                    <input type="date" id="po_date_endorsed">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_po')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                onclick="savePO()">
                <i class="bi bi-floppy"></i> Save PO
            </button>
        </div>
    </div>
</div>
