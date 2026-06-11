<?php // src/views/shared/modals/modal_po.php ?>

<div class="modal-overlay" id="modal-add_po">
    <div class="modal" style="max-width:600px">
        <div class="modal-header">
            <div class="modal-title" id="po_modal_title">
                📋 New Purchase Order
            </div>
            <button class="modal-close"
                    onclick="window.closeModal('add_po')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        
        <div class="modal-body">
            <form id="po_form" onsubmit="event.preventDefault();">
                <input type="hidden" id="po_edit_id" value="">

                <div class="form-field">
                    <label for="po_number">
                        PO Number
                        <span style="color:var(--red)">*</span>
                    </label>
                    <input type="text" 
                            id="po_number"
                            placeholder="e.g. 7100/NT/FY25/94426" 
                            required>
                </div>

                <div class="form-field">
                    <label for="po_vendor">Vendor</label>
                    <select id="po_vendor">
                        <option value="">— Select Vendor —</option>
                    </select>
                </div>

                <div class="field-grid">
                    <div class="form-field">
                        <label for="po_date_received">
                            Date Received
                        </label>
                        <input type="date" id="po_date_received">
                    </div>
                    <div class="form-field">
                        <label for="po_date_endorsed">
                            Date Endorsed by Admin
                        </label>
                        <input type="date" id="po_date_endorsed">
                    </div>
                </div>
            </form>
        </div>
        
        <div class="modal-footer" 
                style="display:flex; justify-content:space-between">
            <button class="btn btn-secondary"
                    onclick="window.closeModal('add_po')">
                Cancel
            </button>
            <div style="display:flex; gap:8px">
                <button class="btn btn-secondary" 
                        id="btn_save_po"
                        onclick="window.savePO(false)">
                    <i class="bi bi-floppy"></i> Save PO
                </button>
                <button class="btn btn-primary" 
                        id="btn_save_po_next"
                        onclick="window.savePO(true)">
                    Save &amp; Add Assets 
                    <i class="bi bi-arrow-right"></i>
                </button>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="modal-view_po">
    <div class="modal" style="max-width:820px">
        <div class="modal-header">
            <div class="modal-title" id="view_po_title">
                PO Detail
            </div>
            <button class="modal-close"
                    onclick="window.closeModal('view_po')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="modal-body">
            <div class="modal-section-title">
                Purchase Order Info
            </div>
            <div id="view_po_summary"></div>

            <div class="modal-section-title"
                    style="margin-top:20px;
                           display:flex;
                           align-items:center;
                           justify-content:space-between">
                <span>Items (per Category)</span>
                
                <button class="btn btn-primary btn-sm"
                        id="po_add_assets_btn"
                        onclick="window.openAddAssetFromPO()"
                        style="font-size:12px">
                    <i class="bi bi-plus-lg"></i>
                    Add Assets to this PO
                </button>
            </div>

            <div class="table-wrapper" style="margin-top:8px">
                <div class="table-scroll">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Description</th>
                                <th style="text-align:center">
                                    Qty
                                </th>
                                <th>Center Location</th>
                                <th>Process Owner</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody id="view_po_asset_body">
                            <tr>
                                <td colspan="6"
                                        style="text-align:center;
                                               padding:16px;
                                               color:var(--white-4)">
                                    Loading…
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary"
                    onclick="window.closeModal('view_po')">
                Close
            </button>
            <button class="btn btn-secondary"
                    id="view_po_edit_btn"
                    onclick="window.editPoFromView()">
                <i class="bi bi-pencil"></i> Edit PO
            </button>
        </div>
    </div>
</div>