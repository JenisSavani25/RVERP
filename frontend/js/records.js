// ─────────────────────────────────────────────────────────────────────────────
// RECORDS VIEWER — Single-screen entry list for all 6 modules
// ─────────────────────────────────────────────────────────────────────────────

let currentExpandedId = null;   // "type-index" of the currently expanded row

function getLedgerType(tabId) {
    if (tabId === 'rough-buy') return 'buys';
    if (tabId === 'rough-sale') return 'sales';
    if (tabId === 'polish-buy') return 'polish_buys';
    if (tabId === 'polish-sale') return 'polish_sales';
    if (tabId === 'box-selling') return 'box_selling';
    return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    loadSalesData();
    loadBuysData();
    loadPolishSalesData();
    loadPolishBuysData();
    loadBoxMakingData();
    loadBoxSellingData();
    loadTransferData();
    loadIssueData();

    buildAllPanels();
    renderAllTabs();

    document.getElementById('records-last-sync').textContent =
        'Last synced ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUILD PANEL SKELETONS (search bar + stats area + table container)
// ─────────────────────────────────────────────────────────────────────────────
const PANELS = ['rough-buy','rough-sale','polish-buy','polish-sale','box-making','box-selling','transfers','conversions'];
const EMPTY_MSG = {
    'rough-buy':   'No Rough Buy entries yet. Go to Rough Buys to add one.',
    'rough-sale':  'No Rough Sale entries yet. Go to Rough Sales to add one.',
    'polish-buy':  'No Polish Buy entries yet. Go to Polish Buys to add one.',
    'polish-sale': 'No Polish Sale entries yet. Go to Polish Sales to add one.',
    'box-making':  'No Box Making entries yet. Go to Box Making to add one.',
    'box-selling': 'No Box Selling entries yet. Go to Box Selling to add one.',
    'transfers':   'No transfers recorded yet. Go to Transfer Management to add one.',
    'conversions': 'No conversions recorded yet. Go to Rough → Polish to add one.'
};

function buildAllPanels() {
    PANELS.forEach(id => {
        document.getElementById(`panel-${id}`).innerHTML = `
            <div class="rec-panel-top">
                <input type="search" class="rec-search" id="search-${id}"
                    placeholder="Search records…"
                    oninput="filterRows('${id}', this.value)">
                <div class="rec-stats" id="stats-${id}"></div>
            </div>
            <div class="rec-table-wrap">
                <table class="rec-table" id="tbl-${id}">
                    <thead id="thead-${id}"></thead>
                    <tbody id="tbody-${id}"></tbody>
                </table>
                <div class="rec-empty hidden" id="empty-${id}">
                    <div class="empty-icon">📭</div>
                    <div>${EMPTY_MSG[id]}</div>
                </div>
            </div>`;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER ALL TABS
// ─────────────────────────────────────────────────────────────────────────────
function renderAllTabs() {
    renderTransactionTab('rough-buy',   buysList,        'buy',  '#16a34a');
    renderTransactionTab('rough-sale',  salesList,       'sale', '#d97706');
    renderTransactionTab('polish-buy',  polishBuysList,  'buy',  '#7c3aed');
    renderTransactionTab('polish-sale', polishSalesList, 'sale', '#a855f7');
    renderBoxMakingTab();
    renderBoxSellingTab();
    renderTransfersTab();
    renderConversionsTab();
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION TABS (Rough Buy / Rough Sale / Polish Buy / Polish Sale)
// ─────────────────────────────────────────────────────────────────────────────
function renderTransactionTab(tabId, entries, mode, accentColor) {
    const isBuy = mode === 'buy';

    // Update badge count
    document.getElementById(`cnt-${tabId}`).textContent = entries.length;

    // Headers
    const thead = document.getElementById(`thead-${tabId}`);
    thead.innerHTML = `<tr>
        <th class="accent-cell"></th>
        <th>#</th>
        <th>Date</th>
        <th>Party</th>
        <th>Dalal</th>
        <th class="num">Pcs</th>
        <th class="num">Carat</th>
        <th class="num">₹/ct</th>
        <th class="num">Total ₹</th>
        <th class="num">${isBuy ? 'Paid ₹' : 'Rcvd ₹'}</th>
        <th class="num">Pending ₹</th>
        <th>Deadline</th>
        <th>Status</th>
        <th>Actions</th>
        <th class="w-20px"></th>
    </tr>`;

    // Stats
    const totalPcs  = entries.reduce((s, e) => s + (parseInt(e.pieces) || 0), 0);
    const totalCt   = entries.reduce((s, e) => s + (parseFloat(e.carat) || 0), 0);
    const totalAmt  = entries.reduce((s, e) => s + (parseFloat(e.finalAmount) || 0), 0);
    const totalPaid = entries.reduce((s, e) => s + getPaidAmount(e), 0);
    const totalOut  = Math.max(0, totalAmt - totalPaid);

    document.getElementById(`stats-${tabId}`).innerHTML = `
        <div class="rec-stat"><span class="rs-label">Entries</span><span class="rs-val">${entries.length}</span></div>
        <div class="rec-stat"><span class="rs-label">Total Pieces</span><span class="rs-val">${totalPcs}</span></div>
        <div class="rec-stat"><span class="rs-label">Total Carats</span><span class="rs-val">${totalCt.toFixed(3)} ct</span></div>
        <div class="rec-stat"><span class="rs-label">Total Value</span><span class="rs-val">${formatCurrency(Math.round(totalAmt))}</span></div>
        <div class="rec-stat"><span class="rs-label">Outstanding</span><span class="rs-val ${totalOut > 0 ? 'danger' : 'success'}">${formatCurrency(Math.round(totalOut))}</span></div>`;

    // Rows
    const tbody = document.getElementById(`tbody-${tabId}`);
    const emptyEl = document.getElementById(`empty-${tabId}`);

    if (entries.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    const rowsHtml = entries.map((e, idx) => {
        const ref      = isBuy ? `B-${e.buyingNo || idx+1}` : `S-${e.sellingNo || idx+1}`;
        const date     = isBuy ? e.buyingDate  : e.sellingDate;
        const pieces   = parseInt(e.pieces) || 0;
        const carat    = parseFloat(e.carat) || 0;
        const price    = parseFloat(e.price) || 0;
        const total    = parseFloat(e.finalAmount) || 0;
        const paid     = getPaidAmount(e);
        const rawPending = total - paid;
        const pending  = Math.max(0, rawPending);
        const status   = getPaymentStatus(e);
        const dlStatus = getDeadlineStatus(e);
        const dlLabel  = getDeadlineLabel(e, dlStatus);
        const rowKey   = `${tabId}-${idx}`;

        const ledgerType = getLedgerType(tabId);
        return `<tr class="data-row" id="row-${rowKey}" data-key="${rowKey}"
                    data-search="${(e.partyName||'').toLowerCase()} ${(e.dalal||'').toLowerCase()} ${ref.toLowerCase()}"
                    onclick="toggleExpand('${rowKey}', '${tabId}', ${idx})">
            <td class="accent-cell"><span class="accent-bar" style="background:${accentColor};"></span></td>
            <td class="font-mono font-bold">${ref}</td>
            <td class="text-nowrap">${fmtDate(date)}</td>
            <td class="font-semibold ellipsis max-w-120">${e.partyName || '—'}</td>
            <td class="muted">${e.dalal || '—'}</td>
            <td class="num">${pieces}</td>
            <td class="num">${carat.toFixed(3)}</td>
            <td class="num">${formatCurrency(Math.round(price))}</td>
            <td class="num font-bold text-primary">${formatCurrency(Math.round(total))}</td>
            <td class="num text-success">${formatCurrency(Math.round(paid))}</td>
            <td class="num font-bold ${rawPending > 0 ? 'text-danger' : 'text-success'}">${rawPending < 0 ? '+' + formatCurrency(Math.round(-rawPending)) : formatCurrency(Math.round(pending))}</td>
            <td><span class="dl-badge ${dlStatus}">${dlLabel}</span></td>
            <td><span class="status-pill ${status.toLowerCase()}">${status}</span></td>
            <td>
                <button class="btn btn-secondary btn-compact"
                    onclick="event.stopPropagation(); toggleActionMenu(this, '${e.sellingNo || e.buyingNo}', '${ledgerType}')">
                    ⋯ Actions
                </button>
            </td>
            <td class="chevron-cell" id="chevron-${rowKey}">›</td>
        </tr>
        <tr class="detail-row hidden" id="detail-${rowKey}">
            <td colspan="15" id="detail-inner-${rowKey}"></td>
        </tr>`;
    }).join('');

    // Totals footer
    const footerHtml = `<tr class="totals-row">
        <td colspan="5" class="totals-label-cell">TOTALS</td>
        <td class="num">${totalPcs}</td>
        <td class="num">${totalCt.toFixed(3)}</td>
        <td></td>
        <td class="num">${formatCurrency(Math.round(totalAmt))}</td>
        <td class="num text-success">${formatCurrency(Math.round(totalPaid))}</td>
        <td class="num ${totalOut > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(Math.round(totalOut))}</td>
        <td colspan="4"></td>
    </tr>`;

    tbody.innerHTML = rowsHtml + footerHtml;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOX MAKING TAB
// ─────────────────────────────────────────────────────────────────────────────
function renderBoxMakingTab() {
    const tabId = 'box-making';
    const entries = boxMakingList;
    const accentColor = '#0891b2';

    document.getElementById(`cnt-${tabId}`).textContent = entries.length;

    // Build a set of sold box IDs for quick lookup
    const soldIds = new Set(boxSellingList.map(s => s.boxId));

    // Stats
    const totalCt   = entries.reduce((s, e) => s + (parseFloat(e.carat) || 0), 0);
    const totalMVal = entries.reduce((s, e) => s + (parseFloat(e.mValue) || 0), 0);
    const available = entries.filter(e => !soldIds.has(e.idNo)).length;

    document.getElementById(`stats-${tabId}`).innerHTML = `
        <div class="rec-stat"><span class="rs-label">Total Boxes</span><span class="rs-val">${entries.length}</span></div>
        <div class="rec-stat"><span class="rs-label">Total Carats</span><span class="rs-val">${totalCt.toFixed(3)} ct</span></div>
        <div class="rec-stat"><span class="rs-label">Total M.Value</span><span class="rs-val">${formatCurrency(Math.round(totalMVal))}</span></div>
        <div class="rec-stat"><span class="rs-label">Available</span><span class="rs-val success">${available}</span></div>
        <div class="rec-stat"><span class="rs-label">Sold</span><span class="rs-val danger">${entries.length - available}</span></div>`;

    const thead = document.getElementById(`thead-${tabId}`);
    thead.innerHTML = `<tr>
        <th class="accent-cell"></th>
        <th>ID No</th>
        <th>Date Made</th>
        <th>Shape 1</th>
        <th>Color</th>
        <th>Purity</th>
        <th>MM</th>
        <th>Shape 2</th>
        <th class="num">Carat</th>
        <th class="num">M.Price/ct</th>
        <th class="num">M.Value</th>
        <th>Status</th>
    </tr>`;

    const tbody = document.getElementById(`tbody-${tabId}`);
    const emptyEl = document.getElementById(`empty-${tabId}`);

    if (entries.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    const rowsHtml = entries.map((e, idx) => {
        const isSold  = soldIds.has(e.idNo);
        const status  = isSold ? 'sold' : 'available';
        const carat   = parseFloat(e.carat) || 0;
        const mPrice  = parseFloat(e.mPrice) || 0;
        const mValue  = parseFloat(e.mValue) || 0;
        const dateStr = e.createdAt ? e.createdAt.split('T')[0] : '—';
        const rowKey  = `${tabId}-${idx}`;

        // Find sale info if sold
        const saleEntry = isSold ? boxSellingList.find(s => s.boxId === e.idNo) : null;

        return `<tr class="data-row" id="row-${rowKey}" data-key="${rowKey}"
                    data-search="${(e.idNo||'').toLowerCase()} ${(e.shape1||'').toLowerCase()} ${(e.shape2||'').toLowerCase()} ${(e.color||'').toLowerCase()}"
                    onclick="toggleBoxDetail('${rowKey}', ${idx}, ${isSold}, ${saleEntry ? `'${saleEntry.partyName}'` : 'null'}, ${saleEntry ? `'${saleEntry.sellingDate}'` : 'null'}, ${saleEntry ? Math.round(saleEntry.finalAmount) : 0})">
            <td class="accent-cell"><span class="accent-bar" style="background:${isSold ? '#94a3b8' : accentColor};"></span></td>
            <td class="font-bold font-mono text-cyan">${e.idNo}</td>
            <td class="text-nowrap">${fmtDate(dateStr)}</td>
            <td>${e.shape1 || '—'}</td>
            <td><span class="font-semibold">${e.color || '—'}</span></td>
            <td>${e.purity || '—'}</td>
            <td class="muted">${e.mm || '—'}</td>
            <td class="font-semibold">${e.shape2 || '—'}</td>
            <td class="num">${carat.toFixed(3)}</td>
            <td class="num">${formatCurrency(Math.round(mPrice))}</td>
            <td class="num font-bold">${formatCurrency(Math.round(mValue))}</td>
            <td><span class="status-pill ${status}">${status === 'sold' ? '✓ SOLD' : '● AVAILABLE'}</span></td>
        </tr>
        <tr class="detail-row hidden" id="detail-${rowKey}">
            <td colspan="12" id="detail-inner-${rowKey}"></td>
        </tr>`;
    }).join('');

    // Footer
    const footerHtml = `<tr class="totals-row">
        <td colspan="8" class="totals-label-cell">TOTALS — ${entries.length} boxes</td>
        <td class="num">${totalCt.toFixed(3)}</td>
        <td></td>
        <td class="num">${formatCurrency(Math.round(totalMVal))}</td>
        <td></td>
    </tr>`;

    tbody.innerHTML = rowsHtml + footerHtml;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOX SELLING TAB
// ─────────────────────────────────────────────────────────────────────────────
function renderBoxSellingTab() {
    const tabId = 'box-selling';
    const entries = boxSellingList;
    const accentColor = '#0369a1';

    document.getElementById(`cnt-${tabId}`).textContent = entries.length;

    const totalAmt  = entries.reduce((s, e) => s + (parseFloat(e.finalAmount) || 0), 0);
    const totalPaid = entries.reduce((s, e) => s + getPaidAmount(e), 0);
    const totalOut  = Math.max(0, totalAmt - totalPaid);
    const totalCt   = entries.reduce((s, e) => s + (parseFloat(e.carat) || 0), 0);

    document.getElementById(`stats-${tabId}`).innerHTML = `
        <div class="rec-stat"><span class="rs-label">Entries</span><span class="rs-val">${entries.length}</span></div>
        <div class="rec-stat"><span class="rs-label">Total Carats</span><span class="rs-val">${totalCt.toFixed(3)} ct</span></div>
        <div class="rec-stat"><span class="rs-label">Total Value</span><span class="rs-val">${formatCurrency(Math.round(totalAmt))}</span></div>
        <div class="rec-stat"><span class="rs-label">Received</span><span class="rs-val success">${formatCurrency(Math.round(totalPaid))}</span></div>
        <div class="rec-stat"><span class="rs-label">Outstanding</span><span class="rs-val ${totalOut > 0 ? 'danger' : 'success'}">${formatCurrency(Math.round(totalOut))}</span></div>`;

    const thead = document.getElementById(`thead-${tabId}`);
    thead.innerHTML = `<tr>
        <th class="accent-cell"></th>
        <th>#</th>
        <th>Box ID</th>
        <th>Date</th>
        <th>Party</th>
        <th>Dalal</th>
        <th class="num">Carat</th>
        <th class="num">₹/ct</th>
        <th class="num">Total ₹</th>
        <th class="num">Rcvd ₹</th>
        <th class="num">Pending ₹</th>
        <th>Deadline</th>
        <th>Status</th>
        <th>Actions</th>
        <th class="w-20px"></th>
    </tr>`;

    const tbody = document.getElementById(`tbody-${tabId}`);
    const emptyEl = document.getElementById(`empty-${tabId}`);

    if (entries.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    const rowsHtml = entries.map((e, idx) => {
        const ref      = `BS-${e.sellingNo || idx+1}`;
        const carat    = parseFloat(e.carat) || 0;
        const price    = parseFloat(e.price) || 0;
        const total    = parseFloat(e.finalAmount) || 0;
        const paid     = getPaidAmount(e);
        const rawPending = total - paid;
        const pending  = Math.max(0, rawPending);
        const status   = getPaymentStatus(e);
        const dlStatus = getDeadlineStatus(e);
        const dlLabel  = getDeadlineLabel(e, dlStatus);
        const rowKey   = `${tabId}-${idx}`;

        return `<tr class="data-row" id="row-${rowKey}" data-key="${rowKey}"
                    data-search="${(e.partyName||'').toLowerCase()} ${(e.dalal||'').toLowerCase()} ${(e.boxId||'').toLowerCase()} ${ref.toLowerCase()}"
                    onclick="toggleExpand('${rowKey}', '${tabId}', ${idx})">
            <td class="accent-cell"><span class="accent-bar" style="background:${accentColor};"></span></td>
            <td class="font-mono font-bold">${ref}</td>
            <td class="font-bold font-mono text-cyan">${e.boxId || '—'}</td>
            <td class="text-nowrap">${fmtDate(e.sellingDate)}</td>
            <td class="font-semibold">${e.partyName || '—'}</td>
            <td class="muted">${e.dalal || '—'}</td>
            <td class="num">${carat.toFixed(3)}</td>
            <td class="num">${formatCurrency(Math.round(price))}</td>
            <td class="num font-bold">${formatCurrency(Math.round(total))}</td>
            <td class="num text-success">${formatCurrency(Math.round(paid))}</td>
            <td class="num font-bold ${rawPending > 0 ? 'text-danger' : 'text-success'}">${rawPending < 0 ? '+' + formatCurrency(Math.round(-rawPending)) : formatCurrency(Math.round(pending))}</td>
            <td><span class="dl-badge ${dlStatus}">${dlLabel}</span></td>
            <td><span class="status-pill ${status.toLowerCase()}">${status}</span></td>
            <td>
                <button class="btn btn-secondary btn-compact"
                    onclick="event.stopPropagation(); toggleActionMenu(this, '${e.sellingNo}', 'box_selling')">
                    ⋯ Actions
                </button>
            </td>
            <td class="chevron-cell" id="chevron-${rowKey}">›</td>
        </tr>
        <tr class="detail-row hidden" id="detail-${rowKey}">
            <td colspan="15" id="detail-inner-${rowKey}"></td>
        </tr>`;
    }).join('');

    const footerHtml = `<tr class="totals-row">
        <td colspan="6" class="totals-label-cell">TOTALS</td>
        <td class="num">${totalCt.toFixed(3)}</td>
        <td></td>
        <td class="num">${formatCurrency(Math.round(totalAmt))}</td>
        <td class="num text-success">${formatCurrency(Math.round(totalPaid))}</td>
        <td class="num ${totalOut > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(Math.round(totalOut))}</td>
        <td colspan="4"></td>
    </tr>`;

    tbody.innerHTML = rowsHtml + footerHtml;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW EXPAND / COLLAPSE (buy & sell tabs)
// ─────────────────────────────────────────────────────────────────────────────
function toggleExpand(rowKey, tabId, idx) {
    const dataRow   = document.getElementById(`row-${rowKey}`);
    const detailRow = document.getElementById(`detail-${rowKey}`);
    const chevron   = document.getElementById(`chevron-${rowKey}`);
    const innerCell = document.getElementById(`detail-inner-${rowKey}`);
    const isOpen    = !detailRow.classList.contains('hidden');

    // Close any previously open row
    if (currentExpandedId && currentExpandedId !== rowKey) {
        const prev = currentExpandedId;
        document.getElementById(`detail-${prev}`)?.classList.add('hidden');
        document.getElementById(`row-${prev}`)?.classList.remove('expanded');
        const prevChev = document.getElementById(`chevron-${prev}`);
        if (prevChev) prevChev.textContent = '›';
    }

    if (isOpen) {
        // Closing
        detailRow.classList.add('hidden');
        dataRow.classList.remove('expanded');
        chevron.textContent = '›';
        currentExpandedId = null;
    } else {
        // Opening — build detail content
        const entry = getEntryByTabIdx(tabId, idx);
        innerCell.innerHTML = buildPaymentDetail(entry, tabId);
        detailRow.classList.remove('hidden');
        dataRow.classList.add('expanded');
        chevron.textContent = '⌄';
        chevron.style.transform = 'rotate(0deg)';
        currentExpandedId = rowKey;
    }
}

function toggleBoxDetail(rowKey, idx, isSold, saleParty, saleDate, saleAmt) {
    const detailRow = document.getElementById(`detail-${rowKey}`);
    const dataRow   = document.getElementById(`row-${rowKey}`);
    const innerCell = document.getElementById(`detail-inner-${rowKey}`);
    const isOpen    = !detailRow.classList.contains('hidden');

    if (currentExpandedId && currentExpandedId !== rowKey) {
        const prev = currentExpandedId;
        document.getElementById(`detail-${prev}`)?.classList.add('hidden');
        document.getElementById(`row-${prev}`)?.classList.remove('expanded');
    }

    if (isOpen) {
        detailRow.classList.add('hidden');
        dataRow.classList.remove('expanded');
        currentExpandedId = null;
    } else {
        const box = boxMakingList[idx];
        let html = `<div class="detail-inner">
            <div class="detail-meta">
                <div class="detail-meta-item"><span class="dm-label">Box ID</span><span class="dm-val text-cyan">${box.idNo}</span></div>
                <div class="detail-meta-item"><span class="dm-label">Shape 1</span><span class="dm-val">${box.shape1}</span></div>
                <div class="detail-meta-item"><span class="dm-label">Shape 2</span><span class="dm-val">${box.shape2}</span></div>
                <div class="detail-meta-item"><span class="dm-label">Color</span><span class="dm-val">${box.color}</span></div>
                <div class="detail-meta-item"><span class="dm-label">Purity</span><span class="dm-val">${box.purity}</span></div>
                <div class="detail-meta-item"><span class="dm-label">MM Size</span><span class="dm-val">${box.mm}</span></div>
                <div class="detail-meta-item"><span class="dm-label">Carat</span><span class="dm-val">${parseFloat(box.carat).toFixed(3)} ct</span></div>
                <div class="detail-meta-item"><span class="dm-label">M. Price/ct</span><span class="dm-val">${formatCurrency(Math.round(box.mPrice))}</span></div>
                <div class="detail-meta-item"><span class="dm-label">M. Value</span><span class="dm-val text-cyan">${formatCurrency(Math.round(box.mValue))}</span></div>
            </div>`;
        if (isSold && saleParty) {
            html += `<div class="sold-box-info">
                <strong>✓ SOLD</strong> — Party: <strong>${saleParty}</strong> · Date: ${fmtDate(saleDate)} · Sale Value: <strong>${formatCurrency(saleAmt)}</strong>
            </div>`;
        } else {
            html += `<div class="available-box-info">
                <strong>● AVAILABLE</strong> — This box is in stock and ready for sale.
            </div>`;
        }
        html += '</div>';
        innerCell.innerHTML = html;
        detailRow.classList.remove('hidden');
        dataRow.classList.add('expanded');
        currentExpandedId = rowKey;
    }
}

// Build the payment detail panel for a transaction entry
function buildPaymentDetail(entry, tabId) {
    if (!entry) return '<div class="detail-inner"><p class="no-payments">Entry not found.</p></div>';

    const payments = entry.payments || [];
    const total    = parseFloat(entry.finalAmount) || 0;
    const paid     = getPaidAmount(entry);
    const pending  = Math.max(0, total - paid);

    const isBuy = tabId === 'rough-buy' || tabId === 'polish-buy' || tabId === 'box-selling';

    // Meta row
    const dateField = entry.buyingDate || entry.sellingDate || '—';
    const gstPct    = tabId === 'rough-buy' || tabId === 'rough-sale' ? '0.25%' : '1.5%';
    const currency  = entry.currencyType === 'Dollar'
        ? `$${entry.totalDollar} @ ₹${entry.dollarRate}` : '₹ (Rupees)';

    let html = `<div class="detail-inner">
        <div class="detail-meta mb-0">
            <div class="detail-meta-item"><span class="dm-label">Date</span><span class="dm-val">${fmtDate(dateField)}</span></div>
            <div class="detail-meta-item"><span class="dm-label">Currency</span><span class="dm-val">${currency}</span></div>
            <div class="detail-meta-item"><span class="dm-label">Discount</span><span class="dm-val">${entry.discount || 0}%</span></div>
            <div class="detail-meta-item"><span class="dm-label">Dalali</span><span class="dm-val">${entry.dalali || 0}%</span></div>
            <div class="detail-meta-item"><span class="dm-label">Bill %</span><span class="dm-val">${entry.billPercentage || 0}%</span></div>
            <div class="detail-meta-item"><span class="dm-label">GST Rate</span><span class="dm-val">${gstPct}</span></div>
            <div class="detail-meta-item"><span class="dm-label">GST Amt</span><span class="dm-val">${formatCurrency(Math.round(entry.gst || 0))}</span></div>
            <div class="detail-meta-item"><span class="dm-label">Final Amt</span><span class="dm-val text-teal">${formatCurrency(Math.round(total))}</span></div>
            <div class="detail-meta-item"><span class="dm-label">Deadline</span><span class="dm-val">${fmtDate(entry.deadlineDate)}</span></div>
        </div>
        <h4>💳 Payment History</h4>`;

    if (payments.length === 0) {
        html += `<div class="no-payments">No payments recorded yet.</div>`;
    } else {
        html += `<table class="detail-pay-table">
            <thead><tr><th>#</th><th>Date</th><th>Type</th><th>Remarks</th><th>Amount</th></tr></thead>
            <tbody>
            ${payments.map((p, i) => `<tr>
                <td class="text-muted font-11">${i+1}</td>
                <td>${fmtDate(p.date)}</td>
                <td><span class="status-pill ${p.type === 'Bill' ? 'partial' : 'pending'}">${p.type}</span></td>
                <td class="text-muted ellipsis max-w-180">${p.remarks || '—'}</td>
                <td class="text-success font-bold font-mono">${formatCurrency(Math.round(p.amount))}</td>
            </tr>`).join('')}
            </tbody>
        </table>`;
    }

    html += `<div class="form-sub-section flex-end gap-sm" style="display:flex; justify-content: space-between; align-items: center; font-size:12px; font-weight:700;">
        <div style="display:flex; gap:20px;">
            <span>Total: <span>${formatCurrency(Math.round(total))}</span></span>
            <span>Paid: <span class="text-success">${formatCurrency(Math.round(paid))}</span></span>
            <span>Pending: <span class="${pending > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(Math.round(pending))}</span></span>
        </div>
        <button class="btn btn-primary btn-compact" onclick="window.location.href='ledger_details.html?id=${entry.sellingNo || entry.buyingNo}&type=${getLedgerType(tabId)}'">
            📄 Open Invoice Ledger
        </button>
    </div></div>`;

    return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────────────────────
function switchTab(tabId, btn) {
    // Deactivate all tabs
    document.querySelectorAll('.rec-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.rec-panel').forEach(p => p.classList.remove('active'));

    // Activate selected
    if (btn) btn.classList.add('active');
    else document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`panel-${tabId}`)?.classList.add('active');

    // Close any expanded row
    currentExpandedId = null;

    // Focus search
    setTimeout(() => document.getElementById(`search-${tabId}`)?.focus(), 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH / FILTER
// ─────────────────────────────────────────────────────────────────────────────
function filterRows(tabId, query) {
    const q = query.trim().toLowerCase();
    const tbody = document.getElementById(`tbody-${tabId}`);
    if (!tbody) return;

    tbody.querySelectorAll('tr.data-row').forEach(row => {
        const search = (row.dataset.search || '').toLowerCase();
        const show = q === '' || search.includes(q);
        row.style.display = show ? '' : 'none';

        // Also hide the detail row of hidden data rows
        const key = row.dataset.key;
        if (key) {
            const dr = document.getElementById(`detail-${key}`);
            if (dr && !show) dr.style.display = 'none';
            else if (dr && show) dr.style.display = '';
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function getPaidAmount(entry) {
    return (entry.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
}

function getPaymentStatus(entry) {
    const total   = parseFloat(entry.finalAmount) || 0;
    const paid    = getPaidAmount(entry);
    const pending = total - paid;
    if (pending < 0)      return 'OVERPAID';
    if (pending <= 0)     return 'PAID';
    if (paid > 0)         return 'PARTIAL';
    return 'PENDING';
}

function getDeadlineStatus(entry) {
    const status = getPaymentStatus(entry);
    if (status === 'PAID' || status === 'OVERPAID') return 'paid';
    const dl = entry.deadlineDate;
    if (!dl) return 'ok';
    try {
        const today  = new Date(); today.setHours(0,0,0,0);
        const dlDate = new Date(dl + 'T00:00:00');
        const diff   = Math.floor((dlDate - today) / 86400000);
        if (diff < 0)  return 'overdue';
        if (diff <= 7) return 'soon';
        return 'ok';
    } catch { return 'ok'; }
}

function getDeadlineLabel(entry, dlStatus) {
    if (dlStatus === 'paid') return '✓ Paid';
    const dl = entry.deadlineDate;
    if (!dl) return '—';
    try {
        const today  = new Date(); today.setHours(0,0,0,0);
        const dlDate = new Date(dl + 'T00:00:00');
        const diff   = Math.floor((dlDate - today) / 86400000);
        if (diff < 0)  return `⚠ ${Math.abs(diff)}d overdue`;
        if (diff === 0) return '⚠ Due Today';
        if (diff <= 7) return `Due in ${diff}d`;
        return fmtDate(dl);
    } catch { return dl; }
}

function getEntryByTabIdx(tabId, idx) {
    switch(tabId) {
        case 'rough-buy':   return buysList[idx];
        case 'rough-sale':  return salesList[idx];
        case 'polish-buy':  return polishBuysList[idx];
        case 'polish-sale': return polishSalesList[idx];
        case 'box-selling': return boxSellingList[idx];
        default: return null;
    }
}

function fmtDate(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch { return dateStr; }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER TRANSFERS TAB
// ─────────────────────────────────────────────────────────────────────────────
function renderTransfersTab() {
    const tabId = 'transfers';
    const entries = transfersList || [];

    // Update badge count
    document.getElementById(`cnt-${tabId}`).textContent = entries.length;

    // Headers
    const thead = document.getElementById(`thead-${tabId}`);
    thead.innerHTML = `<tr>
        <th class="accent-cell"></th>
        <th>Date</th>
        <th>Transfer No</th>
        <th>Item Type</th>
        <th>From Location</th>
        <th>To Location</th>
        <th>Details</th>
        <th>Remarks</th>
    </tr>`;

    // Stats
    const totalPolishTransferred = entries
        .filter(t => t.itemType === 'Polish')
        .reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
        
    const totalDabbisTransferred = entries
        .filter(t => t.itemType === 'Dabbi')
        .reduce((sum, t) => sum + (t.boxIds ? t.boxIds.length : 0), 0);

    document.getElementById(`stats-${tabId}`).innerHTML = `
        <div class="rec-stat"><span class="rs-label">Total Transfers</span><span class="rs-val">${entries.length}</span></div>
        <div class="rec-stat"><span class="rs-label">Polish Pcs</span><span class="rs-val">${totalPolishTransferred}</span></div>
        <div class="rec-stat"><span class="rs-label">Dabbi Boxes</span><span class="rs-val">${totalDabbisTransferred}</span></div>`;

    // Rows
    const tbody = document.getElementById(`tbody-${tabId}`);
    const emptyEl = document.getElementById(`empty-${tabId}`);

    if (entries.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    tbody.innerHTML = entries.map((t, idx) => {
        let details = "";
        let searchStr = `${t.transferNo} ${t.itemType} ${t.fromLocation} ${t.toLocation} ${t.remarks || ''}`;
        
        if (t.itemType === 'Polish') {
            details = `<strong>${(t.shapeName || 'Polish').toUpperCase()} — ${t.quantity || 0} pcs${t.carat ? ` / ${parseFloat(t.carat).toFixed(2)} ct` : ''}</strong>`;
            searchStr += ` ${t.shapeName || ''} ${t.quantity || ''}`;
        } else {
            const boxes = t.boxIds ? t.boxIds.join(", ") : "—";
            details = `Boxes: <strong>${boxes}</strong> (${t.boxIds ? t.boxIds.length : 0} boxes)`;
            searchStr += ` ${boxes}`;
        }

        return `<tr class="data-row" data-search="${searchStr}">
            <td class="accent-cell"><span class="accent-bar" style="background:#0284c7;"></span></td>
            <td>${fmtDate(t.date)}</td>
            <td><strong class="text-primary">${t.transferNo}</strong></td>
            <td>${t.itemType}</td>
            <td>${t.fromLocation}</td>
            <td>${t.toLocation}</td>
            <td>${details}</td>
            <td class="text-muted">${t.remarks || '—'}</td>
        </tr>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER CONVERSIONS TAB (Rough → Polish)
// ─────────────────────────────────────────────────────────────────────────────
function renderConversionsTab() {
    const tabId = 'conversions';
    const entries = conversionList || [];

    // Update badge count
    document.getElementById(`cnt-${tabId}`).textContent = entries.length;

    // Headers
    const thead = document.getElementById(`thead-${tabId}`);
    thead.innerHTML = `<tr>
        <th class="accent-cell"></th>
        <th>Date</th>
        <th>Rough Buy</th>
        <th>Party</th>
        <th>Polish Pcs</th>
        <th>Polish Ct</th>
        <th>Not Polished (Pcs / Ct)</th>
        <th>Rate</th>
        <th>Amount</th>
    </tr>`;

    // Stats
    const totalConv     = entries.length;
    const totalPolishPcs = entries.reduce((s, c) => s + (parseInt(c.polishPieces) || 0), 0);
    const totalPolishCt  = entries.reduce((s, c) => s + (parseFloat(c.polishedCarat) || 0), 0);

    document.getElementById(`stats-${tabId}`).innerHTML = `
        <div class="rec-stat"><span class="rs-label">Total Conversions</span><span class="rs-val">${totalConv}</span></div>
        <div class="rec-stat"><span class="rs-label">Polish Pcs Produced</span><span class="rs-val success">+${totalPolishPcs}</span></div>
        <div class="rec-stat"><span class="rs-label">Polish Carat</span><span class="rs-val">${totalPolishCt.toFixed(3)}</span></div>`;

    // Rows
    const tbody = document.getElementById(`tbody-${tabId}`);
    const emptyEl = document.getElementById(`empty-${tabId}`);

    if (entries.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    // Newest first
    const ordered = entries
        .map((c, idx) => ({ c, idx }))
        .sort((a, b) => (b.c.createdAt || '').localeCompare(a.c.createdAt || ''));

    tbody.innerHTML = ordered.map(({ c }) => {
        const rb     = (buysList || []).find(b => String(b.buyingNo) === String(c.roughBuyingNo));
        const party  = (rb && rb.partyName) || '—';
        const total  = rb ? (parseFloat(rb.totalPrice) || 0) : 0;
        const pCarat = parseFloat(c.polishedCarat) || 0;
        const rate   = pCarat > 0 ? total / pCarat : 0;
        const amount = pCarat * rate * 1.15;
        const npPcs  = parseInt(c.notPolishedPieces) || 0;
        const npCt   = parseFloat(c.notPolishedCarat) || 0;

        const searchStr = `${c.roughBuyingNo || ''} ${party} ${c.conversionDate || ''}`;

        return `<tr class="data-row" data-search="${searchStr}">
            <td class="accent-cell"><span class="accent-bar" style="background:#9333ea;"></span></td>
            <td>${fmtDate(c.conversionDate)}</td>
            <td><strong class="text-primary">${c.roughBuyingNo ? '#' + c.roughBuyingNo : '—'}</strong></td>
            <td><strong>${party}</strong></td>
            <td class="text-success"><strong>+${parseInt(c.polishPieces) || 0}</strong></td>
            <td>${pCarat ? pCarat.toFixed(3) : '—'}</td>
            <td>${npPcs} pcs / ${npCt.toFixed(3)} ct</td>
            <td>${rate ? formatCurrency(Math.round(rate)) : '—'}</td>
            <td>${amount ? formatCurrency(Math.round(amount)) : '—'}</td>
        </tr>`;
    }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW ACTION MENU (Ledger / Edit / Delete) + password-protected delete
// ─────────────────────────────────────────────────────────────────────────────
const RECORD_DELETE_PASSWORD = "vikas000";
const EDIT_PAGE = {
    buys: 'rough_buy.html',
    sales: 'rough_sales.html',
    polish_buys: 'polish_buy.html',
    polish_sales: 'polish_sales.html',
    box_selling: 'box_selling.html'
};

let openActionMenuEl = null;

function toggleActionMenu(btn, id, type) {
    // Clicking the same trigger again closes the menu
    if (openActionMenuEl && openActionMenuEl.dataset.owner === `${type}-${id}`) {
        closeActionMenu();
        return;
    }
    closeActionMenu();

    const menu = document.createElement('div');
    menu.className = 'rec-action-menu';
    menu.dataset.owner = `${type}-${id}`;
    menu.innerHTML = `
        <button type="button" onclick="recAction('ledger', '${id}', '${type}')">📄 Ledger</button>
        <button type="button" onclick="recAction('edit', '${id}', '${type}')">✏️ Edit</button>
        <button type="button" class="danger" onclick="recAction('delete', '${id}', '${type}')">🗑️ Delete</button>`;
    document.body.appendChild(menu);

    const rect = btn.getBoundingClientRect();
    const menuWidth = 170;
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))}px`;

    openActionMenuEl = menu;
    // Defer so the current click doesn't immediately trigger the outside-close
    setTimeout(() => {
        document.addEventListener('click', outsideActionMenuListener);
        window.addEventListener('resize', closeActionMenu, { once: true });
    }, 0);
}

function outsideActionMenuListener(e) {
    if (openActionMenuEl && !openActionMenuEl.contains(e.target)) {
        closeActionMenu();
    }
}

function closeActionMenu() {
    if (openActionMenuEl) {
        openActionMenuEl.remove();
        openActionMenuEl = null;
        document.removeEventListener('click', outsideActionMenuListener);
    }
}

function recAction(action, id, type) {
    closeActionMenu();
    if (action === 'ledger') {
        window.location.href = `ledger_details.html?id=${id}&type=${type}`;
    } else if (action === 'edit') {
        const page = EDIT_PAGE[type];
        if (!page) { alert("Editing is not available for this record type."); return; }
        window.location.href = `${page}?edit=${id}`;
    } else if (action === 'delete') {
        deleteRecordWithPassword(id, type);
    }
}

async function deleteRecordWithPassword(id, type) {
    const entered = prompt("Enter password to delete this record:");
    if (entered === null) return; // user cancelled
    if (entered !== RECORD_DELETE_PASSWORD) {
        alert("Incorrect password. The record was NOT deleted.");
        return;
    }
    if (!confirm("This will permanently delete the record and its payment history. This cannot be undone.\n\nProceed?")) {
        return;
    }
    try {
        await deleteRecordOnServer(type, id);
        alert("Record deleted successfully.");
        window.location.reload();
    } catch (e) {
        alert("Could not delete this record.\n\n" + e.message);
    }
}
