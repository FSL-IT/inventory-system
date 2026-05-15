<div class="modal-overlay" id="modal-add_po">
    <div class="modal" style="max-width:600px">
        <div class="modal-header">
            <div class="modal-title" id="po_modal_title">
                📋 New Purchase Order
            </div>
            <button class="modal-close" 
                    onclick="closeModal('add_po')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="po_edit_id" value="">
            
            <div class="form-field">
                <label for="po_number">
                    PO Number <span style="color:var(--red)">*</span>
                </label>
                <input type="text" id="po_number" 
                        placeholder="e.g. PO-2026-001">
            </div>
            
            <div class="form-field">
                <label for="po_vendor">Vendor</label>
                <select id="po_vendor">
                    <option value="">— Select Vendor —</option>
                </select>
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
            <button class="btn btn-secondary" 
                    onclick="closeModal('add_po')">
                Cancel
            </button>
            <button class="btn btn-primary" id="po_save_btn" 
                    onclick="savePO()">
                <i class="bi bi-floppy"></i> Save PO
            </button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="modal-view_po">
    <div class="modal" style="max-width:680px">
        <div class="modal-header">
            <div class="modal-title" id="view_po_title">
                PO Detail
            </div>
            <button class="modal-close" 
                    onclick="closeModal('view_po')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body" id="view_po_body"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" 
                    onclick="closeModal('view_po')">
                Close
            </button>
            <button class="btn btn-secondary" id="view_po_edit_btn" 
                    onclick="editPoFromView()">
                <i class="bi bi-pencil"></i> Edit
            </button>
        </div>
    </div>
</div>