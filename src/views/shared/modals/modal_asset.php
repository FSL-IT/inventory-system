<?php // src/views/shared/modals/modal_asset.php ?>

<div class="modal-overlay" id="modal-add_asset">
    <div class="modal modal-asset">
        <div class="modal-header">
            <div class="modal-title" id="asset_modal_title">
                📦 Add New Asset
            </div>
            <button class="modal-close"
                    type="button"
                    onclick="window.closeModal('add_asset')"
                    aria-label="Close">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="modal-body asset-modal-body">
            <input type="hidden" id="asset_edit_id" value="">

            <div class="asset-mode-bar" id="asset_mode_toggle">
                <div class="asset-mode-segmented" role="group"
                        aria-label="Entry mode">
                    <button type="button" id="btn_mode_single"
                            class="asset-mode-btn is-active"
                            onclick="window.setAssetMode('single')">
                        <i class="bi bi-upc-scan"></i> Single
                    </button>
                    <button type="button" id="btn_mode_bulk"
                            class="asset-mode-btn"
                            onclick="window.setAssetMode('bulk')">
                        <i class="bi bi-list-ul"></i> Bulk
                    </button>
                </div>
                <span id="asset_mode_hint" class="asset-mode-hint">
                    Single serial entry
                </span>
            </div>

            <section class="modal-form-section">
                <div class="modal-section-title">Purchase Order</div>
                <div class="field-grid field-grid--flush">
                    <div class="form-field">
                        <label id="label_asset_po_field"
                                for="trigger_asset_po">
                            PO Number
                        </label>
                        <div class="searchable-select-wrap"
                                id="wrap_asset_po">
                            <button type="button"
                                    class="searchable-select-trigger"
                                    id="trigger_asset_po"
                                    aria-labelledby="label_asset_po_field"
                                    onclick="toggleSearchableSelect(
                                        'asset_po'
                                    )">
                                <span id="label_asset_po">
                                    — Select PO —
                                </span>
                                <i class="bi bi-chevron-down"
                                        aria-hidden="true"></i>
                            </button>
                            <div class="searchable-select-dropdown"
                                    id="dropdown_asset_po"
                                    role="listbox"
                                    style="display:none">
                                <div class="searchable-select-search-wrap">
                                    <i class="bi bi-search"
                                            aria-hidden="true"></i>
                                    <input type="text"
                                            class="searchable-select-search"
                                            placeholder="Search PO..."
                                            autocomplete="off"
                                            aria-label="Search POs"
                                            oninput="filterSearchableSelect(
                                                'asset_po', this.value
                                            )"
                                            onclick="event.stopPropagation()">
                                </div>
                                <div class="searchable-select-options"
                                        id="options_asset_po">
                                </div>
                            </div>
                            <input type="hidden" id="asset_po">
                        </div>
                    </div>

                    <div class="form-field">
                        <label for="asset_vendor">Vendor (via PO)</label>
                        <input type="text" id="asset_vendor"
                                placeholder="Auto-filled from PO"
                                readonly>
                    </div>
                </div>
            </section>

            <section class="modal-form-section">
                <div class="modal-section-title">Asset Information</div>

                <div id="field_single_serial">
                    <div class="form-field">
                        <label for="asset_serial">
                            Serial Number
                            <span class="field-required">*</span>
                        </label>
                        <input type="text" id="asset_serial"
                                placeholder="e.g. 5CD432D87V"
                                oninput="window.clearFieldError(
                                    'asset_serial'
                                )">
                        <span class="field-error"
                                id="err_asset_serial"></span>
                    </div>
                </div>

                <div id="field_bulk_serials" class="hidden">
                    <div class="form-field">
                        <label for="asset_serials_bulk">
                            Serial Numbers
                            <span class="field-required">*</span>
                            <span class="asset-field-hint">
                                one per line
                            </span>
                        </label>
                        <textarea id="asset_serials_bulk"
                                placeholder="5CD432D87V&#10;5CD432D888"
                                oninput="window.updateBulkCount();
                                         window.clearFieldError(
                                             'asset_serials_bulk'
                                         )">
                        </textarea>
                        <span id="bulk_sn_count" class="asset-bulk-count">
                            0 serial numbers detected
                        </span>
                        <span class="field-error"
                                id="err_asset_serials_bulk"></span>
                    </div>
                </div>

                <div class="field-grid field-grid--flush">
                    <div class="form-field">
                        <label for="asset_desc">
                            Description
                            <span class="field-required">*</span>
                        </label>
                        <input type="text" id="asset_desc"
                                placeholder="e.g. HP ProBook"
                                oninput="window.clearFieldError(
                                    'asset_desc'
                                )">
                        <span class="field-error"
                                id="err_asset_desc"></span>
                    </div>

                    <div class="form-field">
                        <label id="label_asset_category_field"
                                for="trigger_asset_category">
                            Category
                            <span class="field-required">*</span>
                        </label>
                        <div class="searchable-select-wrap"
                                id="wrap_asset_category">
                            <button type="button"
                                    class="searchable-select-trigger"
                                    id="trigger_asset_category"
                                    aria-labelledby="label_asset_category_field"
                                    onclick="toggleSearchableSelect(
                                        'asset_category'
                                    )">
                                <span id="label_asset_category">
                                    — Select Category —
                                </span>
                                <i class="bi bi-chevron-down"
                                        aria-hidden="true"></i>
                            </button>
                            <div class="searchable-select-dropdown"
                                    id="dropdown_asset_category"
                                    role="listbox"
                                    style="display:none">
                                <div class="searchable-select-search-wrap">
                                    <i class="bi bi-search"
                                            aria-hidden="true"></i>
                                    <input type="text"
                                            class="searchable-select-search"
                                            placeholder="Search categories..."
                                            autocomplete="off"
                                            aria-label="Search categories"
                                            oninput="filterSearchableSelect(
                                                'asset_category',
                                                this.value
                                            )"
                                            onclick="event.stopPropagation()">
                                </div>
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

                <div class="form-field form-field--compact">
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
            </section>

            <section class="modal-form-section">
                <div class="modal-section-title">
                    Location &amp; Assignment
                </div>

                <div id="po_autofill_hint" class="po-autofill-hint hidden">
                    <div class="info-field">
                        <div class="val">
                            <i class="bi bi-magic po-autofill-icon"
                                    aria-hidden="true"></i>
                            <span id="po_autofill_msg"></span>
                        </div>
                    </div>
                </div>

                <div class="field-grid field-grid--flush">
                    <div class="form-field">
                        <label id="label_asset_location_field"
                                for="trigger_asset_location">
                            Location
                            <span class="field-required">*</span>
                        </label>
                        <div class="searchable-select-wrap"
                                id="wrap_asset_location">
                            <button type="button"
                                    class="searchable-select-trigger"
                                    id="trigger_asset_location"
                                    aria-labelledby="label_asset_location_field"
                                    onclick="toggleSearchableSelect(
                                        'asset_location'
                                    )">
                                <span id="label_asset_location">
                                    — Select Location —
                                </span>
                                <i class="bi bi-chevron-down"
                                        aria-hidden="true"></i>
                            </button>
                            <div class="searchable-select-dropdown"
                                    id="dropdown_asset_location"
                                    role="listbox"
                                    style="display:none">
                                <div class="searchable-select-search-wrap">
                                    <i class="bi bi-search"
                                            aria-hidden="true"></i>
                                    <input type="text"
                                            class="searchable-select-search"
                                            placeholder="Search locations..."
                                            autocomplete="off"
                                            aria-label="Search locations"
                                            oninput="filterSearchableSelect(
                                                'asset_location',
                                                this.value
                                            )"
                                            onclick="event.stopPropagation()">
                                </div>
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
                        <label id="label_asset_owner_field"
                                for="trigger_asset_owner">
                            Process Owner
                            <span class="field-required">*</span>
                        </label>
                        <div class="searchable-select-wrap"
                                id="wrap_asset_owner">
                            <button type="button"
                                    class="searchable-select-trigger"
                                    id="trigger_asset_owner"
                                    aria-labelledby="label_asset_owner_field"
                                    onclick="toggleSearchableSelect(
                                        'asset_owner'
                                    )">
                                <span id="label_asset_owner">
                                    — Select Owner —
                                </span>
                                <i class="bi bi-chevron-down"
                                        aria-hidden="true"></i>
                            </button>
                            <div class="searchable-select-dropdown"
                                    id="dropdown_asset_owner"
                                    role="listbox"
                                    style="display:none">
                                <div class="searchable-select-search-wrap">
                                    <i class="bi bi-search"
                                            aria-hidden="true"></i>
                                    <input type="text"
                                            class="searchable-select-search"
                                            placeholder="Search owners..."
                                            autocomplete="off"
                                            aria-label="Search process owners"
                                            oninput="filterSearchableSelect(
                                                'asset_owner',
                                                this.value
                                            )"
                                            onclick="event.stopPropagation()">
                                </div>
                                <div class="searchable-select-options"
                                        id="options_asset_owner">
                                </div>
                            </div>
                            <input type="hidden" id="asset_owner">
                        </div>
                        <span class="field-error"
                                id="err_asset_owner"></span>
                    </div>
                </div>

                <div class="form-field form-field--compact">
                    <label for="asset_remarks">Remarks</label>
                    <textarea id="asset_remarks"
                            placeholder="Optional: condition, marks...">
                    </textarea>
                </div>
            </section>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn btn-secondary"
                    onclick="window.closeModal('add_asset')">
                Cancel
            </button>
            <button type="button" class="btn btn-primary"
                    id="asset_save_btn"
                    onclick="window.saveAsset()">
                <i class="bi bi-floppy"></i>
                <span id="asset_save_label">Save Asset</span>
            </button>
        </div>
    </div>
</div>