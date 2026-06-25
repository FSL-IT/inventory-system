<?php // src/views/shared/modals/modal_user.php ?>

<div class="modal-overlay" id="modal-add_user">
    <div class="modal modal-sm">
        <div class="modal-header">
            <div class="modal-title" id="user_modal_title">
                👤 Add New User
            </div>
            <button class="modal-close"
                    onclick="window.closeModal('add_user')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="user_edit_id">
            
            <div class="field-grid">
                <div class="form-field">
                    <label for="user_username">Username *</label>
                    <input type="text" id="user_username"
                            placeholder="e.g. jdelacruz"
                            autocomplete="off"
                            oninput="window.validateUserForm()">
                </div>
                <div class="form-field">
                    <label for="user_role">Role *</label>
                    <select id="user_role">
                        <option value="user">IT Staff (User)</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
            </div>

            <div class="form-field mb-3">
                <label for="user_password">
                    Password *
                </label>
                <div class="input-wrapper">
                    <input type="password" id="user_password"
                            placeholder="Minimum 8 chars"
                            autocomplete="new-password"
                            oninput="window.evalPwStrength(); 
                                     window.checkPwMatch();
                                     window.validateUserForm()">
                    <button type="button" class="pw-toggle-btn"
                            onclick="window.togglePwVis('user_password', this)">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                
                <div id="pw_hint" class="pw-text-sm text-yellow mt-1 hidden">
                    Leave blank to keep current password.
                </div>
                
                <div class="pw-strength-container mt-2">
                    <div class="pw-bar-bg">
                        <div id="pw_strength_fill" class="pw-bar-fill"></div>
                    </div>
                    <div id="pw_strength_text" class="pw-text-sm text-red"></div>
                </div>
            </div>

            <div class="form-field">
                <label for="user_confirm_password">Confirm Password *</label>
                <div class="input-wrapper">
                    <input type="password" id="user_confirm_password"
                            placeholder="Repeat password"
                            autocomplete="new-password"
                            oninput="window.checkPwMatch();
                                     window.validateUserForm()">
                    <button type="button" class="pw-toggle-btn"
                            onclick="window.togglePwVis(
                                'user_confirm_password', this
                            )">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                <div id="pw_match_msg" class="pw-text-sm mt-3"></div>
                
                <div id="pw_server_error" class="pw-text-sm text-red mt-2" style="display:none; font-weight:600;"></div>
            </div>
        </div>
        <div class="modal-footer" 
             style="display:flex; justify-content:space-between; align-items:center;">
             
            <div id="user_form_error" 
                 class="pw-text-sm text-red" 
                 style="flex:1; padding-right:8px; font-weight:600;">
            </div>
            
            <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary"
                        onclick="window.closeModal('add_user')">
                    Cancel
                </button>
                <button class="btn btn-primary"
                        id="user_save_btn"
                        onclick="window.saveUser()"
                        disabled
                        style="opacity:0.5; cursor:not-allowed;">
                    <i class="bi bi-floppy"></i> 
                    <span id="user_save_btn_text">Save User</span>
                </button>
            </div>
        </div>
    </div>
</div>