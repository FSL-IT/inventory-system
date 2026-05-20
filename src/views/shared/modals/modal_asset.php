<?php // src/views/shared/modals/modal_asset.php ?>

<div class="modal-overlay" id="modal-add_asset">
    <div class="modal" style="max-width:720px">
        <div class="modal-header">
            <div class="modal-title" id="asset_modal_title">
                📦 Add New Asset
            </div>
            <button class="modal-close"
                    onclick="closeModal('add_asset')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="modal-body">
            <input type="hidden" id="asset_edit_id" value="">

            <!-- Mode toggle (add only) -->
            <div id="asset_mode_toggle"
                    style="display:flex;gap:8px;
                           margin-bottom:16px">
                <button id="btn_mode_single"
                        class="btn btn-primary btn-sm"
                        onclick="setAssetMode('single')">
                    <i class="bi bi-upc-scan"></i> Single
                </button>
                <button id="btn_mode_bulk"
                        class="btn btn-secondary btn-sm"
                        onclick="setAssetMode('bulk')">
                    <i class="bi bi-list-ul"></i> Bulk
                </button>
                <span id="asset_mode_hint" class="cell-date"
                        style="align-self:center;font-size:11px">
                    Single serial entry
                </span>
            </div>

            <div class="modal-section-title">Purchase Order</div>
            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_po">PO Number</label>
                    <select id="asset_po"
                            onchange="onPoChange(this)">
                        <option value="">— Select PO —</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="asset_vendor">Vendor (via PO)</label>
                    <input type="text" id="asset_vendor"
                            placeholder="Auto-filled from PO"
                            readonly>
                </div>
            </div>

            <div class="modal-section-title">Asset Information</div>

            <div id="field_single_serial">
                <div class="form-field">
                    <label for="asset_serial">
                        Serial Number
                        <span style="color:var(--red)">*</span>
                    </label>
                    <input type="text" id="asset_serial"
                            placeholder="e.g. 5CD432D87V">
                </div>
            </div>

            <div id="field_bulk_serials" style="display:none">
                <div class="form-field">
                    <label for="asset_serials_bulk">
                        Serial Numbers
                        <span style="color:var(--red)">*</span>
                        <span class="cell-date"
                                style="font-weight:400;
                                       text-transform:none">
                            — one per line or comma-separated
                        </span>
                    </label>
                    <textarea id="asset_serials_bulk"
                            placeholder="5CD432D87V&#10;5CD432D888"
                            style="min-height:120px;
                                   font-family:monospace;
                                   font-size:12px"
                            oninput="updateBulkCount()">
                    </textarea>
                    <span id="bulk_sn_count" class="cell-date"
                            style="font-size:11px;margin-top:2px">
                        0 serial numbers detected
                    </span>
                </div>
            </div>

            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_desc">
                        Description
                        <span style="color:var(--red)">*</span>
                    </label>
                    <input type="text" id="asset_desc"
                            placeholder="e.g. HP ProBook 440 G11">
                </div>
                <div class="form-field">
                    <label for="asset_category">
                        Category
                        <span style="color:var(--red)">*</span>
                    </label>
                    <select id="asset_category">
                        <option value="">— Select Category —</option>
                    </select>
                </div>
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

            <div class="modal-section-title">
                Location &amp; Assignment
            </div>

            <div id="po_autofill_hint"
                    style="display:none;margin-bottom:12px">
                <div class="info-field"
                        style="border-left:3px solid var(--accent);
                               padding:8px 12px">
                    <div class="val" style="font-size:12px">
                        <i class="bi bi-magic"
                                style="color:var(--accent);
                                       margin-right:6px"></i>
                        <span id="po_autofill_msg"></span>
                    </div>
                </div>
            </div>

            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_location">
                        Center / Location
                        <span style="color:var(--red)">*</span>
                    </label>
                    <select id="asset_location">
                        <option value="">— Select Location —</option>
                    </select>
                </div>
                <div class="form-field">
                    <label for="asset_owner">
                        Process Owner
                        <span style="color:var(--red)">*</span>
                    </label>
                    <select id="asset_owner">
                        <option value="">— Select Owner —</option>
                    </select>
                </div>
            </div>

            <!-- Standardised remarks dropdown -->
            <div class="form-field">
                <label for="asset_remarks_select">Remarks</label>
                <select id="asset_remarks_select"
                        onchange="onRemarksChange(this)">
                    <option value="NA">None / NA</option>
                    <option value="pink_mark">With pink mark</option>
                    <option value="orange_mark">
                        With orange mark
                    </option>
                    <option value="no_mark">No mark</option>
                    <option value="with_monitor">With monitor</option>
                    <option value="partial">Partial delivery</option>
                    <option value="others">Others (specify)</option>
                </select>
            </div>

            <!-- Free-text: shown only when Others is selected -->
            <div class="form-field" id="field_remarks_text"
                    style="display:none">
                <label for="asset_remarks">
                    Specify remarks
                </label>
                <textarea id="asset_remarks"
                        placeholder="Describe condition, marks...">
                </textarea>
            </div>

        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary"
                    onclick="closeModal('add_asset')">
                Cancel
            </button>
            <button class="btn btn-primary" id="asset_save_btn"
                    onclick="saveAsset()">
                <i class="bi bi-floppy"></i>
                <span id="asset_save_label">Save Asset</span>
            </button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="modal-view_asset">
    <div class="modal" style="max-width:680px">
        <div class="modal-header">
            <div class="modal-title" id="view_asset_title">
                Asset Detail
            </div>
            <button class="modal-close"
                    onclick="closeModal('view_asset')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body" id="view_asset_body"></div>
        <div class="modal-footer">
            <button class="btn btn-secondary"
                    onclick="closeModal('view_asset')">
                Close
            </button>
            <button class="btn btn-secondary"
                    id="view_asset_edit_btn"
                    onclick="editAssetFromView()">
                <i class="bi bi-pencil"></i> Edit
            </button>
        </div>
    </div>
</div>