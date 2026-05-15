<?php // src/views/shared/modals/modal_user.php ?>

<div class="modal-overlay" id="modal-add_user">
    <div class="modal modal-sm">
        <div class="modal-header">
            <div class="modal-title" id="user_modal_title">
                👤 Add New User
            </div>
            <button class="modal-close"
                    onclick="closeModal('add_user')">
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
                            autocomplete="off">
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
                            oninput="evalPwStrength(); checkPwMatch()">
                    <button type="button" class="pw-toggle-btn"
                            onclick="togglePwVis('user_password', this)">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                <div class="pw-strength-container">
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
                            oninput="checkPwMatch()">
                    <button type="button" class="pw-toggle-btn"
                            onclick="togglePwVis(
                                'user_confirm_password', this
                            )">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                <div id="pw_match_msg" class="pw-text-sm mt-3"></div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary"
                    onclick="closeModal('add_user')">
                Cancel
            </button>
            <button class="btn btn-primary"
                    id="user_save_btn"
                    onclick="saveUser()">
                <i class="bi bi-floppy"></i> 
                <span id="user_save_btn_text">Save User</span>
            </button>
        </div>
    </div>
</div>