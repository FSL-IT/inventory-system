// assets/js/searchable_select.js
// Reusable searchable select component.
// Include before page-specific JS files.

// ── State: track open dropdown ────────────────────────────────────
let activeSearchableSelect = null;

// Close open dropdown when clicking outside
document.addEventListener('click', e => {
    if (
        activeSearchableSelect &&
        !e.target.closest(
            `#wrap_${activeSearchableSelect}`
        )
    ) {
        closeSearchableSelect(activeSearchableSelect);
    }
});

// ── Toggle open/close ─────────────────────────────────────────────
function toggleSearchableSelect(fieldId) {
    const dropdown = document.getElementById(
        `dropdown_${fieldId}`
    );
    const trigger  = document.getElementById(
        `trigger_${fieldId}`
    );

    if (!dropdown || !trigger) {
        return;
    }

    const isOpen = dropdown.style.display !== 'none';

    if (activeSearchableSelect &&
            activeSearchableSelect !== fieldId) {
        closeSearchableSelect(activeSearchableSelect);
    }

    if (isOpen) {
        closeSearchableSelect(fieldId);
    } else {
        dropdown.style.display = '';
        trigger.classList.add('open');
        activeSearchableSelect = fieldId;

        // Focus search input
        const search = dropdown.querySelector(
            '.searchable-select-search'
        );
        if (search) {
            search.value = '';
            filterSearchableSelect(fieldId, '');
            setTimeout(() => search.focus(), 10);
        }
    }
}

function closeSearchableSelect(fieldId) {
    const dropdown = document.getElementById(
        `dropdown_${fieldId}`
    );
    const trigger  = document.getElementById(
        `trigger_${fieldId}`
    );

    if (dropdown) {
        dropdown.style.display = 'none';
    }
    if (trigger) {
        trigger.classList.remove('open');
    }
    if (activeSearchableSelect === fieldId) {
        activeSearchableSelect = null;
    }
}

// ── Filter options by search text ─────────────────────────────────
function filterSearchableSelect(fieldId, term) {
    const container = document.getElementById(
        `options_${fieldId}`
    );
    if (!container) {
        return;
    }

    const lower   = term.toLowerCase();
    const options = container.querySelectorAll('.searchable-option');
    let   visible = 0;

    options.forEach(opt => {
        const matches = opt.dataset.label
            .toLowerCase()
            .includes(lower);
        opt.classList.toggle('hidden', !matches);
        if (matches) {
            visible++;
        }
    });

    // Show/hide empty message
    let emptyEl = container.querySelector(
        '.searchable-option-empty'
    );
    if (!visible) {
        if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'searchable-option-empty';
            emptyEl.textContent = 'No results';
            container.appendChild(emptyEl);
        }
        emptyEl.style.display = '';
    } else if (emptyEl) {
        emptyEl.style.display = 'none';
    }
}

// ── Select an option ──────────────────────────────────────────────
function selectSearchableOption(fieldId, value, label) {
    const hidden  = document.getElementById(fieldId);
    const trigger = document.getElementById(
        `trigger_${fieldId}`
    );
    const labelEl = document.getElementById(
        `label_${fieldId}`
    );
    const errEl   = document.getElementById(
        `err_${fieldId}`
    );

    if (hidden) {
        hidden.value = value;
    }
    if (labelEl) {
        labelEl.textContent = label;
    }
    if (trigger) {
        trigger.classList.toggle('has-value', !!value);
        trigger.classList.remove('has-error');
    }
    if (errEl) {
        errEl.textContent = '';
    }

    // Mark selected in options list
    const container = document.getElementById(
        `options_${fieldId}`
    );
    if (container) {
        container.querySelectorAll('.searchable-option')
            .forEach(opt => {
                opt.classList.toggle(
                    'selected',
                    opt.dataset.value === String(value)
                );
            });
    }

    closeSearchableSelect(fieldId);
}

// ── Populate a searchable dropdown ────────────────────────────────
/**
 * @param {string}   fieldId   - base id (e.g. 'asset_category')
 * @param {Array}    items     - array of objects
 * @param {string}   valKey    - property used as option value
 * @param {string}   lblKey    - property used as option label
 * @param {string}   placeholder - empty label text
 */
function populateSearchableSelect(
    fieldId, items, valKey, lblKey,
    placeholder = '— Select —'
) {
    const container = document.getElementById(
        `options_${fieldId}`
    );
    const labelEl   = document.getElementById(
        `label_${fieldId}`
    );
    const hidden    = document.getElementById(fieldId);

    if (!container) {
        return;
    }

    // Preserve current value before rebuilding
    const currentVal = hidden?.value ?? '';

    // Empty placeholder option
    const placeholderDiv = document.createElement('div');
    placeholderDiv.className = 'searchable-option';
    placeholderDiv.dataset.value = '';
    placeholderDiv.dataset.label = placeholder;
    placeholderDiv.textContent   = placeholder;
    placeholderDiv.addEventListener('click', () =>
        selectSearchableOption(fieldId, '', placeholder)
    );

    container.innerHTML = '';
    container.appendChild(placeholderDiv);

    items.forEach(item => {
        const val   = String(item[valKey]);
        const label = String(item[lblKey]);
        const div   = document.createElement('div');
        div.className      = 'searchable-option';
        div.dataset.value  = val;
        div.dataset.label  = label;
        div.textContent    = label;
        div.addEventListener('click', () =>
            selectSearchableOption(fieldId, val, label)
        );
        if (val === currentVal) {
            div.classList.add('selected');
        }
        container.appendChild(div);
    });

    // Restore display if a value was already set
    if (currentVal) {
        const match = items.find(
            i => String(i[valKey]) === currentVal
        );
        if (match && labelEl) {
            labelEl.textContent = String(match[lblKey]);
            document
                .getElementById(`trigger_${fieldId}`)
                ?.classList.add('has-value');
        }
    }
}

// ── Set value programmatically (e.g. from autofill) ───────────────
function setSearchableSelectValue(fieldId, value) {
    const container = document.getElementById(
        `options_${fieldId}`
    );
    if (!container) {
        return;
    }

    const opt = container.querySelector(
        `[data-value="${CSS.escape(String(value))}"]`
    );
    if (opt) {
        selectSearchableOption(
            fieldId, value, opt.dataset.label
        );
    }
}

// ── Reset to empty ────────────────────────────────────────────────
function resetSearchableSelect(
    fieldId,
    placeholder = '— Select —'
) {
    selectSearchableOption(fieldId, '', placeholder);
}

// ── Show validation error on trigger ─────────────────────────────
function showSelectError(fieldId, msg) {
    const trigger = document.getElementById(
        `trigger_${fieldId}`
    );
    const errEl   = document.getElementById(
        `err_${fieldId}`
    );

    if (trigger) {
        trigger.classList.add('has-error');
    }
    if (errEl) {
        errEl.textContent = msg;
    }
}