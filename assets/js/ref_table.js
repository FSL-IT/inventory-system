// assets/js/ref_table.js
// Shared search + pagination + sort engine for all Reference Data pages.

class RefTable {
    constructor(config) {
        // config: { apiUrl, tbodyId, paginationId, counterId, columns, renderRow, emptyLabel }
        this.apiUrl       = config.apiUrl;
        this.tbodyId      = config.tbodyId;
        this.paginationId = config.paginationId;
        this.counterId    = config.counterId;
        this.columns      = config.columns;   // [{ key, label, sortable }]
        this.renderRow    = config.renderRow;
        this.emptyLabel   = config.emptyLabel ?? 'No records found.';

        this.page    = 1;
        this.perPage = 10;
        this.search  = '';
        this.sort    = config.defaultSort ?? 'name';
        this.dir     = 'asc';

        this._debounceTimer = null;
    }

    // Call once after DOM ready
    init() {
        this._renderHeader();

        const searchEl = document.getElementById('ref_search');
        if (searchEl) {
            searchEl.addEventListener('input', e => {
                clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(() => {
                    this.search = e.target.value.trim();
                    this.page   = 1;
                    this.load();
                }, 300);
            });
        }

        const perPageEl = document.getElementById('ref_per_page');
        if (perPageEl) {
            perPageEl.addEventListener('change', e => {
                this.perPage = parseInt(e.target.value, 10);
                this.page    = 1;
                this.load();
            });
        }

        this.load();
    }

    setSort(key) {
        if (this.sort === key) {
            this.dir = this.dir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort = key;
            this.dir  = 'asc';
        }
        this.page = 1;
        this.load();
        this._renderHeader();
    }

    async load() {
        const tbody = document.getElementById(this.tbodyId);
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="${this.columns.length}" style="text-align:center;padding:30px;color:var(--white-4)"><i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite"></i> Loading...</td></tr>`;

        const params = new URLSearchParams({
            search:   this.search,
            page:     this.page,
            per_page: this.perPage,
            sort:     this.sort,
            dir:      this.dir,
        });

        try {
            const res  = await apiFetch(`${this.apiUrl}?${params}`);
            const rows = res.data ?? [];
            const pg   = res.pagination ?? null;

            this._renderRows(rows);
            this._renderPagination(pg);
            this._renderCounter(pg);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="${this.columns.length}" style="text-align:center;padding:30px;color:var(--red)">Failed to load data.</td></tr>`;
        }
    }

    _renderHeader() {
        const thead = document.getElementById(this.tbodyId)
            ?.closest('table')?.querySelector('thead tr');
        if (!thead) return;

        thead.innerHTML = this.columns.map(col => {
            if (!col.sortable) return `<th>${col.label}</th>`;

            const active = this.sort === col.key;
            const icon   = active
                ? (this.dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down')
                : 'bi-arrow-down-up';

            return `
                <th class="sortable-th ${active ? 'sort-active' : ''}"
                    onclick="window._refTable.setSort('${col.key}')"
                    style="cursor:pointer;user-select:none;white-space:nowrap">
                    ${col.label}
                    <i class="bi ${icon}" style="font-size:10px;margin-left:4px;opacity:${active ? 1 : 0.4}"></i>
                </th>
            `;
        }).join('');
    }

    _renderRows(rows) {
        const tbody = document.getElementById(this.tbodyId);
        if (!tbody) return;

        if (!rows.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${this.columns.length}">
                        <div class="empty-state">
                            <i class="bi bi-inbox" style="font-size:32px;margin-bottom:8px;display:block"></i>
                            <div class="empty-state__title">${this.emptyLabel}</div>
                            ${this.search ? `<div style="font-size:12px;color:var(--white-4);margin-top:4px">Try a different search term.</div>` : ''}
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = rows.map(row => this.renderRow(row)).join('');
    }

    _renderPagination(pg) {
        const container = document.getElementById(this.paginationId);
        if (!container || !pg || pg.pages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        const { page, pages } = pg;
        let html = '';

        html += `<button class="pagination-btn" onclick="window._refTable.goTo(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>`;

        const start = Math.max(1, page - 2);
        const end   = Math.min(pages, page + 2);

        if (start > 1) html += `<button class="pagination-btn" onclick="window._refTable.goTo(1)">1</button>${start > 2 ? '<span style="color:var(--white-4);padding:0 4px">…</span>' : ''}`;

        for (let i = start; i <= end; i++) {
            html += `<button class="pagination-btn ${i === page ? 'active' : ''}" onclick="window._refTable.goTo(${i})">${i}</button>`;
        }

        if (end < pages) html += `${end < pages - 1 ? '<span style="color:var(--white-4);padding:0 4px">…</span>' : ''}<button class="pagination-btn" onclick="window._refTable.goTo(${pages})">${pages}</button>`;

        html += `<button class="pagination-btn" onclick="window._refTable.goTo(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next ›</button>`;

        container.innerHTML = html;
    }

    _renderCounter(pg) {
        const el = document.getElementById(this.counterId);
        if (!el || !pg) return;

        if (pg.total === 0) {
            el.textContent = 'No results';
            return;
        }

        const start = (pg.page - 1) * pg.per_page + 1;
        const end   = Math.min(pg.page * pg.per_page, pg.total);
        el.textContent = `Showing ${start}–${end} of ${pg.total}`;
    }

    goTo(page) {
        if (page < 1) return;
        this.page = page;
        this.load();
    }

    reload() {
        this.page = 1;
        this.load();
    }
}

// CSS for spin animation (injected once)
if (!document.getElementById('ref-table-style')) {
    const s = document.createElement('style');
    s.id = 'ref-table-style';
    s.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        .sortable-th:hover { background: rgba(255,255,255,0.04); }
        .sort-active { color: var(--accent) !important; }
    `;
    document.head.appendChild(s);
}