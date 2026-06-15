<?php // src/views/shared/modals/modal_import.php ?>

<div class="modal-overlay" id="modal-import_modal">
    <div class="modal" style="max-width:580px">
        <div class="modal-header">
            <div class="modal-title" id="import_modal_title">
                📥 Import Data
            </div>
            <button class="modal-close"
                    onclick="closeModal('import_modal')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>

        <div class="modal-body">
            <div id="import_step_upload">

                <div id="fmt_info_po" class="insight-card
                        insight-card--blue"
                        style="display:none;margin-bottom:14px">
                    <div class="insight-card__icon">📊</div>
                    <div>
                        <div class="insight-card__title"
                                style="color:var(--blue-tag)">
                            PO Import Format
                        </div>
                        <div class="insight-card__desc">
                            Upload your existing PO Tracker Excel.
                            Detected sheets:
                            <strong>Desktop, Laptop, Webcam,
                            Docking, Headset, Monitor,
                            Network Devices, Yubikey</strong>.<br>
                            Columns per sheet:
                            <code style="display:block;
                                         margin-top:6px;
                                         font-size:11px;
                                         color:var(--white-3);
                                         line-height:1.8">
                                Description · Serial Number · PO# ·
                                Center Delivered · Process Name ·
                                Remarks
                            </code>
                        </div>
                    </div>
                </div>

                <div id="fmt_info_flat"
                        class="insight-card insight-card--blue"
                        style="display:none;margin-bottom:14px">
                    <div class="insight-card__icon">📋</div>
                    <div>
                        <div class="insight-card__title"
                                style="color:var(--blue-tag)">
                            Asset Template Format
                        </div>
                        <div class="insight-card__desc">
                            Single-sheet file, headers in row 1:
                            <code style="display:block;
                                         margin-top:6px;
                                         font-size:11px;
                                         color:var(--white-3);
                                         line-height:1.8">
                                serial_number · description ·
                                category · po_number · vendor ·
                                location · process_owner · status ·
                                date_received · date_endorsed ·
                                remarks
                            </code>
                        </div>
                    </div>
                </div>

                <div class="upload-zone" id="import_drop_zone"
                        onclick="document.getElementById(
                                     'import_file').click()">
                    <div class="upload-zone__icon">
                        <i class="bi bi-file-earmark-spreadsheet">
                        </i>
                    </div>
                    <div class="upload-zone__label"
                            id="import_zone_label">
                        Drop your .xlsx file here
                    </div>
                    <div class="upload-zone__sub">
                        or click to browse — large files supported
                    </div>
                </div>

                <input type="file" id="import_file"
                        accept=".xlsx" style="display:none"
                        onchange="onImportFileSelected(this)">

                <div style="margin-top:14px;display:flex;gap:8px;
                            justify-content:flex-end;
                            align-items:center">
                    <a href="#" 
                       id="btn_download_template" 
                       class="btn btn-secondary btn-sm">
                        <i class="bi bi-download"></i> Download Template
                    </a>
                    <button class="btn btn-primary"
                            id="import_submit_btn"
                            disabled>
                        <i class="bi bi-upload"></i> Import
                    </button>
                </div>
            </div>

            <div id="import_step_progress"
                    style="display:none;text-align:center;
                           padding:20px 0">
                <div style="font-size:36px;margin-bottom:12px">⏳</div>
                <div style="font-size:15px;font-weight:600;
                            color:var(--white);margin-bottom:8px">
                    Importing data...
                </div>
                <div style="font-size:13px;color:var(--white-3);
                            margin-bottom:20px">
                    Please wait. Large files may take a minute.
                </div>
                <div class="progress-bar"
                        style="height:8px;border-radius:4px">
                    <div class="progress-fill
                                import-progress-fill"
                            style="width:100%;
                                   animation:progress-pulse
                                   1.5s ease-in-out infinite">
                    </div>
                </div>
            </div>

            <div id="import_step_results" style="display:none">
                <div id="import_results_body"></div>
            </div>

        </div>

        <div class="modal-footer" id="import_modal_footer">
            <button class="btn btn-secondary"
                    onclick="closeModal('import_modal')">
                Close
            </button>
        </div>
    </div>
</div>

<style>
@keyframes progress-pulse {
    0%   { opacity: 1; }
    50%  { opacity: 0.4; }
    100% { opacity: 1; }
}
</style>