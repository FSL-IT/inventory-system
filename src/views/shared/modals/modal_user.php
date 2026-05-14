<?php // src/views/shared/modals/modal_user.php ?>

<div class="modal-overlay" id="modal-add_user">
    <div class="modal" style="max-width:480px">
        <div class="modal-header">
            <div class="modal-title" id="user_modal_title">
                👤 Add New User
            </div>
            <button
                class="modal-close"
                onclick="closeModal('add_user')">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="user_edit_id">
            <div class="field-grid">
                <div class="form-field">
                    <label for="user_username">Username *</label>
                    <input
                        type="text"
                        id="user_username"
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
            <div class="form-field" style="margin-bottom:12px">
                <label for="user_password">
                    Password *
                    <span id="pw_hint" class="hidden"
                        style="font-weight:400;text-transform:none">
                        (leave blank to keep current)
                    </span>
                </label>
                <input
                    type="password"
                    id="user_password"
                    placeholder="12+ chars with number and symbol"
                    autocomplete="new-password">
            </div>
            <div class="form-field">
                <label for="user_confirm_password">Confirm Password *</label>
                <input
                    type="password"
                    id="user_confirm_password"
                    placeholder="Repeat password"
                    autocomplete="new-password">
            </div>
            <div class="insight-card insight-card--blue" style="margin-top:16px">
                <div class="insight-card__icon">🔒</div>
                <div>
                    <div class="insight-card__title" style="color:#60a5fa">
                        Password Security
                    </div>
                    <div class="insight-card__desc">
                        Use at least 12 characters with uppercase,
                        lowercase, number, and symbol.
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button
                class="btn btn-secondary"
                onclick="closeModal('add_user')">
                Cancel
            </button>
            <button
                class="btn btn-primary"
                onclick="saveUser()">
                <i class="bi bi-floppy"></i> Save User
            </button>
        </div>
    </div>
</div>
