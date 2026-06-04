// assets/js/searchable_select.js
// Reusable searchable select component.

let activeSearchableSelect = null;

document.addEventListener('click', function (e) {
    if (activeSearchableSelect &&
        !e.target.closest(`#wrap_${activeSearchableSelect}`)
    ) {
        closeSearchableSelect(activeSearchableSelect);
    }
});

function toggleSearchableSelect(fieldId) {
    let dropdown = document.getElementById(`dropdown_${fieldId}`);
    let trigger  = document.getElementById(`trigger_${fieldId}`);

    if (!dropdown || !trigger) return;

    let isOpen = dropdown.style.display !== 'none';

    if (activeSearchableSelect && activeSearchableSelect !== fieldId) {
        closeSearchableSelect(activeSearchableSelect);
    }

    if (isOpen) {
        closeSearchableSelect(fieldId);
    } else {
        dropdown.style.display = '';
        trigger.classList.add('open');
        activeSearchableSelect = fieldId;

        let search = dropdown.querySelector('.searchable-select-search');
        if (search) {
            search.value = '';
            filterSearchableSelect(fieldId, '');
            setTimeout(function () { search.focus(); }, 10);
        }
    }
}

function closeSearchableSelect(fieldId) {
    let dropdown = document.getElementById(`dropdown_${fieldId}`);
    let trigger  = document.getElementById(`trigger_${fieldId}`);

    if (dropdown) dropdown.style.display = 'none';
    if (trigger)  trigger.classList.remove('open');
    if (activeSearchableSelect === fieldId) {
        activeSearchableSelect = null;
    }
}

function filterSearchableSelect(fieldId, term) {
    let container = document.getElementById(`options_${fieldId}`);
    if (!container) return;

    let lower   = term.toLowerCase();
    let options = container.querySelectorAll('.searchable-option');
    let visible = 0;

    options.forEach(function (opt) {
        let matches = opt.dataset.label.toLowerCase().includes(lower);
        opt.classList.toggle('hidden', !matches);
        if (matches) visible++;
    });

    let emptyEl = container.querySelector('.searchable-option-empty');
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

function selectSearchableOption(fieldId, value, label) {
    let hidden  = document.getElementById(fieldId);
    let trigger = document.getElementById(`trigger_${fieldId}`);
    let labelEl = document.getElementById(`label_${fieldId}`);
    let errEl   = document.getElementById(`err_${fieldId}`);

    if (hidden) {
        hidden.value = value;
        // FIX: Dispatch change event to trigger PO Hints
        hidden.dispatchEvent(new Event('change'));
    }
    if (labelEl) labelEl.textContent = label;
    if (trigger) {
        trigger.classList.toggle('has-value', !!value);
        trigger.classList.remove('has-error');
    }
    if (errEl) errEl.textContent = '';

    let container = document.getElementById(`options_${fieldId}`);
    if (container) {
        container.querySelectorAll('.searchable-option').forEach(function (opt) {
            opt.classList.toggle('selected', opt.dataset.value === String(value));
        });
    }

    closeSearchableSelect(fieldId);
}

function populateSearchableSelect(fieldId, items, valKey, lblKey, placeholder = '— Select —') {
    let container = document.getElementById(`options_${fieldId}`);
    let labelEl   = document.getElementById(`label_${fieldId}`);
    let hidden    = document.getElementById(fieldId);

    if (!container) return;

    let currentVal = hidden?.value ?? '';

    let placeholderDiv = document.createElement('div');
    placeholderDiv.className = 'searchable-option';
    placeholderDiv.dataset.value = '';
    placeholderDiv.dataset.label = placeholder;
    placeholderDiv.textContent   = placeholder;
    placeholderDiv.addEventListener('click', function () {
        selectSearchableOption(fieldId, '', placeholder);
    });

    container.innerHTML = '';
    container.appendChild(placeholderDiv);

    items.forEach(function (item) {
        let val   = String(item[valKey]);
        let label = String(item[lblKey]);
        let div   = document.createElement('div');
        div.className      = 'searchable-option';
        div.dataset.value  = val;
        div.dataset.label  = label;
        div.textContent    = label;
        div.addEventListener('click', function () {
            selectSearchableOption(fieldId, val, label);
        });
        if (val === currentVal) div.classList.add('selected');
        container.appendChild(div);
    });

    if (currentVal) {
        let match = items.find(function (i) { return String(i[valKey]) === currentVal; });
        if (match && labelEl) {
            labelEl.textContent = String(match[lblKey]);
            document.getElementById(`trigger_${fieldId}`)?.classList.add('has-value');
        }
    }
}

function setSearchableSelectValue(fieldId, value) {
    let container = document.getElementById(`options_${fieldId}`);
    if (!container) return;

    let opt = container.querySelector(`[data-value="${CSS.escape(String(value))}"]`);
    if (opt) {
        selectSearchableOption(fieldId, value, opt.dataset.label);
    }
}

function resetSearchableSelect(fieldId, placeholder = '— Select —') {
    selectSearchableOption(fieldId, '', placeholder);
}

function showSelectError(fieldId, msg) {
    let trigger = document.getElementById(`trigger_${fieldId}`);
    let errEl   = document.getElementById(`err_${fieldId}`);

    if (trigger) trigger.classList.add('has-error');
    if (errEl)   errEl.textContent = msg;
}