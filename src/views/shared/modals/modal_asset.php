<?php // src/views/shared/modals/modal_asset.php ?>

<div class="modal-overlay" id="modal-add_asset">
    <div class="modal" style="max-width:720px">
        <div class="modal-header">
            <div class="modal-title" id="asset_modal_title">
                📦 Add New Asset
            </div>
            <button class="modal-close"
                    onclick="window.closeModal('add_asset')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="modal-body">
            <input type="hidden" id="asset_edit_id" value="">

            <div id="asset_mode_toggle"
                    style="display:flex;gap:8px;margin-bottom:16px">
                <button id="btn_mode_single"
                        class="btn btn-primary btn-sm"
                        onclick="window.setAssetMode('single')">
                    <i class="bi bi-upc-scan"></i> Single
                </button>
                <button id="btn_mode_bulk"
                        class="btn btn-secondary btn-sm"
                        onclick="window.setAssetMode('bulk')">
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
                    <div class="searchable-select-wrap" id="wrap_asset_po">
                        <div class="searchable-select-trigger"
                                id="trigger_asset_po"
                                onclick="toggleSearchableSelect('asset_po')">
                            <span id="label_asset_po">— Select PO —</span>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                        <div class="searchable-select-dropdown"
                                id="dropdown_asset_po"
                                style="display:none">
                            <input type="text"
                                    class="searchable-select-search"
                                    placeholder="Search POs..."
                                    oninput="filterSearchableSelect(
                                        'asset_po', this.value
                                    )"
                                    onclick="event.stopPropagation()">
                            <div class="searchable-select-options"
                                    id="options_asset_po">
                            </div>
                        </div>
                        <input type="hidden" id="asset_po" 
                               onchange="window.onPoChange(this.value)">
                    </div>
                </div>
                
                <div class="form-field">
                    <label for="asset_vendor">Vendor (via PO)</label>
                    <input type="text" id="asset_vendor"
                            placeholder="Auto-filled from PO" readonly>
                </div>
            </div>

            <div class="modal-section-title">Asset Information</div>

            <div id="field_single_serial">
                <div class="form-field">
                    <label for="asset_serial">
                        Serial Number
                        <span class="field-required">*</span>
                    </label>
                    <input type="text" id="asset_serial"
                            placeholder="e.g. 5CD432D87V"
                            oninput="window.clearFieldError('asset_serial')">
                    <span class="field-error"
                            id="err_asset_serial"></span>
                </div>
            </div>

            <div id="field_bulk_serials" style="display:none">
                <div class="form-field">
                    <label for="asset_serials_bulk">
                        Serial Numbers
                        <span class="field-required">*</span>
                        <span class="cell-date"
                                style="font-weight:400;text-transform:none">
                            — one per line
                        </span>
                    </label>
                    <textarea id="asset_serials_bulk"
                            placeholder="5CD432D87V&#10;5CD432D888"
                            style="min-height:120px;font-family:monospace;"
                            oninput="window.updateBulkCount(); 
                                     window.clearFieldError('asset_serials_bulk')">
                    </textarea>
                    <span id="bulk_sn_count" class="cell-date"
                            style="font-size:11px;margin-top:2px">
                        0 serial numbers detected
                    </span>
                    <span class="field-error"
                            id="err_asset_serials_bulk"></span>
                </div>
            </div>

            <div class="field-grid">
                <div class="form-field">
                    <label for="asset_desc">
                        Description
                        <span class="field-required">*</span>
                    </label>
                    <input type="text" id="asset_desc"
                            placeholder="e.g. HP ProBook"
                            oninput="window.clearFieldError('asset_desc')">
                    <span class="field-error" id="err_asset_desc"></span>
                </div>
                
                <div class="form-field">
                    <label for="asset_category">
                        Category
                        <span class="field-required">*</span>
                    </label>
                    <div class="searchable-select-wrap" id="wrap_asset_category">
                        <div class="searchable-select-trigger"
                                id="trigger_asset_category"
                                onclick="toggleSearchableSelect('asset_category')">
                            <span id="label_asset_category">
                                — Select Category —
                            </span>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                        <div class="searchable-select-dropdown"
                                id="dropdown_asset_category"
                                style="display:none">
                            <input type="text"
                                    class="searchable-select-search"
                                    placeholder="Search..."
                                    oninput="filterSearchableSelect(
                                        'asset_category', this.value
                                    )"
                                    onclick="event.stopPropagation()">
                            <div class="searchable-select-options"
                                    id="options_asset_category">
                            </div>
                        </div>
                        <input type="hidden" id="asset_category">
                    </div>
                    <span class="field-error"
                            id="err_asset_category"></span>
                </div>
            </div>

            <div class="form-field">
                <label for="asset_status">
                    Status
                    <span class="field-required">*</span>
                </label>
                <select id="asset_status" 
                        onchange="window.clearFieldError('asset_status')">
                    <option value="">— Select Status —</option>
                    <option value="active">Active</option>
                    <option value="deployed">Deployed</option>
                    <option value="defective">Defective</option>
                    <option value="in_repair">In Repair</option>
                    <option value="retired">Retired</option>
                    <option value="lost">Lost</option>
                </select>
                <span class="field-error" id="err_asset_status"></span>
            </div>

            <div class="modal-section-title">Location &amp; Assignment</div>

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
                        Location
                        <span class="field-required">*</span>
                    </label>
                    <div class="searchable-select-wrap" id="wrap_asset_location">
                        <div class="searchable-select-trigger"
                                id="trigger_asset_location"
                                onclick="toggleSearchableSelect('asset_location')">
                            <span id="label_asset_location">
                                — Select Location —
                            </span>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                        <div class="searchable-select-dropdown"
                                id="dropdown_asset_location"
                                style="display:none">
                            <input type="text"
                                    class="searchable-select-search"
                                    placeholder="Search..."
                                    oninput="filterSearchableSelect(
                                        'asset_location', this.value
                                    )"
                                    onclick="event.stopPropagation()">
                            <div class="searchable-select-options"
                                    id="options_asset_location">
                            </div>
                        </div>
                        <input type="hidden" id="asset_location">
                    </div>
                    <span class="field-error"
                            id="err_asset_location"></span>
                </div>
                
                <div class="form-field">
                    <label for="asset_owner">
                        Process Owner
                        <span class="field-required">*</span>
                    </label>
                    <div class="searchable-select-wrap" id="wrap_asset_owner">
                        <div class="searchable-select-trigger"
                                id="trigger_asset_owner"
                                onclick="toggleSearchableSelect('asset_owner')">
                            <span id="label_asset_owner">
                                — Select Owner —
                            </span>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                        <div class="searchable-select-dropdown"
                                id="dropdown_asset_owner"
                                style="display:none">
                            <input type="text"
                                    class="searchable-select-search"
                                    placeholder="Search..."
                                    oninput="filterSearchableSelect(
                                        'asset_owner', this.value
                                    )"
                                    onclick="event.stopPropagation()">
                            <div class="searchable-select-options"
                                    id="options_asset_owner">
                            </div>
                        </div>
                        <input type="hidden" id="asset_owner">
                    </div>
                    <span class="field-error" id="err_asset_owner"></span>
                </div>
            </div>

            <div class="form-field">
                <label for="asset_remarks">Remarks</label>
                <textarea id="asset_remarks" 
                        placeholder="Optional: condition, marks..."></textarea>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary"
                    onclick="window.closeModal('add_asset')">
                Cancel
            </button>
            <button class="btn btn-primary" id="asset_save_btn"
                    onclick="window.saveAsset()">
                <i class="bi bi-floppy"></i>
                <span id="asset_save_label">Save Asset</span>
            </button>
        </div>
    </div>
</div>