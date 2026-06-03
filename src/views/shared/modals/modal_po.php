<?php // src/views/shared/modals/modal_po.php ?>

<!-- ── ADD / EDIT PO MODAL ───────────────────────────────────── -->
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
                    PO Number
                    <span style="color:var(--red)">*</span>
                </label>
                <input type="text" id="po_number"
                        placeholder="e.g. 7100/NT/FY25/94426">
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

<!-- ── VIEW PO MODAL ─────────────────────────────────────────── -->
<div class="modal-overlay" id="modal-view_po">
    <div class="modal" style="max-width:820px">
        <div class="modal-header">
            <div class="modal-title" id="view_po_title">
                PO Detail
            </div>
            <button class="modal-close"
                    onclick="closeModal('view_po')">
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
                <!--
                    "Add Assets to this PO" button.
                    Shown for ALL roles — clicking opens the
                    add_asset modal pre-filled with this PO.
                    The button is the entry point for the
                    new PO-first asset-adding flow.
                -->
                <button class="btn btn-primary btn-sm"
                        id="po_add_assets_btn"
                        onclick="openAddAssetFromPO()"
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
                    onclick="closeModal('view_po')">
                Close
            </button>
            <!--
                Edit PO — admin only at PHP level;
                for user role this button is hidden
            -->
            <?php if (isAdmin()): ?>
            <button class="btn btn-secondary"
                    id="view_po_edit_btn"
                    onclick="editPoFromView()">
                <i class="bi bi-pencil"></i> Edit PO
            </button>
            <?php endif; ?>
        </div>
    </div>
</div>