// assets/js/searchable_select.js
// Reusable searchable select component.

let activeSearchableSelect = null;
let searchableSelectListenersBound = false;

document.addEventListener('click', function (e) {
    if (activeSearchableSelect &&
        !e.target.closest(`#wrap_${activeSearchableSelect}`) &&
        !e.target.closest(`#dropdown_${activeSearchableSelect}`)
    ) {
        closeSearchableSelect(activeSearchableSelect);
    }
});

function bindSearchableSelectGlobalListeners() {
    if (searchableSelectListenersBound) return;
    searchableSelectListenersBound = true;

    window.addEventListener('resize', onSearchableSelectViewportChange);
    window.addEventListener('scroll', onSearchableSelectViewportChange, true);
}

function onSearchableSelectViewportChange() {
    if (activeSearchableSelect) {
        positionSearchableDropdown(activeSearchableSelect);
    }
}

function isSearchableSelectInModal(fieldId) {
    let wrap = document.getElementById(`wrap_${fieldId}`);
    return !!wrap?.closest('.modal-body, .modal');
}

function positionSearchableDropdown(fieldId) {
    let trigger  = document.getElementById(`trigger_${fieldId}`);
    let dropdown = document.getElementById(`dropdown_${fieldId}`);
    if (!trigger || !dropdown) return;

    if (!dropdown.classList.contains('searchable-select-dropdown--portal')) {
        dropdown.style.position = '';
        dropdown.style.top = '';
        dropdown.style.bottom = '';
        dropdown.style.left = '';
        dropdown.style.width = '';
        dropdown.style.zIndex = '';
        return;
    }

    let rect        = trigger.getBoundingClientRect();
    let spaceBelow  = window.innerHeight - rect.bottom - 12;
    let spaceAbove  = rect.top - 12;
    let panelHeight = 280;
    let openUp      = spaceBelow < 180 && spaceAbove > spaceBelow;

    dropdown.style.position = 'fixed';
    dropdown.style.left     = `${Math.max(8, rect.left)}px`;
    dropdown.style.width    = `${rect.width}px`;
    dropdown.style.zIndex   = '1200';

    if (openUp) {
        let h = Math.min(panelHeight, spaceAbove);
        dropdown.style.top    = 'auto';
        dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        dropdown.style.maxHeight = `${h}px`;
    } else {
        let h = Math.min(panelHeight, spaceBelow);
        dropdown.style.bottom = 'auto';
        dropdown.style.top    = `${rect.bottom + 4}px`;
        dropdown.style.maxHeight = `${h}px`;
    }

    let options = dropdown.querySelector('.searchable-select-options');
    if (options) {
        let searchH = dropdown.querySelector('.searchable-select-search')
            ? 40 : 0;
        options.style.maxHeight = `${Math.max(100, (openUp ? spaceAbove : spaceBelow) - searchH - 8)}px`;
    }
}

function resetSearchableDropdownStyles(fieldId) {
    let dropdown = document.getElementById(`dropdown_${fieldId}`);
    if (!dropdown) return;

    dropdown.classList.remove('searchable-select-dropdown--portal');
    dropdown.style.position = '';
    dropdown.style.top = '';
    dropdown.style.bottom = '';
    dropdown.style.left = '';
    dropdown.style.width = '';
    dropdown.style.zIndex = '';
    dropdown.style.maxHeight = '';

    let options = dropdown.querySelector('.searchable-select-options');
    if (options) options.style.maxHeight = '';

    let wrap = document.getElementById(`wrap_${fieldId}`);
    if (wrap && dropdown.parentElement !== wrap) {
        wrap.appendChild(dropdown);
    }
}

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
        bindSearchableSelectGlobalListeners();
        dropdown.style.display = '';

        if (isSearchableSelectInModal(fieldId)) {
            dropdown.classList.add('searchable-select-dropdown--portal');
            document.body.appendChild(dropdown);
            positionSearchableDropdown(fieldId);
        }

        trigger.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        activeSearchableSelect = fieldId;

        let modalBody = trigger.closest('.modal-body');
        if (modalBody) modalBody.classList.add('searchable-select-open');

        let search = dropdown.querySelector('.searchable-select-search');
        if (search) {
            search.value = '';
            filterSearchableSelect(fieldId, '');
            setTimeout(function () { search.focus(); }, 10);
        }

        highlightSearchableOption(fieldId, 0);
    }
}

window.closeActiveSearchableSelect = function () {
    if (activeSearchableSelect) {
        closeSearchableSelect(activeSearchableSelect);
    }
};

function closeSearchableSelect(fieldId) {
    let dropdown = document.getElementById(`dropdown_${fieldId}`);
    let trigger  = document.getElementById(`trigger_${fieldId}`);

    if (dropdown) dropdown.style.display = 'none';
    if (trigger) {
        trigger.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
    }

    resetSearchableDropdownStyles(fieldId);

    document.querySelectorAll('.modal-body.searchable-select-open')
        .forEach(function (el) { el.classList.remove('searchable-select-open'); });

    if (activeSearchableSelect === fieldId) {
        activeSearchableSelect = null;
    }
}

function getVisibleSearchableOptions(fieldId) {
    let container = document.getElementById(`options_${fieldId}`);
    if (!container) return [];
    return Array.from(
        container.querySelectorAll('.searchable-option:not(.hidden)')
    );
}

function highlightSearchableOption(fieldId, index) {
    let options = getVisibleSearchableOptions(fieldId);
    options.forEach(function (opt, i) {
        opt.classList.toggle('highlighted', i === index);
        if (i === index) {
            opt.scrollIntoView({ block: 'nearest' });
        }
    });
    return options;
}

function handleSearchableSelectKeydown(e, fieldId) {
    if (activeSearchableSelect !== fieldId) return;

    let options = getVisibleSearchableOptions(fieldId);
    if (!options.length) return;

    let current = options.findIndex(function (o) {
        return o.classList.contains('highlighted');
    });
    if (current < 0) current = 0;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightSearchableOption(fieldId, Math.min(current + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightSearchableOption(fieldId, Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
        e.preventDefault();
        let highlighted = options.find(function (o) {
            return o.classList.contains('highlighted');
        });
        if (highlighted) highlighted.click();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSearchableSelect(fieldId);
        document.getElementById(`trigger_${fieldId}`)?.focus();
    }
}

function filterSearchableSelect(fieldId, term) {
    let container = document.getElementById(`options_${fieldId}`);
    if (!container) return;

    let lower   = term.toLowerCase().trim();
    let options = container.querySelectorAll('.searchable-option');
    let visible = 0;

    options.forEach(function (opt) {
        let label = (opt.dataset.label || '').toLowerCase();
        let meta  = (opt.dataset.meta || '').toLowerCase();
        let matches = !lower || label.includes(lower) || meta.includes(lower);
        opt.classList.toggle('hidden', !matches);
        opt.classList.remove('highlighted');
        if (matches) visible++;
    });

    let emptyEl = container.querySelector('.searchable-option-empty');
    if (!visible) {
        if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'searchable-option-empty';
            emptyEl.textContent = 'No results found';
            container.appendChild(emptyEl);
        }
        emptyEl.style.display = '';
    } else if (emptyEl) {
        emptyEl.style.display = 'none';
        highlightSearchableOption(fieldId, 0);
    }
}

function buildSearchableOptionEl(fieldId, value, label, meta, placeholder) {
    let div = document.createElement('div');
    div.className     = 'searchable-option';
    div.dataset.value = value;
    div.dataset.label = label;
    if (meta) div.dataset.meta = meta;
    div.setAttribute('role', 'option');
    div.tabIndex = -1;

    if (meta) {
        div.innerHTML =
            `<span class="searchable-option-label">${escapeSelectHtml(label)}</span>` +
            `<span class="searchable-option-meta">${escapeSelectHtml(meta)}</span>`;
    } else {
        div.textContent = label;
    }

    div.addEventListener('click', function () {
        selectSearchableOption(fieldId, value, label);
    });

    return div;
}

function escapeSelectHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function selectSearchableOption(fieldId, value, label) {
    let hidden  = document.getElementById(fieldId);
    let trigger = document.getElementById(`trigger_${fieldId}`);
    let labelEl = document.getElementById(`label_${fieldId}`);
    let errEl   = document.getElementById(`err_${fieldId}`);

    if (hidden) {
        hidden.value = value;
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

function populateSearchableSelect(
    fieldId, items, valKey, lblKey, placeholder = '— Select —', options = {}
) {
    let container = document.getElementById(`options_${fieldId}`);
    let labelEl   = document.getElementById(`label_${fieldId}`);
    let hidden    = document.getElementById(fieldId);

    if (!container) return;

    let currentVal = hidden?.value ?? '';
    let formatMeta = options.formatMeta;

    container.innerHTML = '';
    container.appendChild(
        buildSearchableOptionEl(fieldId, '', placeholder, '', placeholder)
    );

    items.forEach(function (item) {
        let val   = String(item[valKey]);
        let label = String(item[lblKey]);
        let meta  = formatMeta ? formatMeta(item) : '';
        let div   = buildSearchableOptionEl(fieldId, val, label, meta, placeholder);
        if (val === currentVal) div.classList.add('selected');
        container.appendChild(div);
    });

    if (currentVal) {
        let match = items.find(function (i) {
            return String(i[valKey]) === currentVal;
        });
        if (match && labelEl) {
            labelEl.textContent = String(match[lblKey]);
            document.getElementById(`trigger_${fieldId}`)?.classList.add('has-value');
        }
    }

    initSearchableSelectTrigger(fieldId, placeholder);
}

function setSearchableSelectValue(fieldId, value) {
    let container = document.getElementById(`options_${fieldId}`);
    if (!container) return;

    let opt = container.querySelector(
        `[data-value="${CSS.escape(String(value))}"]`
    );
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

function initSearchableSelectTrigger(fieldId, placeholder) {
    let trigger = document.getElementById(`trigger_${fieldId}`);
    if (!trigger || trigger.dataset.ssInit) return;

    trigger.dataset.ssInit = '1';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `dropdown_${fieldId}`);
    trigger.tabIndex = 0;

    trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleSearchableSelect(fieldId);
        } else if (e.key === 'ArrowDown' && activeSearchableSelect !== fieldId) {
            e.preventDefault();
            toggleSearchableSelect(fieldId);
        }
    });

    let dropdown = document.getElementById(`dropdown_${fieldId}`);
    let search   = dropdown?.querySelector('.searchable-select-search');
    if (search) {
        search.addEventListener('keydown', function (e) {
            handleSearchableSelectKeydown(e, fieldId);
        });
    }
}

const SEARCHABLE_SELECT_FIELDS = [
    ['asset_po', '— Select PO —'],
    ['asset_category', '— Select Category —'],
    ['asset_location', '— Select Location —'],
    ['asset_owner', '— Select Owner —'],
];

window.initAllSearchableSelects = function () {
    SEARCHABLE_SELECT_FIELDS.forEach(function (pair) {
        initSearchableSelectTrigger(pair[0], pair[1]);
    });
};

document.addEventListener('DOMContentLoaded', function () {
    window.initAllSearchableSelects();
});
