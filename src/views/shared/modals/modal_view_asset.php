<?php // src/views/shared/modals/modal_view_asset.php ?>

<div class="modal-overlay" id="modal-view_asset">
    <div class="modal modal-asset-view">
        <div class="modal-header">
            <div class="modal-title" id="view_asset_title">
                Asset Detail
            </div>
            <button class="modal-close"
                    type="button"
                    onclick="window.closeModal('view_asset')"
                    aria-label="Close">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="modal-body asset-modal-body">
            <div id="view_asset_body"></div>

            <div id="view_transfer_section" class="hidden">
                <div class="modal-section-title">Transfer History</div>
                <div id="view_transfer_body"></div>
            </div>
        </div>

        <div class="modal-footer">
            <button type="button" class="btn btn-secondary"
                    onclick="window.closeModal('view_asset')">
                Close
            </button>
            <button type="button" class="btn btn-primary"
                    id="view_asset_edit_btn"
                    onclick="window.editAssetFromView()">
                <i class="bi bi-pencil"></i> Edit Asset
            </button>
        </div>
    </div>
</div>
