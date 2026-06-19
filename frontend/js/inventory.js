// --- INVENTORY MANAGEMENT LOGIC ---
// Derives live stock from ALL transaction modules + conversion entries.
// Rule summary:
//   ROUGH  : +rough_buy.pieces  | -rough_sales.pieces  | -conversion.roughPieces
//   POLISH : Surat stock only (buys + conv − transfers − box making); sales happen in Mumbai
//   BOX    : Surat stock only (made − transferred to Mumbai); sales happen in Mumbai

// ──────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE
// ──────────────────────────────────────────────────────────────────────────────
let allMovements = [];   // merged, date-sorted movement list
let activeFilter = 'all';

// ──────────────────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load all data sources
    loadSalesData();
    loadBuysData();
    loadPolishSalesData();
    loadPolishBuysData();
    loadBoxMakingData();
    loadBoxSellingData();
    loadConversionData();
    loadTransferData();

    // Render everything
    refreshInventory();
});

// ──────────────────────────────────────────────────────────────────────────────
// MAIN REFRESH — recalculates and re-renders everything
// ──────────────────────────────────────────────────────────────────────────────
function refreshInventory() {
    buildMovementList();
    calculateAndRenderStockCards();
    renderHistorySummary();
    renderMovementLedger(allMovements);
}

// ──────────────────────────────────────────────────────────────────────────────
// BUILD MOVEMENT LIST (merged, chronological, with cumulative totals)
// ──────────────────────────────────────────────────────────────────────────────
function buildMovementList() {
    const moves = [];

    // 1. ROUGH BUY → +Rough pieces
    buysList.forEach(b => {
        moves.push({
            date:        b.buyingDate,
            type:        'rough-buy',
            label:       'Rough Buy',
            icon:        '💎',
            ref:         `Buy #${b.buyingNo}`,
            party:       b.partyName || '—',
            roughDelta:  +(parseInt(b.pieces) || 0),
            polishDelta: 0,
            boxDelta:    0
        });
    });

    // 2. ROUGH SALE → -Rough pieces
    salesList.forEach(s => {
        moves.push({
            date:        s.sellingDate,
            type:        'rough-sale',
            label:       'Rough Sale',
            icon:        '📤',
            ref:         `Sale #${s.sellingNo}`,
            party:       s.partyName || '—',
            roughDelta:  -(parseInt(s.pieces) || 0),
            polishDelta: 0,
            boxDelta:    0
        });
    });

    // 3. ROUGH → POLISH CONVERSION → -Rough, +Polish
    conversionList.forEach((c, i) => {
        const rb = (buysList || []).find(b => String(b.buyingNo) === String(c.roughBuyingNo));
        moves.push({
            date:        c.conversionDate,
            type:        'conversion',
            label:       'R→P Conversion',
            icon:        '🔄',
            ref:         c.roughBuyingNo ? `Conv #${c.roughBuyingNo}` : `Conv #${i + 1}`,
            party:       (rb && rb.partyName) || '—',
            roughDelta:  -(parseInt(c.roughPieces) || 0),
            polishDelta: +(parseInt(c.polishPieces) || 0),
            boxDelta:    0
        });
    });

    // 4. POLISH BUY → +Polish pieces
    polishBuysList.forEach(b => {
        moves.push({
            date:        b.buyingDate,
            type:        'polish-buy',
            label:       'Polish Buy',
            icon:        '✨',
            ref:         `P-Buy #${b.buyingNo}`,
            party:       b.partyName || '—',
            roughDelta:  0,
            polishDelta: +(parseInt(b.pieces) || 0),
            boxDelta:    0
        });
    });

    // 5. POLISH SALE — only legacy Surat-source sales affect Surat stock (new sales are Mumbai-only)
    polishSalesList.forEach(s => {
        const sourceLoc = s.sourceLocation || 'Mumbai';
        if (sourceLoc !== 'Surat') return;
        moves.push({
            date:        s.sellingDate,
            type:        'polish-sale',
            label:       'Polish Sale',
            icon:        '📤',
            ref:         `P-Sale #${s.sellingNo}`,
            party:       s.partyName || '—',
            roughDelta:  0,
            polishDelta: -(parseInt(s.pieces) || 0),
            boxDelta:    0
        });
    });

    // 6. BOX MAKING → -2 Polish, +1 Box per entry
    boxMakingList.forEach(bx => {
        moves.push({
            date:        bx.createdAt ? bx.createdAt.split('T')[0] : '—',
            type:        'box-make',
            label:       'Box Making',
            icon:        '🔷',
            ref:         `Box ${bx.idNo}`,
            party:       `${bx.shape2} | ${parseFloat(bx.carat).toFixed(3)} ct`,
            roughDelta:  0,
            polishDelta: -2,
            boxDelta:    +1
        });
    });

    // 7. BOX TRANSFER OUT (to Mumbai) — box sales happen in Mumbai, not Surat
    transfersList.forEach(t => {
        if (t.itemType !== 'Dabbi' || t.fromLocation !== 'Surat' || !t.boxIds) return;
        t.boxIds.forEach(boxId => {
            moves.push({
                date:        t.date,
                type:        'transfer',
                label:       'Transfer to Mumbai',
                icon:        '🔄',
                ref:         `Box ${boxId}`,
                party:       t.transferNo || '—',
                roughDelta:  0,
                polishDelta: 0,
                boxDelta:    -1
            });
        });
    });

    // 8. POLISH TRANSFER OUT (to Mumbai)
    transfersList.forEach(t => {
        if (t.itemType !== 'Polish' || t.fromLocation !== 'Surat') return;
        moves.push({
            date:        t.date,
            type:        'transfer',
            label:       'Transfer to Mumbai',
            icon:        '🔄',
            ref:         t.transferNo || '—',
            party:       `${parseInt(t.quantity) || 0} pcs`,
            roughDelta:  0,
            polishDelta: -(parseInt(t.quantity) || 0),
            boxDelta:    0
        });
    });

    // Sort chronologically (oldest first)
    moves.sort((a, b) => {
        const da = a.date || '0000-00-00';
        const db = b.date || '0000-00-00';
        return da.localeCompare(db);
    });

    // Calculate running totals
    let rTotal = 0, pTotal = 0, bTotal = 0;
    moves.forEach(m => {
        rTotal += m.roughDelta;
        pTotal += m.polishDelta;
        bTotal += m.boxDelta;
        m.roughRunning  = rTotal;
        m.polishRunning = pTotal;
        m.boxRunning    = bTotal;
    });

    allMovements = moves;
}

function countPolishTransferredOut() {
    return transfersList
        .filter(t => t.itemType === 'Polish' && t.fromLocation === 'Surat')
        .reduce((s, t) => s + (parseInt(t.quantity) || 0), 0);
}

function countBoxesTransferredOut() {
    return transfersList
        .filter(t => t.itemType === 'Dabbi' && t.fromLocation === 'Surat')
        .reduce((s, t) => s + (t.boxIds ? t.boxIds.length : 0), 0);
}

function countSuratBoxes() {
    const dabbis = getDabbiStockDistribution();
    return Object.values(dabbis).filter(b => b.location === 'Surat' && b.status === 'Available').length;
}

// ──────────────────────────────────────────────────────────────────────────────
// STOCK CARD CALCULATIONS & RENDER
// ──────────────────────────────────────────────────────────────────────────────
function calculateAndRenderStockCards() {
    const polishDist = getPolishStockDistribution();
    const polishLot  = polishDist.POLISH || {};

    // ROUGH
    const roughIn       = buysList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughSoldOut  = salesList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughConvOut  = conversionList.reduce((s, c) => s + (parseInt(c.roughPieces) || 0), 0);
    const roughStock    = roughIn - roughSoldOut - roughConvOut;

    // POLISH (Surat only — sales happen in Mumbai)
    const polishBought  = polishBuysList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const polishConvIn  = conversionList.reduce((s, c) => s + (parseInt(c.polishPieces) || 0), 0);
    const polishXferOut = countPolishTransferredOut();
    const polishBoxUsed = boxMakingList.length * 2;
    const polishStock   = polishLot.Surat || 0;

    // BOX (Surat only — sales happen in Mumbai)
    const boxMade       = boxMakingList.length;
    const boxXferOut    = countBoxesTransferredOut();
    const boxStock      = countSuratBoxes();

    // ── Update cards ──
    updateStockCard('rough',  roughStock,  roughIn,       roughSoldOut,  roughConvOut, null, null);
    updateStockCard('polish', polishStock, polishBought,  polishConvIn,  polishXferOut, polishBoxUsed, null);
    updateStockCard('box',    boxStock,    boxMade,       boxXferOut,    null, null, null);
}

function updateStockCard(type, stock, ...args) {
    const countEl = document.getElementById(`${type}-stock-count`);
    const pillEl  = document.getElementById(`${type}-pill`);

    countEl.textContent = stock;

    // Color the count if negative
    countEl.className = stock < 0 ? 'card-count negative' : 'card-count';

    // Status pill
    if (stock < 0) {
        pillEl.textContent = 'NEGATIVE';
        pillEl.className = 'stock-status-pill danger';
    } else if (stock === 0) {
        pillEl.textContent = 'EMPTY';
        pillEl.className = 'stock-status-pill empty';
    } else if (stock <= 5) {
        pillEl.textContent = 'LOW';
        pillEl.className = 'stock-status-pill low';
    } else {
        pillEl.textContent = 'IN STOCK';
        pillEl.className = 'stock-status-pill ok';
    }

    if (type === 'rough') {
        document.getElementById('rough-in').textContent   = `+${args[0]}`;
        document.getElementById('rough-sold').textContent = `−${args[1]}`;
        document.getElementById('rough-conv').textContent = `−${args[2]}`;
    } else if (type === 'polish') {
        document.getElementById('polish-bought').textContent = `+${args[0]}`;
        document.getElementById('polish-conv').textContent   = `+${args[1]}`;
        document.getElementById('polish-sold').textContent   = `−${args[2]}`;
        document.getElementById('polish-box').textContent    = `−${args[3]}`;
    } else if (type === 'box') {
        document.getElementById('box-made').textContent = `+${args[0]}`;
        document.getElementById('box-sold').textContent = `−${args[1]}`;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// HISTORY SUMMARY — fills the "Historical Summary & All-Time Totals" card
// ──────────────────────────────────────────────────────────────────────────────
function renderHistorySummary() {
    // Helper: sum a field across a list
    const sumF = (list, field) => list.reduce((s, x) => s + (parseFloat(x[field]) || 0), 0);
    const sumI = (list, field) => list.reduce((s, x) => s + (parseInt(x[field])   || 0), 0);
    const fmt  = v => formatCurrency(Math.round(v));
    const fmtCt = v => v.toFixed(3) + ' ct';

    // ── ROUGH ──
    const roughInPcs    = sumI(buysList,  'pieces');
    const roughInCt     = sumF(buysList,  'carat');
    const roughInAmt    = sumF(buysList,  'finalAmount');
    const roughSoldPcs  = sumI(salesList, 'pieces');
    const roughSoldCt   = sumF(salesList, 'carat');
    const roughSoldAmt  = sumF(salesList, 'finalAmount');
    const roughConvPcs  = sumI(conversionList, 'roughPieces');
    const roughStock    = roughInPcs - roughSoldPcs - roughConvPcs;
    // rough stock carat: approximate from rough buys ratio
    const roughStockCt  = roughInPcs > 0
        ? Math.max(0, roughInCt - roughSoldCt - (roughConvPcs * roughInCt / roughInPcs))
        : 0;

    set('h-rough-in-pcs',    `+${roughInPcs}`);
    set('h-rough-in-ct',     fmtCt(roughInCt));
    set('h-rough-in-amt',    fmt(roughInAmt));
    set('h-rough-sold-pcs',  `-${roughSoldPcs}`);
    set('h-rough-sold-ct',   fmtCt(roughSoldCt));
    set('h-rough-sold-amt',  fmt(roughSoldAmt));
    set('h-rough-conv-pcs',  `-${roughConvPcs}`);
    set('h-rough-stock',     roughStock);
    set('h-rough-stock-ct',  fmtCt(roughStockCt));

    // Color the current stock value
    colorHistStock('h-rough-stock', roughStock);

    // ── POLISH (Surat stock only) ──
    const polishDist      = getPolishStockDistribution();
    const polishLot       = polishDist.POLISH || {};
    const polishBoughtPcs = sumI(polishBuysList,  'pieces');
    const polishBoughtCt  = sumF(polishBuysList,  'carat');
    const polishBoughtAmt = sumF(polishBuysList,  'finalAmount');
    const polishConvPcs   = sumI(conversionList,  'polishPieces');
    const polishXferPcs   = countPolishTransferredOut();
    const polishBoxPcs    = boxMakingList.length * 2;
    const polishStock     = polishLot.Surat || 0;

    set('h-polish-bought-pcs',  `+${polishBoughtPcs}`);
    set('h-polish-bought-ct',   fmtCt(polishBoughtCt));
    set('h-polish-bought-amt',  fmt(polishBoughtAmt));
    set('h-polish-conv-pcs',    `+${polishConvPcs}`);
    set('h-polish-sold-pcs',    `-${polishXferPcs}`);
    set('h-polish-sold-ct',     '—');
    set('h-polish-sold-amt',    '—');
    set('h-polish-box-pcs',     `-${polishBoxPcs}`);
    set('h-polish-stock',       polishStock);

    colorHistStock('h-polish-stock', polishStock);

    // ── BOX (Surat stock only) ──
    const boxMadeCnt    = boxMakingList.length;
    const boxMadeCt     = sumF(boxMakingList, 'carat');
    const boxMadeMVal   = sumF(boxMakingList, 'mValue');
    const boxXferCnt    = countBoxesTransferredOut();
    const boxStock      = countSuratBoxes();
    // Carat of boxes still in stock: proportional
    const boxStockCt    = boxMadeCnt > 0
        ? (boxStock / boxMadeCnt) * boxMadeCt
        : 0;

    set('h-box-made',       `+${boxMadeCnt}`);
    set('h-box-made-ct',    fmtCt(boxMadeCt));
    set('h-box-made-mval',  fmt(boxMadeMVal));
    set('h-box-sold',       `-${boxXferCnt}`);
    set('h-box-sold-amt',   '—');
    set('h-box-stock',      boxStock);
    set('h-box-stock-ct',   fmtCt(Math.max(0, boxStockCt)));

    colorHistStock('h-box-stock', boxStock);

    // ── TRANSACTION COUNT STRIP ──
    set('tc-rough-buy',   buysList.length);
    set('tc-rough-sale',  salesList.length);
    set('tc-conv',        conversionList.length);
    set('tc-polish-buy',  polishBuysList.length);
    set('tc-polish-sale', polishSalesList.length);
    set('tc-box-make',    boxMakingList.length);
    set('tc-box-sell',    boxSellingList.length);

    // ── Last updated timestamp ──
    const now = new Date();
    document.getElementById('history-last-updated').textContent =
        'Updated ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// DOM helper
function set(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Color the stock cell based on value
function colorHistStock(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'hist-pcs ' + (value < 0 ? 'minus' : value === 0 ? 'minus' : 'neutral');
    if (value < 0) el.style.color = '#dc2626';
    else if (value === 0) el.style.color = '#f59e0b';
    else el.style.color = '#0f766e';
}

// ──────────────────────────────────────────────────────────────────────────────
// RENDER MOVEMENT LEDGER
// ──────────────────────────────────────────────────────────────────────────────
function renderMovementLedger(moves) {
    const tbody    = document.getElementById('movement-body');
    const emptyEl  = document.getElementById('ledger-empty');
    const countEl  = document.getElementById('ledger-count');

    const filtered = activeFilter === 'all' ? moves : moves.filter(m => m.type === activeFilter);

    countEl.textContent = `${filtered.length} movement${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
    }
    emptyEl.classList.add('hidden');

    // Rebuild running totals for filtered view
    // (use the pre-calculated ones from allMovements for the global ledger,
    //  but if filtered we just show global running totals since they represent real stock)

    tbody.innerHTML = filtered.map(m => {
        const rd = m.roughDelta,  pd = m.polishDelta,  bd = m.boxDelta;
        const rt = m.roughRunning, pt = m.polishRunning, bt = m.boxRunning;

        return `
        <tr data-type="${m.type}">
            <td class="text-nowrap text-muted font-12">${formatLedgerDate(m.date)}</td>
            <td><span class="move-badge ${m.type}">${m.icon} ${m.label}</span></td>
            <td class="font-semibold text-primary">${m.ref}</td>
            <td class="text-muted font-12">${m.party}</td>
            <td class="text-center delta ${rd > 0 ? 'plus' : rd < 0 ? 'minus' : 'zero'}">${rd > 0 ? '+' : ''}${rd !== 0 ? rd : '—'}</td>
            <td class="text-center delta ${pd > 0 ? 'plus' : pd < 0 ? 'minus' : 'zero'}">${pd > 0 ? '+' : ''}${pd !== 0 ? pd : '—'}</td>
            <td class="text-center delta ${bd > 0 ? 'plus' : bd < 0 ? 'minus' : 'zero'}">${bd > 0 ? '+' : ''}${bd !== 0 ? bd : '—'}</td>
            <td class="num font-semibold ${rt < 0 ? 'text-danger' : 'text-teal'}">${rt}</td>
            <td class="num font-semibold ${pt < 0 ? 'text-danger' : 'text-purple'}">${pt}</td>
            <td class="num font-semibold ${bt < 0 ? 'text-danger' : 'text-cyan'}">${bt}</td>
        </tr>`;
    }).join('');
}

// ──────────────────────────────────────────────────────────────────────────────
// FILTER
// ──────────────────────────────────────────────────────────────────────────────
function applyFilter(filter, btn) {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderMovementLedger(allMovements);
}

// ──────────────────────────────────────────────────────────────────────────────
// SAVE CONVERSION ENTRY (kept for backward-compat; entry now lives in conversion.html)
// ──────────────────────────────────────────────────────────────────────────────
async function saveConversion(newConv) {
    try {
        conversionList.push(newConv);
        await saveConversionOnServer(newConv);
        refreshInventory();
    } catch (e) {
        conversionList = conversionList.filter(item => item.createdAt !== newConv.createdAt);
        alert("Conversion save failed.\n\n" + e.message);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ──────────────────────────────────────────────────────────────────────────────
function showToast(message) {
    let toast = document.getElementById('inv-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'inv-toast';
        toast.style.cssText = `
            position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
            background: #1e293b; color: #fff;
            padding: 12px 24px; border-radius: 10px;
            font-size: 13px; font-weight: 600;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 9999; opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// ──────────────────────────────────────────────────────────────────────────────
// DATE FORMATTER FOR LEDGER
// ──────────────────────────────────────────────────────────────────────────────
function formatLedgerDate(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch {
        return dateStr;
    }
}
