<div class="modal-overlay" id="modal-add_asset">
    <div class="modal" style="max-width:720px">
        <div class="modal-header">
            <div class="modal-title" id="asset_modal_title">
                📦 Add New Asset
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_asset')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="asset_edit_id" value="">

            <div class="modal-section-title">Asset Information</div>
            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_serial">
                        Serial Number <span style="color:var(--red)">*</span>
                    </label>
                    <input
                        type="text"
                        id="asset_serial"
                        placeholder="e.g. 5CD432D87V">
                </div>
                <div class="form-field">
                    <label for="asset_desc">
                        Description <span style="color:var(--red)">*</span>
                    </label>
                    <input
                        type="text"
                        id="asset_desc"
                        placeholder="e.g. HP ProBook 440 G11">
                </div>
            </div>
            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_category">
                        Category <span style="color:var(--red)">*</span>
                    </label>
                    <select id="asset_category">
                        <option value="">— Select Category —</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="asset_status">Status</label>
                    <select id="asset_status">
                        <option value="active">Active</option>
                        <option value="deployed">Deployed</option>
                        <option value="defective">Defective</option>
                        <option value="in_repair">In Repair</option>
                        <option value="retired">Retired</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
            </div>

            <div class="modal-section-title">Purchase Order</div>
            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_po">PO Number</label>
                    <select id="asset_po" onchange="onPoChange(this)">
                        <option value="">— Select PO —</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="asset_vendor">Vendor (via PO)</label>
                    <input
                        type="text"
                        id="asset_vendor"
                        placeholder="Auto-filled from PO"
                        readonly>
                </div>
            </div>

            <div class="modal-section-title">Location &amp; Assignment</div>
            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_location">Center / Location</label>
                    <select id="asset_location">
                        <option value="">— Select Location —</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="asset_owner">Process Owner</label>
                    <select id="asset_owner">
                        <option value="">— Select Owner —</option>
                    </select>
                </div>
            </div>
            <div class="form-field">
                <label for="asset_remarks">Remarks</label>
                <textarea
                    id="asset_remarks"
                    placeholder="Optional notes, special conditions, marks...">
                </textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_asset')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                id="asset_save_btn"
                onclick="saveAsset()">
                <i class="bi bi-floppy"></i> Save Asset
            </button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="modal-view_asset">
    <div class="modal" style="max-width:680px">
        <div class="modal-header">
            <div class="modal-title" id="view_asset_title">Asset Detail</div>
            <button
                class="modal-close"
                onclick="closeModal('view_asset')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body" id="view_asset_body"></div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('view_asset')">
                Close
            </button>
            <button
                class="btn btn-secondary"
                id="view_asset_edit_btn"
                onclick="editAssetFromView()">
                <i class="bi bi-pencil"></i> Edit
            </button>
        </div>
    </div>
</div>