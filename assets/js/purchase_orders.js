// assets/js/purchase_orders.js

(function () {
    let allPOs         = [];
    let filteredPOs    = [];
    let poCurrentPage  = 1;
    let poItemsPerPage = 25;
    let poSort         = 'po.created_at';
    let poDir          = 'desc';
    let poViewId       = null; 

    let MAX_CAT_CHIPS     = 3;
    let ENDORSE_WARN_DAYS = 3;

    window.initPOs = function () {
        if (typeof registerGlobalSearch === 'function') {
            registerGlobalSearch(function (term) {
                safeSetVal('po_search', term);
                debouncedApplyPoFilters();
            });
        }
        populatePoVendorDropdown();
        populatePoFormVendors();
        populatePoCategoryFilter();
        populatePoOwnerFilter();
        populatePoFiscalYearFilter();
        fetchInitialPOs();
    };

    window.onPoEditClick = function (e, id) {
        e.stopPropagation();
        window.openEditPO(id);
    };

    window.onPoDeleteClick = function (e, id, poNumber) {
        e.stopPropagation();
        window.deletePO(id, poNumber);
    };

    window.onPoEndorseClick = function (e, id) {
        e.stopPropagation();
        window.endorsePO(id);
    };

    async function fetchInitialPOs() {
        let tbody = document.getElementById('po_body');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="cell-date" 
                        style="text-align:center;padding:30px">
                    <i class="bi bi-arrow-repeat spin"></i> Loading POs...
                </td>
            </tr>`;

        try {
            let url  = '/src/api/purchase_orders.php?per_page=5000';
            let data = await apiFetch(url);
            allPOs = data.data || [];
            applyClientPoFilters();
        } catch (err) {
            showToast('Failed to load purchase orders.', 'error');
        }
    }

    window.debouncedApplyPoFilters = debounce(function () {
        poCurrentPage = 1;
        applyClientPoFilters();
    }, 350);

    window.clearPoFilters = function () {
        let fields = [
            'po_search', 'filter_vendor', 'filter_endorsed', 
            'filter_category', 'filter_owner', 'filter_fiscal_year'
        ];
        fields.forEach(id => safeSetVal(id, ''));

        poSort = 'po.created_at';
        poDir  = 'desc';
        updatePoSortIcons();
        debouncedApplyPoFilters();
    };

    window.onPoPerPageChange = function () {
        poItemsPerPage = parseInt(getVal('po_per_page')) || 25;
        poCurrentPage  = 1;
        applyClientPoFilters();
    };

    window.sortPOs = function (col) {
        if (poSort === col) {
            poDir = poDir === 'asc' ? 'desc' : 'asc';
        } else {
            poSort = col;
            poDir  = 'asc';
        }
        poCurrentPage = 1;
        updatePoSortIcons();
        applyClientPoFilters();
    };

    function updatePoSortIcons() {
        document.querySelectorAll('[id^="posort_"]').forEach(el => {
            el.className = 'bi bi-arrow-down-up sort-icon';
        });
        
        let active = document.getElementById(`posort_${poSort}`);
        if (active) {
            let dir = poDir === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
            active.className = `bi ${dir} sort-icon sort-active`;
        }
    }

    function applyClientPoFilters() {
        let search    = getVal('po_search').toLowerCase();
        let vendorId  = getVal('filter_vendor');
        let endorsed  = getVal('filter_endorsed');
        let catFilter = getVal('filter_category').toLowerCase();
        let ownFilter = getVal('filter_owner').toLowerCase();
        let fyFilter  = getVal('filter_fiscal_year').toUpperCase();

        filteredPOs = allPOs.filter(p => {
            let matchSearch = !search || 
                (p.po_number && p.po_number.toLowerCase().includes(search)) ||
                (p.vendor_name && 
                 p.vendor_name.toLowerCase().includes(search));

            let matchVendor = !vendorId || String(p.vendor_id) === vendorId;
            let days = parseInt(p.days_since_received) || 0;
            
            let matchEndorsed = true;
            if (endorsed === 'yes') {
                matchEndorsed = !!p.date_endorsed;
            } else if (endorsed === 'no') {
                matchEndorsed = !p.date_endorsed;
            } else if (endorsed === 'overdue') {
                matchEndorsed = !p.date_endorsed && days > ENDORSE_WARN_DAYS;
            }

            let matchCat = !catFilter || 
                (p.categories && 
                 p.categories.toLowerCase().includes(catFilter));
            let matchOwner = !ownFilter || 
                (p.owners && p.owners.toLowerCase().includes(ownFilter));
            let matchFy = !fyFilter || 
                (p.fiscal_year && p.fiscal_year.toUpperCase() === fyFilter);

            return matchSearch && matchVendor && matchEndorsed 
                && matchCat && matchOwner && matchFy;
        });

        let SORT_MAP = {
            'po.po_number': 'po_number', 
            'v.name': 'vendor_name', 
            'asset_count': 'asset_count',
            'po.date_received': 'date_received', 
            'po.date_endorsed': 'date_endorsed', 
            'po.created_at': 'created_at'
        };

        let jsSortKey = SORT_MAP[poSort] || 'created_at';

        filteredPOs.sort(function (a, b) {
            let valA = a[jsSortKey] ?? '';
            let valB = b[jsSortKey] ?? '';

            if (jsSortKey === 'asset_count') {
                valA = parseInt(valA) || 0; 
                valB = parseInt(valB) || 0;
            } else {
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
            }

            if (valA < valB) return poDir === 'asc' ? -1 : 1;
            if (valA > valB) return poDir === 'asc' ? 1 : -1;
            return 0;
        });

        renderCurrentPoPage();
    }

    window.changePoClientPage = function (page) {
        poCurrentPage = page;
        renderCurrentPoPage();
    };

    function renderCurrentPoPage() {
        let totalItems = filteredPOs.length;
        let totalPages = Math.ceil(totalItems / poItemsPerPage) || 1;
        
        if (poCurrentPage > totalPages) {
            poCurrentPage = totalPages;
        }

        let startIdx = (poCurrentPage - 1) * poItemsPerPage;
        let endIdx   = startIdx + poItemsPerPage;
        let pageData = filteredPOs.slice(startIdx, endIdx);

        renderPoTable(pageData);

        let mockPg = { 
            page: poCurrentPage, 
            per_page: poItemsPerPage, 
            total: totalItems, 
            total_pages: totalPages 
        };
        
        renderPagination('po_pagination', mockPg, 'changePoClientPage');
        renderPoCounter(mockPg);
    }

    function renderPoCounter(pg) {
        let el = document.getElementById('po_counter');
        if (!el || !pg) return;
        
        if (!pg.total) { 
            el.textContent = 'No results'; 
            return; 
        }
        
        let start = (pg.page - 1) * pg.per_page + 1;
        let end   = Math.min(pg.page * pg.per_page, pg.total);
        el.textContent = `${start}–${end} of ${pg.total}`;
    }

    function buildCatChips(categoriesStr) {
        if (!categoriesStr || categoriesStr === '—') {
            return '<span class="cell-date">—</span>';
        }
        let cats  = categoriesStr.split(', ');
        let shown = cats.slice(0, MAX_CAT_CHIPS).map(c => 
            `<span class="tag tag-category">${escapeHtml(c)}</span>`
        ).join('');
        
        let more = cats.length > MAX_CAT_CHIPS 
            ? `<span class="tag">+${cats.length - MAX_CAT_CHIPS}</span>` 
            : '';
            
        return shown + more;
    }

    function buildAgeTag(po) {
        if (po.date_endorsed) return '';
        let days = parseInt(po.days_since_received) || 0;
        
        if (days <= ENDORSE_WARN_DAYS) return '';
        
        return `<span class="tag tag-defective" 
                      title="${days} days since received">
                  <i class="bi bi-exclamation-circle"></i> 
                  ${days}d overdue
                </span>`;
    }

    function renderPoTable(pos) {
        let tbody = document.getElementById('po_body');
     
        if (!pos.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-state">
                            <i class="bi bi-file-earmark-x empty-state__icon">
                            </i>
                            <div class="empty-state__title">
                                No purchase orders found
                            </div>
                        </div>
                    </td>
                </tr>`;
            return;
        }
     
        tbody.innerHTML = pos.map(p => {
            let safePoNum = escapeHtml(p.po_number);
            let fyTag = p.fiscal_year
                ? `<span class="tag" 
                         style="font-size:10px;padding:1px 6px;margin-top:3px">
                       ${escapeHtml(p.fiscal_year)}
                   </span>`
                : '';
     
            let endorsedCell = p.date_endorsed
                ? `<span class="tag tag-active">
                     <i class="bi bi-check-circle"></i> 
                     ${formatDate(p.date_endorsed)}
                   </span>`
                : `<div style="display:flex; flex-direction:column;gap:4px">
                       <span class="tag tag-repair">
                           <i class="bi bi-clock"></i> Pending
                       </span>
                       ${buildAgeTag(p)}
                   </div>`;
     
            let adminActions = `
                ${!p.date_endorsed
                    ? `<button class="btn btn-secondary btn-sm" 
                               onclick="onPoEndorseClick(event, ${p.id})" 
                               title="Mark endorsed today">
                           <i class="bi bi-pen-fill"></i>
                       </button>`
                    : ''}
                <button class="btn btn-secondary btn-sm" 
                        onclick="onPoEditClick(event, ${p.id})" 
                        title="Edit PO">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-danger btn-sm" 
                        onclick="onPoDeleteClick(event, ${p.id}, '${safePoNum}')" 
                        title="Delete PO">
                    <i class="bi bi-trash"></i>
                </button>`;
     
            return `
                <tr class="clickable-row" onclick="viewPO(${p.id})">
                    <td>
                        <div style="display:flex; flex-direction:column;gap:2px">
                            <span class="cell-accent val-mono">
                                ${safePoNum}
                            </span>
                            ${fyTag}
                        </div>
                    </td>
                    <td class="cell-sm">
                        ${escapeHtml(p.vendor_name ?? '—')}
                    </td>
                    <td>
                        <div class="table-actions">
                            ${buildCatChips(p.categories)}
                        </div>
                    </td>
                    <td style="text-align:center">
                        <span class="tag tag-deployed" 
                              style="cursor:pointer" 
                              onclick="event.stopPropagation(); viewPO(${p.id})" 
                              title="View items">
                            ${escapeHtml(p.asset_count ?? 0)}
                        </span>
                    </td>
                    <td class="cell-date">${formatDate(p.date_received)}</td>
                    <td>${endorsedCell}</td>
                    <td><div class="table-actions">${adminActions}</div></td>
                </tr>`;
        }).join('');
    }

    window.endorsePO = function (id) {
        let po = allPOs.find(x => x.id === id);
        if (!po) return;
        
        let msg = `Mark PO "${po.po_number}" as endorsed today?`;
        window.showConfirm('Endorse PO', msg, async function () {
            try {
                let url = `/src/api/purchase_orders.php?id=${id}&action=endorse`;
                let res = await apiFetch(url, { method: 'PUT' });
                showToast('PO endorsed successfully.', 'success');
                po.date_endorsed = res.data.date_endorsed;
                applyClientPoFilters();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    };

    window.viewPO = async function (id) {
        poViewId = id;
        let po = allPOs.find(x => x.id === id);
        if (!po) { 
            showToast('Could not find PO.', 'error'); 
            return; 
        }

        renderViewPoSummary(po);
        window.openModal('view_po');

        let assetBody = document.getElementById('view_po_asset_body');
        if (assetBody) {
            assetBody.innerHTML = `
                <tr>
                    <td colspan="6" class="cell-date" 
                        style="text-align:center;padding:16px">
                        <i class="bi bi-arrow-repeat spin"></i> Loading items…
                    </td>
                </tr>`;
        }

        try {
            let url  = `/src/api/purchase_orders.php?id=${id}&action=assets`;
            let data = await apiFetch(url);
            renderViewPoAssets(data.data || []);
        } catch (err) {
            if (assetBody) {
                assetBody.innerHTML = `
                    <tr>
                        <td colspan="6" 
                            style="text-align:center;padding:16px;color:var(--red)">
                            Failed to load items.
                        </td>
                    </tr>`;
            }
        }
    };

    function renderViewPoSummary(po) {
        let titleEl = document.getElementById('view_po_title');
        let bodyEl  = document.getElementById('view_po_summary');
        if (!titleEl || !bodyEl) return;

        titleEl.textContent = `📋 PO: ${po.po_number}`;
        
        let dateEndorsed = po.date_endorsed 
            ? formatDate(po.date_endorsed) 
            : '⏳ Pending';
            
        let fyRow = po.fiscal_year 
            ? `<div class="form-field">
                   <label>Fiscal Year</label>
                   <div class="info-field">
                       <div class="val">${escapeHtml(po.fiscal_year)}</div>
                   </div>
               </div>` 
            : '';

        bodyEl.innerHTML = `
            <div class="field-grid">
                <div class="form-field">
                    <label>PO Number</label>
                    <div class="info-field">
                        <div class="val val-mono">
                            ${escapeHtml(po.po_number ?? '—')}
                        </div>
                    </div>
                </div>
                <div class="form-field">
                    <label>Vendor</label>
                    <div class="info-field">
                        <div class="val">
                            ${escapeHtml(po.vendor_name ?? '—')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="field-grid">
                <div class="form-field">
                    <label>Date Received</label>
                    <div class="info-field">
                        <div class="val">${formatDate(po.date_received)}</div>
                    </div>
                </div>
                <div class="form-field">
                    <label>Date Endorsed</label>
                    <div class="info-field">
                        <div class="val">${dateEndorsed}</div>
                    </div>
                </div>
            </div>
            ${fyRow}`;
    }

    function renderViewPoAssets(rows) {
        let tbody = document.getElementById('view_po_asset_body');
        if (!tbody) return; 
     
        if (!rows.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="cell-date" 
                        style="text-align:center;padding:16px">
                        No assets linked to this PO yet.
                    </td>
                </tr>`;
            return;
        }
     
        let titleEl  = document.getElementById('view_po_title');
        let poNumber = titleEl 
            ? titleEl.textContent.replace('📋 PO: ', '').trim() 
            : '';
            
        // FIXED: Using navigateTo for SPA compliance
        let searchUrl = `/src/views/assets.php?search=` 
            + encodeURIComponent(poNumber);
     
        tbody.innerHTML = rows.map(r => `
            <tr class="clickable-row" 
                onclick="if(typeof navigateTo === 'function') { navigateTo('${searchUrl}'); } else { window.location.href='${searchUrl}'; }" 
                title="View assets for this PO in inventory">
                <td>
                    <span class="tag tag-category">
                        ${escapeHtml(r.category ?? '—')}
                    </span>
                </td>
                <td class="cell-sm">${escapeHtml(r.description ?? '—')}</td>
                <td style="text-align:center">
                    <span class="tag tag-deployed">
                        ${escapeHtml(r.quantity ?? 0)}
                    </span>
                </td>
                <td class="cell-sm">${escapeHtml(r.location ?? '—')}</td>
                <td class="cell-sm">${escapeHtml(r.owner ?? '—')}</td>
                <td class="cell-date">${escapeHtml(r.remarks || 'NA')}</td>
            </tr>`).join('');
    }

    window.editPoFromView = function () {
        window.closeModal('view_po');
        window.openEditPO(poViewId);
    };

    window.openAddPO = function () {
        safeSetVal('po_edit_id', '');
        document.getElementById('po_modal_title').textContent 
            = '📋 New Purchase Order';
            
        let ids = [
            'po_number', 'po_date_received', 'po_date_endorsed', 'po_vendor'
        ];
        ids.forEach(id => safeSetVal(id, ''));
        
        let inputs = document.querySelectorAll('#po_form input, #po_form select');
        inputs.forEach(el => el.classList.remove('error-highlight'));
        
        // FIXED: Show "Save & Add" on Add Modal
        let btnNext = document.getElementById('btn_save_po_next');
        if (btnNext) {
            btnNext.style.display = 'inline-flex';
        }
            
        window.openModal('add_po');
    };

    window.openEditPO = function (id) {
        let po = allPOs.find(x => x.id === id);
        if (!po) { 
            showToast('Could not load PO for editing.', 'error'); 
            return; 
        }
        
        safeSetVal('po_edit_id', id);
        document.getElementById('po_modal_title').textContent 
            = '✏️ Edit Purchase Order';
            
        safeSetVal('po_number', po.po_number);
        safeSetVal('po_vendor', po.vendor_id ?? '');
        safeSetVal('po_date_received', po.date_received ?? '');
        safeSetVal('po_date_endorsed', po.date_endorsed ?? '');
        
        let inputs = document.querySelectorAll('#po_form input, #po_form select');
        inputs.forEach(el => el.classList.remove('error-highlight'));
        
        // FIXED: Hide "Save & Add Assets" on Edit per client request
        let btnNext = document.getElementById('btn_save_po_next');
        if (btnNext) {
            btnNext.style.display = 'none';
        }
            
        window.openModal('add_po');
    };

    window.savePO = async function (proceedToAssets = false) {
        let id = getVal('po_edit_id');
        let isEdit = !!id;
        let url = isEdit 
            ? `/src/api/purchase_orders.php?id=${id}` 
            : '/src/api/purchase_orders.php';
            
        let formElement = document.getElementById('po_form');
        let btnSave     = document.getElementById('btn_save_po');
        let btnNext     = document.getElementById('btn_save_po_next');
        
        if (!formElement.checkValidity()) {
            showToast('Please fill out all required fields.', 'error');
            formElement.reportValidity();
            return;
        }

        let payload = {
            po_number:     getVal('po_number'),
            vendor_id:     getVal('po_vendor') || null,
            date_received: getVal('po_date_received') || null,
            date_endorsed: getVal('po_date_endorsed') || null,
        };
        
        let targetBtn = proceedToAssets ? btnNext : btnSave;
        let originalText = targetBtn.innerHTML;
        targetBtn.disabled = true;
        targetBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';

        try {
            let res = await apiFetch(url, { 
                method: isEdit ? 'PUT' : 'POST', 
                body: JSON.stringify(payload) 
            });
            
            window.closeModal('add_po');
            showToast(
                `PO ${isEdit ? 'updated' : 'created'} successfully.`, 
                'success'
            );
            fetchInitialPOs();

            if (proceedToAssets) {
                let poId  = isEdit ? id : (res.data?.id || res.id);
                let poNum = payload.po_number;
                
                setTimeout(function () {
                    window.triggerAddAssetForPO(poId, poNum);
                }, 300);
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            targetBtn.disabled = false;
            targetBtn.innerHTML = originalText;
        }
    };

    window.triggerAddAssetForPO = function (poId, poNumber) {
        let url = `/src/views/assets.php?action=add_asset` +
                  `&po_id=${encodeURIComponent(poId)}` +
                  `&po_number=${encodeURIComponent(poNumber)}`;
                  
        if (typeof navigateTo === 'function') {
            navigateTo(url);
        } else {
            window.location.href = url;
        }
    };

    window.openAddAssetFromPO = function () {
        let po = allPOs.find(x => x.id === poViewId);
        if (!po) {
            showToast('Could not load PO data.', 'error');
            return;
        }
     
        window.closeModal('view_po');
        setTimeout(function () {
            window.triggerAddAssetForPO(po.id, po.po_number);
        }, 200);
    };

    window.deletePO = function (id, poNumber) {
        let msg = `Delete PO: ${poNumber}? All linked assets will be unlinked.`;
        window.showConfirm('Delete Purchase Order', msg, async function () {
            try {
                let url = `/src/api/purchase_orders.php?id=${id}`;
                await apiFetch(url, { method: 'DELETE' });
                showToast('PO deleted.', 'success');
                fetchInitialPOs();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    };

    window.exportPoTracker = function () {
        let url = '/src/api/import_export.php?action=export_po_tracker';
        window.location.href = url;
    };

    function appendOptions(selectId, items, valKey, labelKey) {
        let el = document.getElementById(selectId);
        if (!el) return;
        items.forEach(item => {
            let opt = document.createElement('option');
            opt.value = item[valKey];
            opt.textContent = item[labelKey];
            el.appendChild(opt);
        });
    }

    async function populatePoVendorDropdown() {
        try { 
            let d = await apiFetch('/src/api/vendors.php?per_page=500'); 
            appendOptions('filter_vendor', d.data ?? [], 'id', 'name'); 
        } catch (err) {}
    }

    async function populatePoFormVendors() {
        try { 
            let d = await apiFetch('/src/api/vendors.php?per_page=500'); 
            appendOptions('po_vendor', d.data ?? [], 'id', 'name'); 
        } catch (err) {}
    }

    async function populatePoCategoryFilter() {
        try { 
            let d = await apiFetch('/src/api/categories.php?per_page=200'); 
            appendOptions('filter_category', d.data ?? [], 'name', 'name'); 
        } catch (err) {}
    }

    async function populatePoOwnerFilter() {
        try { 
            let url = '/src/api/process_owners.php?per_page=500';
            let d = await apiFetch(url); 
            appendOptions('filter_owner', d.data ?? [], 'name', 'name'); 
        } catch (err) {}
    }

    async function populatePoFiscalYearFilter() {
        let el = document.getElementById('filter_fiscal_year');
        if (!el) return;
        try {
            let url = '/src/api/purchase_orders.php?per_page=5000';
            let d = await apiFetch(url);
            let years = [...new Set(
                (d.data ?? []).map(p => p.fiscal_year).filter(Boolean)
            )].sort().reverse();
            
            years.forEach(fy => {
                let opt = document.createElement('option'); 
                opt.value = fy; 
                opt.textContent = fy; 
                el.appendChild(opt);
            });
        } catch (err) {}
    }

    let poImportFile = null;

    window.openPoImportModal = function () {
        poImportFile = null;
        let zoneLabel = document.getElementById('import_zone_label');
        if (zoneLabel) {
            zoneLabel.textContent = 'Drop your .xlsx file here';
        }
        
        let fileInput = document.getElementById('import_file');
        if (fileInput) fileInput.value = '';
        
        let submitBtn = document.getElementById('import_submit_btn');
        if (submitBtn) { 
            submitBtn.disabled = false; 
            submitBtn.innerHTML = "Import"; 
            submitBtn.onclick = window.submitPoImport; 
        }
        
        showImportStep('upload');
        window.openModal('import_assets');
    };
     
    window.submitPoImport = async function () {
        let fileInput = document.getElementById('import_file');
        let submitBtn = document.getElementById('import_submit_btn');
        let file = fileInput?.files?.[0];
        
        if (!file) { 
            showToast('Select a file first.', 'error'); 
            return; 
        }
        
        showImportStep('progress');
        submitBtn.disabled = true;
        
        let loadingHtml = '<i class="bi bi-hourglass-split"></i> Importing...';
        submitBtn.innerHTML = loadingHtml;
        
        let fd = new FormData();
        fd.append('import_file', file);
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
            
            renderImportResults(json.data);
            showImportStep('results');
            
            if ((json.data?.success ?? 0) > 0) {
                fetchInitialPOs();
            }
        } catch (err) {
            showImportStep('upload');
            showToast(err.message ?? 'Import failed.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Import';
        }
    };
})();