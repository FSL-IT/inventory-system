// assets/js/assets.js

(function () {
    let allAssets      = [];
    let filteredAssets = [];
    let currentPage    = 1;
    let itemsPerPage   = 25;
    let currentSort    = 'a.created_at';
    let currentDir     = 'desc';
    let assetViewId      = null;
    let assetMode        = 'single';
    let filterMissingSn    = false;
    let filterAttention    = false;
    let filterOperational  = false;

    window.initAssets = function () {
        currentSort = 'a.created_at';
        currentDir  = 'desc';
        currentPage = 1;

        let urlParams = new URLSearchParams(window.location.search);
        let urlSearch = urlParams.get('search');
        let action    = urlParams.get('action');
        let poId      = urlParams.get('po_id');
        let poNumber  = urlParams.get('po_number');

        filterMissingSn   = urlParams.get('missing_sn') === '1';
        filterAttention   = urlParams.get('attention') === '1';
        filterOperational = urlParams.get('operational') === '1';

        if (urlSearch) {
            safeSetVal('asset_search', urlSearch);
            safeSetVal('topbar_search', urlSearch);
        }

        bindAssetPoChangeListener();

        populateAssetFormDropdowns().then(function () {
            applyAssetUrlFilterFields(urlParams);
        
            loadServerAssets();

            if (action === 'add_asset') {
                window.openAddAsset();
                if (poId) {
                    setTimeout(function () {
                        if (typeof setSearchableSelectValue === 'function') {
                            setSearchableSelectValue('asset_po', poId);
                        }
                        window.onPoChange(poId);

                        let hint = document.getElementById('po_autofill_hint');
                        let msg  = document.getElementById('po_autofill_msg');
                        if (hint && msg) {
                            msg.textContent =
                                `Adding assets to PO: ${poNumber}. ` +
                                `Location and owner pre-filled.`;
                            hint.classList.remove('hidden');
                        }
                    }, 500);
                }
            }
        });
        
        if (typeof setupImportDropZone === 'function') {
            setupImportDropZone();
        }

        if (typeof registerGlobalSearch === 'function') {
            registerGlobalSearch(function (term) {
                safeSetVal('asset_search', term);
                safeSetVal('topbar_search', term);
                if (typeof window.debouncedLoadAssets === 'function') {
                    window.debouncedLoadAssets();
                }
            });
        }
    };

    function applyAssetUrlFilterFields(urlParams) {
        let status = urlParams.get('status');
        if (status) {
            safeSetVal('filter_status', status);
        }
        let categoryId = urlParams.get('category_id');
        if (categoryId) {
            safeSetVal('filter_category', categoryId);
        }
        let locationId = urlParams.get('location_id');
        if (locationId) {
            safeSetVal('filter_location', locationId);
        }
        let ownerId = urlParams.get('owner_id');
        if (ownerId) {
            safeSetVal('filter_owner', ownerId);
        }
    }

    function bindAssetPoChangeListener() {
        let poInput = document.getElementById('asset_po');
        if (!poInput || poInput.dataset.changeBound === '1') {
            return;
        }
        poInput.dataset.changeBound = '1';
        poInput.addEventListener('change', function () {
            window.onPoChange(this.value);
        });
    }

    window.onAssetViewClick = function (e, id) {
        e.stopPropagation();
        viewAsset(id);
    };

    window.onAssetEditClick = function (e, id) {
        e.stopPropagation();
        openEditAsset(id);
    };

    window.onAssetDeleteClick = function (e, id, serial) {
        e.stopPropagation();
        deleteAsset(id, serial);
    };

    async function loadServerAssets() {
        let tbody = document.getElementById('assets_body');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="9" 
            style="text-align:center;padding:30px">
            <i class="bi bi-arrow-repeat spin"></i> Loading database...
        </td></tr>`;

        let params = new URLSearchParams({
            page:        currentPage,
            per_page:    itemsPerPage,
            search:      getVal('asset_search'),
            status:      getVal('filter_status'),
            category_id: getVal('filter_category'),
            location_id: getVal('filter_location'),
            owner_id:    getVal('filter_owner'),
            sort:        currentSort,
            dir:         currentDir
        });

        try {
            let url = `/src/api/assets.php?${params.toString()}`;
            let res = await apiFetch(url);
            
            let dataArr = res.data || [];
            allAssets = dataArr;
            renderAssetTable(dataArr);
            
            if (res.meta && res.meta.pagination) {
                let pg = res.meta.pagination;
                let standardizedPg = {
                    page:        pg.current_page || pg.page,
                    per_page:    pg.per_page,
                    total:       pg.total,
                    total_pages: pg.total_pages
                };
                
                renderPagination(
                    'assets_pagination', 
                    standardizedPg, 
                    'changeClientPage'
                );
                renderCounter(standardizedPg);
            }
        } catch (err) {
            showToast('Failed to load assets from server.', 'error');
        }
    }

    window.debouncedLoadAssets = debounce(function () {
        currentPage = 1;
        loadServerAssets();
    }, 350);

    window.changeClientPage = function (page) {
        currentPage = page;
        loadServerAssets();
    };

    window.onPerPageChange = function () {
        itemsPerPage = parseInt(getVal('asset_per_page')) || 25;
        currentPage  = 1;
        loadServerAssets();
    };

    window.clearAssetFilters = function () {
        // Clear text search inputs
        safeSetVal('asset_search', '');
        let topbarSearch = document.getElementById('topbar_search');
        if (topbarSearch) topbarSearch.value = '';

        // Clear all select dropdowns
        safeSetVal('filter_status', '');
        safeSetVal('filter_category', '');
        safeSetVal('filter_location', '');
        safeSetVal('filter_owner', '');

        let url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());

        if (typeof window.debouncedLoadAssets === 'function') {
            window.debouncedLoadAssets();
        }
    };

    window.sortAssets = function (col) {
        if (currentSort === col) {
            currentDir = currentDir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort = col;
            currentDir  = 'asc';
        }
        currentPage = 1;
        updateSortIcons();
        loadServerAssets();
    };

    function updateSortIcons() {
        document.querySelectorAll('.sort-icon').forEach(el => {
            el.className = 'bi bi-arrow-down-up sort-icon';
        });

        let active = document.getElementById(`sort_${currentSort}`);
        if (active) {
            let dirClass = currentDir === 'asc'
                ? 'bi-sort-up'
                : 'bi-sort-down';
            active.className = `bi ${dirClass} sort-icon sort-active`;
        }
    }

    function renderCounter(pg) {
        let el = document.getElementById('asset_counter');
        if (!el || !pg) return;

        if (!pg.total) {
            el.textContent = 'No results';
            return;
        }

        let start = (pg.page - 1) * pg.per_page + 1;
        let end   = Math.min(pg.page * pg.per_page, pg.total);
        el.textContent = `${start}–${end} of ${pg.total}`;
    }

    function renderAssetTable(assets) {
        let tbody   = document.getElementById('assets_body');
        let isAdmin = window.IS_ADMIN === true;
     
        if (!tbody) return;
        if (!assets.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-state__icon">📦</div>
                            <div class="empty-state__title">
                                No assets found
                            </div>
                            <div class="empty-state__desc">
                                Try adjusting your search or filters.
                            </div>
                        </div>
                    </td>
                </tr>`;
            return;
        }
     
        tbody.innerHTML = assets.map(a => {
            let safeHtmlSn = escapeHtml(a.serial_number);
            let safeJsSn   = escapeJsStr(a.serial_number);
     
            let deleteBtn = isAdmin
                ? `<button class="btn btn-danger btn-sm"
                           onclick="onAssetDeleteClick(event, ${a.id}, '${safeJsSn}')"
                           title="Delete Asset">
                       <i class="bi bi-trash"></i>
                   </button>`
                : '';
     
            return `
                <tr class="clickable-row"
                        onclick="onAssetViewClick(event, ${a.id})">
                    <td>
                        <span class="serial-chip">${safeHtmlSn}</span>
                    </td>
                    <td>${escapeHtml(a.description)}</td>
                    <td>
                        <span class="tag tag-category">
                            ${escapeHtml(a.category_name ?? '—')}
                        </span>
                    </td>
                    <td class="cell-mono cell-truncate">
                        ${escapeHtml(a.po_number ?? '—')}
                    </td>
                    <td class="cell-sm">
                        ${escapeHtml(a.location_name ?? '—')}
                    </td>
                    <td class="cell-sm">
                        ${escapeHtml(a.owner_name ?? '—')}
                    </td>
                    <td>${statusTag(a.status)}</td>
                    <td class="cell-date">
                        ${formatDate(a.date_received)}
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-secondary btn-sm"
                                    onclick="onAssetEditClick(event, ${a.id})"
                                    title="Edit Asset">
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${deleteBtn}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    }

    window.openAddAsset = function () {
        let titleEl = document.getElementById('asset_modal_title');
        if (titleEl) {
            titleEl.textContent = '📦 Add New Asset';
        }

        let fields = [
            'asset_edit_id', 'asset_serial', 'asset_desc',
            'asset_po', 'asset_location', 'asset_owner',
            'asset_remarks', 'asset_vendor', 'asset_serials_bulk',
            'asset_status'
        ];
        
        fields.forEach(id => safeSetVal(id, ''));

        if (typeof resetSearchableSelect === 'function') {
            resetSearchableSelect('asset_po', '— Select PO —');
            resetSearchableSelect('asset_category', '— Select Category —');
            resetSearchableSelect('asset_location', '— Select Location —');
            resetSearchableSelect('asset_owner', '— Select Owner —');
        }

        clearAllFieldErrors();

        let serialEl = document.getElementById('asset_serial');
        if (serialEl) {
            serialEl.removeAttribute('readonly');
        }
        let transferWrap = document.getElementById('wrap_transfer_note');
        if (transferWrap) transferWrap.classList.add('hidden');

        hidePoAutofillHint();
        setAssetMode('single');
        showModeToggle(true);
        window.openModal('add_asset');
    };

    async function viewAsset(id) {
        assetViewId = id;
        let asset = allAssets.find(x => x.id === id);

        if (asset) {
            renderViewModal(asset);
            window.openModal('view_asset');
            loadTransferHistory(id);
        } else {
            showToast('Could not find asset.', 'error');
        }
    }

    function renderViewModal(a) {
        safeSetText('view_asset_title', `📦 ${a.description}`);

        let bodyEl = document.getElementById('view_asset_body');
        if (!bodyEl) return;

        let dateEndorsed = a.date_endorsed
            ? formatDate(a.date_endorsed)
            : '⏳ Pending';

        bodyEl.innerHTML = `
            <div class="modal-section-title">Purchase Order Info</div>
            <div class="field-grid">
                <div class="form-field">
                    <label>PO Number</label>
                    <div class="info-field">
                        <div class="val val-mono">
                            ${escapeHtml(a.po_number ?? '—')}
                        </div>
                    </div>
                </div>
                <div class="form-field">
                    <label>Vendor</label>
                    <div class="info-field">
                        <div class="val">
                            ${escapeHtml(a.vendor_name ?? '—')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="field-grid">
                <div class="form-field">
                    <label>Date Received</label>
                    <div class="info-field">
                        <div class="val">${formatDate(a.date_received)}</div>
                    </div>
                </div>
                <div class="form-field">
                    <label>Date Endorsed by Admin</label>
                    <div class="info-field">
                        <div class="val">${dateEndorsed}</div>
                    </div>
                </div>
            </div>
            <div class="modal-section-title">Assignment</div>
            <div class="field-grid">
                <div class="form-field">
                    <label>Location</label>
                    <div class="info-field">
                        <div class="val">
                            ${escapeHtml(a.location_name ?? '—')}
                        </div>
                    </div>
                </div>
                <div class="form-field">
                    <label>Process Owner</label>
                    <div class="info-field">
                        <div class="val">
                            ${escapeHtml(a.owner_name ?? '—')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="field-grid">
                <div class="form-field">
                    <label>Category</label>
                    <div class="info-field">
                        <div class="val">
                            ${escapeHtml(a.category_name ?? '—')}
                        </div>
                    </div>
                </div>
                <div class="form-field">
                    <label>Status</label>
                    <div class="info-field">${statusTag(a.status)}</div>
                </div>
            </div>
            <div class="modal-section-title">Serial Number</div>
            <div style="margin:8px 0">
                <span class="serial-chip">
                    ${escapeHtml(a.serial_number)}
                </span>
            </div>
            <div class="modal-section-title">Remarks</div>
            <div class="info-field">
                <div class="val">
                    ${escapeHtml(a.remarks || 'No remarks')}
                </div>
            </div>`;
    }

    window.editAssetFromView = function () {
        window.closeModal('view_asset');
        openEditAsset(assetViewId);
    };

    async function loadTransferHistory(assetId) {
        let section = document.getElementById('view_transfer_section');
        let body    = document.getElementById('view_transfer_body');
        if (!section || !body) return;

        try {
            let url = `/src/api/assets.php?id=${assetId}&action=transfers`;
            let res = await apiFetch(url);
            let rows = res.data || [];

            if (!rows.length) {
                section.classList.add('hidden');
                return;
            }

            section.classList.remove('hidden');
            body.innerHTML = rows.map(r => {
                let locChange = (r.from_location || r.to_location)
                    ? `<span style="font-size:11px;color:var(--white-3)">
                           📍 ${escapeHtml(r.from_location ?? '—')}
                           → ${escapeHtml(r.to_location ?? '—')}
                       </span>` : '';

                let ownChange = (r.from_owner || r.to_owner)
                    ? `<span style="font-size:11px;color:var(--white-3)">
                           👤 ${escapeHtml(r.from_owner ?? '—')}
                           → ${escapeHtml(r.to_owner ?? '—')}
                       </span>` : '';

                let note = r.notes
                    ? `<span class="cell-date"
                               style="font-size:11px;font-style:italic">
                           "${escapeHtml(r.notes)}"
                       </span>` : '';

                return `
                    <div class="activity-item">
                        <div class="activity-avatar">
                            ${(r.transferred_by ?? '?')[0].toUpperCase()}
                        </div>
                        <div style="display:flex;
                                    flex-direction:column;gap:2px;flex:1">
                            <div style="display:flex;
                                        gap:8px;flex-wrap:wrap">
                                ${locChange}
                                ${ownChange}
                            </div>
                            ${note}
                            <div class="activity-time">
                                ${escapeHtml(r.transferred_by ?? '—')}
                                · ${formatDate(r.transferred_at)}
                            </div>
                        </div>
                    </div>`;
            }).join('');
        } catch (err) {
            section.classList.add('hidden');
        }
    }

    function openEditAsset(id) {
        let a = allAssets.find(x => x.id === id);
        if (!a) {
            showToast('Could not load asset for editing.', 'error');
            return;
        }
     
        let titleEl = document.getElementById('asset_modal_title');
        if (titleEl) {
            titleEl.textContent = '✏️ Edit Asset';
        }
     
        safeSetVal('asset_edit_id', id);
        safeSetVal('asset_serial',  a.serial_number);
        safeSetVal('asset_desc',    a.description);
        safeSetVal('asset_status',  a.status);
        safeSetVal('asset_vendor',  a.vendor_name ?? '');
        safeSetVal('asset_remarks', a.remarks     ?? '');
        safeSetVal('asset_transfer_note', '');
     
        if (typeof setSearchableSelectValue === 'function') {
            setSearchableSelectValue('asset_po',       
                a.po_id != null ? String(a.po_id) : '');
            setSearchableSelectValue('asset_category', 
                a.category_id != null ? String(a.category_id) : '');
            setSearchableSelectValue('asset_location', 
                a.location_id != null ? String(a.location_id) : '');
            setSearchableSelectValue('asset_owner',    
                a.owner_id != null ? String(a.owner_id) : '');
        }
     
        clearAllFieldErrors();
     
        let serialEl = document.getElementById('asset_serial');
        if (serialEl) {
            serialEl.removeAttribute('readonly');
            serialEl.title = 'You can correct a mis-typed serial number here.';
        }
        
        let transferWrap = document.getElementById('wrap_transfer_note');
        if (transferWrap) transferWrap.classList.remove('hidden');
     
        hidePoAutofillHint();
        showModeToggle(false);
        setAssetMode('single');
        window.openModal('add_asset');
    }

    function clearFieldError(fieldId) {
        safeSetText(`err_${fieldId}`, '');
        let el = document.getElementById(fieldId);
        if (el) el.classList.remove('has-error');
    }
    
    window.clearFieldError = clearFieldError;

    function clearAllFieldErrors() {
        document.querySelectorAll('.field-error')
            .forEach(el => { el.textContent = ''; });
        document.querySelectorAll('.has-error')
            .forEach(el => el.classList.remove('has-error'));
        document.querySelectorAll('.searchable-select-trigger')
            .forEach(el => el.classList.remove('has-error'));
    }

    function showFieldError(fieldId, msg) {
        safeSetText(`err_${fieldId}`, msg);
        let el = document.getElementById(fieldId);
        if (el) el.classList.add('has-error');
    }

    function validateAssetForm(isBulk = false) {
        clearAllFieldErrors();
        let isValid = true;

        let requiredFields = [
            { id: 'asset_desc',     msg: 'Description is required.' },
            { id: 'asset_status',   msg: 'Select a status.' },
            { id: 'asset_category', msg: 'Select a category.', isSelect: true },
            { id: 'asset_location', msg: 'Select a location.', isSelect: true },
            { id: 'asset_owner',    msg: 'Select an owner.',   isSelect: true }
        ];

        if (!isBulk) {
            requiredFields.push({
                id: 'asset_serial', 
                msg: 'Serial Number is required.' 
            });
        } else {
            let raw = getVal('asset_serials_bulk');
            if (!parseSerialInput(raw).length) {
                showFieldError('asset_serials_bulk', 'Required.');
                isValid = false;
            }
        }

        requiredFields.forEach(field => {
            let val = getVal(field.id);
            if (!val) {
                if (field.isSelect && typeof showSelectError === 'function') {
                    showSelectError(field.id, field.msg);
                } else {
                    showFieldError(field.id, field.msg);
                }
                isValid = false;
            }
        });

        return isValid;
    }

    window.saveAsset = async function () {
        let id = getVal('asset_edit_id');

        if (assetMode === 'bulk' && !id) {
            await saveBulkAssets();
            return;
        }

        if (!validateAssetForm(false)) return;

        let btn = document.getElementById('asset_save_btn');
        if (btn) btn.disabled = true;

        let payload = {
            serial_number: getVal('asset_serial'),
            description:   getVal('asset_desc'),
            category_id:   getVal('asset_category'),
            status:        getVal('asset_status'),
            po_id:         getVal('asset_po') || null,
            location_id:   getVal('asset_location'),
            owner_id:      getVal('asset_owner'),
            remarks:       getVal('asset_remarks') || '',
            transfer_note: getVal('asset_transfer_note') || '',
        };

        let isEdit = !!id;
        let url    = isEdit ? 
            `/src/api/assets.php?id=${id}` : '/src/api/assets.php';
        let method = isEdit ? 'PUT' : 'POST';

        try {
            await apiFetch(url, { 
                method, 
                body: JSON.stringify(payload) 
            });
            
            window.closeModal('add_asset');
            showToast(`Asset ${isEdit ? 'updated' : 'created'} ` +
                `successfully.`, 'success');
                
            loadServerAssets();
            
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    async function saveBulkAssets() {
        if (!validateAssetForm(true)) return;

        let btn = document.getElementById('asset_save_btn');
        let lbl = document.getElementById('asset_save_label');
        let originalText = lbl ? lbl.textContent : 'Save All';

        if (btn) {
            btn.disabled = true;
            if (lbl) lbl.innerHTML = '<i class="bi bi-hourglass"></i>...';
        }

        let payload = {
            serials:      parseSerialInput(getVal('asset_serials_bulk')),
            description:  getVal('asset_desc'),
            category_id:  getVal('asset_category'),
            status:       getVal('asset_status'),
            po_id:        getVal('asset_po') || null,
            location_id:  getVal('asset_location'),
            owner_id:     getVal('asset_owner'),
            remarks:      getVal('asset_remarks') || '',
        };

        try {
            let res = await apiFetch(
                '/src/api/assets.php?action=bulk',
                { method: 'POST', body: JSON.stringify(payload) }
            );

            window.closeModal('add_asset');
            let { inserted, skipped } = res.data;
            let msg = `${inserted} asset(s) created.`;
            
            if (skipped.length) {
                msg += ` ${skipped.length} skipped (duplicates).`;
            }

            showToast(msg, inserted ? 'success' : 'error');
            loadServerAssets();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            if (btn) btn.disabled = false;
            if (lbl) lbl.textContent = originalText;
        }
    }

    function deleteAsset(id, serial) {
        let msg = `Delete asset SN: ${serial}? This cannot be undone.`;
        window.showConfirm('Delete Asset', msg, async function () {
            try {
                await apiFetch(`/src/api/assets.php?id=${id}`, {
                    method: 'DELETE',
                });
                showToast('Asset deleted.', 'success');
                loadServerAssets();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    window.setAssetMode = function (mode) {
        assetMode = mode;
        let isBulk = mode === 'bulk';

        let singleField = document.getElementById('field_single_serial');
        let bulkField   = document.getElementById('field_bulk_serials');
        let hintEl      = document.getElementById('asset_mode_hint');
        let saveLabel   = document.getElementById('asset_save_label');
        let btnSingle   = document.getElementById('btn_mode_single');
        let btnBulk     = document.getElementById('btn_mode_bulk');

        if (singleField) {
            singleField.classList.toggle('hidden', isBulk);
        }
        if (bulkField) {
            bulkField.classList.toggle('hidden', !isBulk);
        }

        if (hintEl) {
            hintEl.textContent = isBulk
                ? 'Paste multiple serials — one per line'
                : 'Single serial entry';
        }

        if (saveLabel) {
            saveLabel.textContent = isBulk ? 'Save All' : 'Save Asset';
        }

        if (btnSingle) {
            btnSingle.classList.toggle('is-active', !isBulk);
        }

        if (btnBulk) {
            btnBulk.classList.toggle('is-active', isBulk);
        }

        window.updateBulkCount();
    };

    function showModeToggle(isVisible) {
        let el = document.getElementById('asset_mode_toggle');
        if (el) el.classList.toggle('hidden', !isVisible);
    }

    window.updateBulkCount = function () {
        let countEl = document.getElementById('bulk_sn_count');
        if (!countEl) return;
        
        let n = parseSerialInput(getVal('asset_serials_bulk')).length;
        countEl.textContent =
            `${n} serial number${n !== 1 ? 's' : ''} detected`;
    };

    function parseSerialInput(raw) {
        return raw
            .split(/[\n,]+/)
            .map(s => s.trim())
            .filter(Boolean);
    }

    window.onPoChange = async function (poId) {
        hidePoAutofillHint();

        if (!poId) {
            safeSetVal('asset_vendor', '');
            return;
        }

        try {
            let res = await apiFetch(`/src/api/po_hints.php?po_id=${poId}`);
            applyPoHints(res.data);
        } catch (err) {
            console.error('onPoChange hint error:', err);
        }
    };

    function applyPoHints(hints) {
        if (!hints) return;
        let filled = [];

        if (hints.vendor_name) {
            safeSetVal('asset_vendor', hints.vendor_name);
        }
        if (hints.location_id && typeof setSearchableSelectValue === 'function') {
            setSearchableSelectValue('asset_location', hints.location_id);
            filled.push('Location');
        }
        if (hints.owner_id && typeof setSearchableSelectValue === 'function') {
            setSearchableSelectValue('asset_owner', hints.owner_id);
            filled.push('Process Owner');
        }
        if (hints.category_id && typeof setSearchableSelectValue === 'function') {
            setSearchableSelectValue('asset_category', hints.category_id);
            filled.push('Category');
        }
        if (hints.description) {
            safeSetVal('asset_desc', hints.description);
            filled.push('Description');
        }

        if (filled.length) showPoAutofillHint(filled);
    }

    function showPoAutofillHint(fields) {
        let wrap = document.getElementById('po_autofill_hint');
        let msg  = document.getElementById('po_autofill_msg');
        
        if (!wrap || !msg) return;
        
        msg.textContent =
            `Auto-filled from PO history: ${fields.join(', ')}. `
            + 'You can override any field.';
        wrap.classList.remove('hidden');
    }

    function hidePoAutofillHint() {
        let wrap = document.getElementById('po_autofill_hint');
        if (wrap) wrap.classList.add('hidden');
    }

    async function populateAssetFormDropdowns() {
        if (typeof populateSearchableSelect === 'function') {
            await Promise.all([
                populateSearchableSelectFromApi(
                    'asset_po',
                    '/src/api/purchase_orders.php',
                    'id', 'po_number', '— Select PO —',
                    { formatMeta: formatPoSelectMeta }
                ),
                populateSearchableSelectFromApi(
                    'asset_category',
                    '/src/api/categories.php',
                    'id', 'name', '— Select Category —'
                ),
                populateSearchableSelectFromApi(
                    'asset_location',
                    '/src/api/locations.php',
                    'id', 'name', '— Select Location —'
                ),
                populateSearchableSelectFromApi(
                    'asset_owner',
                    '/src/api/process_owners.php',
                    'id', 'name', '— Select Owner —'
                ),
            ]);
        }

        // Standard filter dropdowns
        await Promise.all([
            populateSelect(
                'filter_category',
                '/src/api/categories.php',
                'id', 'name'
            ),
            populateSelect(
                'filter_location',
                '/src/api/locations.php',
                'id', 'name'
            ),
            populateSelect(
                'filter_owner',
                '/src/api/process_owners.php',
                'id', 'name'
            ),
        ]);
    }

    function formatPoSelectMeta(item) {
        let parts = [];
        if (item.vendor_name) parts.push(item.vendor_name);
        if (item.date_received) {
            parts.push(formatDate(item.date_received));
        }
        if (item.asset_count > 0) {
            parts.push(`${item.asset_count} asset(s)`);
        }
        return parts.join(' · ');
    }

    async function populateSearchableSelectFromApi(
        fieldId, url, valKey, lblKey, placeholder, extraOptions = {}
    ) {
        try {
            let data  = await apiFetch(`${url}?per_page=5000`);
            let items = data.data ?? [];
            if (typeof populateSearchableSelect === 'function') {
                populateSearchableSelect(
                    fieldId, items, valKey, lblKey, placeholder, extraOptions
                );
            }
        } catch (err) {}
    }

    async function populateSelect(
        selId, url, valKey, lblKey
    ) {
        let el = document.getElementById(selId);
        if (!el) return;

        try {
            let data  = await apiFetch(`${url}?per_page=5000`);
            let items = data.data ?? [];

            items.forEach(item => {
                let opt = document.createElement('option');
                opt.value = item[valKey];
                opt.textContent = item[lblKey];
                el.appendChild(opt);
            });
        } catch (err) {}
    }

    window.exportToExcel = async function () {
        let params = new URLSearchParams({
            action:      'export',
            status:      getVal('filter_status'),
            category_id: getVal('filter_category'),
            location_id: getVal('filter_location'),
            owner_id:    getVal('filter_owner'),
            search:      getVal('asset_search'),
        });

        window.location.href = `/src/api/import_export.php?${params}`;
    };
})();

    window.openImportModal = function () {
        let zoneLabel = document.getElementById('import_zone_label');
        if (zoneLabel) {
            zoneLabel.textContent = 'Drop your .xlsx file here';
        }
        
        let fileInput = document.getElementById('import_file');
        if (fileInput) fileInput.value = '';
        
        let submitBtn = document.getElementById('import_submit_btn');
        if (submitBtn) { 
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-upload"></i> Import'; 
            submitBtn.onclick = window.submitAssetImport; 
        }

        let titleEl = document.getElementById('import_modal_title');
        if (titleEl) titleEl.textContent = '📥 Import Assets';

        let poInfo = document.getElementById('fmt_info_po');
        let flatInfo = document.getElementById('fmt_info_flat');
        if (poInfo) poInfo.style.display = 'none';
        if (flatInfo) flatInfo.style.display = 'flex';

        let dlBtn = document.getElementById('btn_download_template');
        if (dlBtn) {
            dlBtn.href = '/src/api/import_export.php?action=template';
        }
        
        if (typeof showImportStep === 'function') {
            showImportStep('upload');
        }
        
        window.openModal('import_modal');
    };

    // Fallback to ensure drag-and-drop file label updates without crashing
    window.updateImportFileLabel = window.updateImportFileLabel || function (file) {
        let zoneLabel = document.getElementById('import_zone_label');
        if (zoneLabel && file) {
            zoneLabel.textContent = file.name;
        }
    };

    window.setupImportDropZone = function () {
    let dropZone = document.getElementById('import_drop_zone');
    let fileInput = document.getElementById('import_file');
    
    if (!dropZone || !fileInput) return;

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.opacity = '0.5';
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.opacity = '1';
        }, false);
    });

    dropZone.addEventListener('drop', function (e) {
        let dt = e.dataTransfer;
        let files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            if (typeof window.updateImportFileLabel === 'function') {
                window.updateImportFileLabel(files[0]);
            }
        }
    }, false);
};

    window.submitAssetImport = async function () {
    let fileInput = document.getElementById('import_file');
    let submitBtn = document.getElementById('import_submit_btn');
    let file = fileInput?.files?.[0];
    
    if (!file) { 
        showToast('Select a file first.', 'error'); 
        return; 
    }
    
    if (typeof showImportStep === 'function') {
        showImportStep('progress');
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Importing...';
    
    let fd = new FormData();
    fd.append('import_file', file);
    if (window.currentImportType) {
        fd.append('import_type', window.currentImportType);
    }
    
    try {
        let url = '/src/api/import_export.php?action=import';
        let res = await fetch(url, { 
            method: 'POST', 
            headers: { 'X-CSRF-Token': getCsrfToken() }, 
            body: fd 
        });
        
        let json = await res.json();
        if (!json.success && !json.data) {
            let errStr = json.message ?? 'Import failed.';
            if (errStr.includes('Duplicate entry')) {
                errStr = 'Failed: Records already exist in the system.';
            }
            throw new Error(errStr);
        }
        
        if (typeof renderImportResults === 'function') {
            renderImportResults(json.data);
        }
        
        if (typeof showImportStep === 'function') {
            showImportStep('results');
        }
        
        if ((json.data?.success ?? 0) > 0) {
            showToast(
                `Success: ${json.data.success} asset(s) imported.`, 
                'success'
            );
            loadServerAssets();
        } else if ((json.data?.failed ?? 0) > 0) {
            showToast('Import finished with some errors.', 'warning');
        }

    } catch (err) {
        if (typeof showImportStep === 'function') {
            showImportStep('upload');
        }
        showToast(err.message ?? 'Import failed.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-upload"></i> Import';
    }
};