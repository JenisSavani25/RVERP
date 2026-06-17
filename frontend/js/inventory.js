// --- INVENTORY MANAGEMENT LOGIC ---
// Derives live stock from ALL transaction modules + conversion entries.
// Rule summary:
//   ROUGH  : +rough_buy.pieces  | -rough_sales.pieces  | -conversion.roughPieces
//   POLISH : +polish_buy.pieces | +conversion.polishPieces | -polish_sales.pieces | -(boxMakingList.length × 2)
//   BOX    : +boxMakingList.length | -boxSellingList.length

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

    // Set today as default for conversion date
    document.getElementById("conv-date").value = new Date().toISOString().split('T')[0];

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
    renderConversionHistory();
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
        moves.push({
            date:        c.conversionDate,
            type:        'conversion',
            label:       'R→P Conversion',
            icon:        '🔄',
            ref:         `Conv #${i + 1}`,
            party:       c.remarks || '—',
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

    // 5. POLISH SALE → -Polish pieces
    polishSalesList.forEach(s => {
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

    // 7. BOX SELLING → -1 Box per entry
    boxSellingList.forEach(bs => {
        moves.push({
            date:        bs.sellingDate,
            type:        'box-sell',
            label:       'Box Sale',
            icon:        '🏷️',
            ref:         `Box ${bs.boxId} Sale #${bs.sellingNo}`,
            party:       bs.partyName || '—',
            roughDelta:  0,
            polishDelta: 0,
            boxDelta:    -1
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

// ──────────────────────────────────────────────────────────────────────────────
// STOCK CARD CALCULATIONS & RENDER
// ──────────────────────────────────────────────────────────────────────────────
function calculateAndRenderStockCards() {
    // ROUGH
    const roughIn       = buysList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughSoldOut  = salesList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughConvOut  = conversionList.reduce((s, c) => s + (parseInt(c.roughPieces) || 0), 0);
    const roughStock    = roughIn - roughSoldOut - roughConvOut;

    // POLISH
    const polishBought  = polishBuysList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const polishConvIn  = conversionList.reduce((s, c) => s + (parseInt(c.polishPieces) || 0), 0);
    const polishSoldOut = polishSalesList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const polishBoxUsed = boxMakingList.length * 2;
    const polishStock   = polishBought + polishConvIn - polishSoldOut - polishBoxUsed;

    // BOX
    const boxMade       = boxMakingList.length;
    const boxSoldOut    = boxSellingList.length;
    const boxStock      = boxMade - boxSoldOut;

    // ── Update cards ──
    updateStockCard('rough',  roughStock,  roughIn,       roughSoldOut,  roughConvOut, null, null);
    updateStockCard('polish', polishStock, polishBought,  polishConvIn,  polishSoldOut, polishBoxUsed, null);
    updateStockCard('box',    boxStock,    boxMade,       boxSoldOut,    null, null, null);
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

    // ── POLISH ──
    const polishBoughtPcs = sumI(polishBuysList,  'pieces');
    const polishBoughtCt  = sumF(polishBuysList,  'carat');
    const polishBoughtAmt = sumF(polishBuysList,  'finalAmount');
    const polishConvPcs   = sumI(conversionList,  'polishPieces');
    const polishSoldPcs   = sumI(polishSalesList, 'pieces');
    const polishSoldCt    = sumF(polishSalesList, 'carat');
    const polishSoldAmt   = sumF(polishSalesList, 'finalAmount');
    const polishBoxPcs    = boxMakingList.length * 2;
    const polishStock     = polishBoughtPcs + polishConvPcs - polishSoldPcs - polishBoxPcs;

    set('h-polish-bought-pcs',  `+${polishBoughtPcs}`);
    set('h-polish-bought-ct',   fmtCt(polishBoughtCt));
    set('h-polish-bought-amt',  fmt(polishBoughtAmt));
    set('h-polish-conv-pcs',    `+${polishConvPcs}`);
    set('h-polish-sold-pcs',    `-${polishSoldPcs}`);
    set('h-polish-sold-ct',     fmtCt(polishSoldCt));
    set('h-polish-sold-amt',    fmt(polishSoldAmt));
    set('h-polish-box-pcs',     `-${polishBoxPcs}`);
    set('h-polish-stock',       polishStock);

    colorHistStock('h-polish-stock', polishStock);

    // ── BOX ──
    const boxMadeCnt    = boxMakingList.length;
    const boxMadeCt     = sumF(boxMakingList, 'carat');
    const boxMadeMVal   = sumF(boxMakingList, 'mValue');
    const boxSoldCnt    = boxSellingList.length;
    const boxSoldAmt    = sumF(boxSellingList,'finalAmount');
    const boxStock      = boxMadeCnt - boxSoldCnt;
    // Carat of boxes still in stock: proportional
    const boxStockCt    = boxMadeCnt > 0
        ? (boxStock / boxMadeCnt) * boxMadeCt
        : 0;

    set('h-box-made',       `+${boxMadeCnt}`);
    set('h-box-made-ct',    fmtCt(boxMadeCt));
    set('h-box-made-mval',  fmt(boxMadeMVal));
    set('h-box-sold',       `-${boxSoldCnt}`);
    set('h-box-sold-amt',   fmt(boxSoldAmt));
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
// RENDER CONVERSION HISTORY
// ──────────────────────────────────────────────────────────────────────────────
function renderConversionHistory() {
    const tbody  = document.getElementById('conv-history-body');
    const empty  = document.getElementById('conv-empty');

    if (conversionList.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('conv-history-table').classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }

    document.getElementById('conv-history-table').classList.remove('hidden');
    empty.classList.add('hidden');

    tbody.innerHTML = conversionList.map((c, i) => {
        const roughPcs  = parseInt(c.roughPieces) || 0;
        const polishPcs = parseInt(c.polishPieces) || 0;
        const wastage   = roughPcs - polishPcs;
        return `
        <tr>
            <td class="text-muted font-11">#${i+1}</td>
            <td>${formatLedgerDate(c.conversionDate)}</td>
            <td class="delta minus">−${roughPcs}</td>
            <td class="delta plus">+${polishPcs}</td>
            <td class="font-semibold ${wastage > 0 ? 'text-warning' : 'text-muted'}">
                ${wastage > 0 ? '⚠ ' + wastage + ' pcs lost' : '—'}
            </td>
            <td class="text-muted">${c.remarks || '—'}</td>
        </tr>`;
    }).join('');
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
// CONVERSION FORM TOGGLE
// ──────────────────────────────────────────────────────────────────────────────
function toggleConvForm() {
    const wrap = document.getElementById('conv-form-wrap');
    const btn  = document.getElementById('conv-toggle-btn');
    const isHidden = wrap.classList.contains('hidden');
    wrap.classList.toggle('hidden', !isHidden);
    btn.textContent = isHidden ? '✕ Cancel' : '+ New Conversion';

    if (isHidden) {
        // Reset form
        document.getElementById('conv-form').reset();
        document.getElementById('conv-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('conv-warning').classList.add('hidden');
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CONVERSION VALIDATION HELPERS
// ──────────────────────────────────────────────────────────────────────────────
function validateConvRough() {
    const roughInput  = document.getElementById('conv-rough');
    const warnEl      = document.getElementById('conv-warning');

    const roughVal    = parseInt(roughInput.value) || 0;

    // Current rough stock
    const roughIn     = buysList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughSold   = salesList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughConv   = conversionList.reduce((s, c) => s + (parseInt(c.roughPieces) || 0), 0);
    const currentRoughStock = roughIn - roughSold - roughConv;

    if (roughVal > currentRoughStock) {
        warnEl.textContent = `⚠ Warning: You are converting ${roughVal} but current Rough Stock is only ${currentRoughStock}. This will result in a negative rough stock balance.`;
        warnEl.classList.remove('hidden');
    } else {
        warnEl.classList.add('hidden');
    }

    validateConvPolish();
}

function validateConvPolish() {
    const roughVal  = parseInt(document.getElementById('conv-rough').value) || 0;
    const polishVal = parseInt(document.getElementById('conv-polish').value) || 0;
    const warnEl    = document.getElementById('conv-warning');

    if (polishVal > roughVal && roughVal > 0) {
        warnEl.textContent = `⚠ Polish received (${polishVal}) cannot exceed Rough sent (${roughVal}).`;
        warnEl.classList.remove('hidden');
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SAVE CONVERSION ENTRY
// ──────────────────────────────────────────────────────────────────────────────
async function saveConversion(event) {
    event.preventDefault();

    const convDate   = document.getElementById('conv-date').value;
    const roughPcs   = parseInt(document.getElementById('conv-rough').value) || 0;
    const polishPcs  = parseInt(document.getElementById('conv-polish').value) || 0;
    const remarks    = document.getElementById('conv-remarks').value.trim();

    // Validation
    if (!convDate) { alert('Please enter a conversion date.'); return; }
    if (roughPcs <= 0) { alert('Rough Diamonds sent must be at least 1.'); return; }
    if (polishPcs <= 0) { alert('Polish Diamonds received must be at least 1.'); return; }
    if (polishPcs > roughPcs) {
        alert(`Polish received (${polishPcs}) cannot be greater than Rough sent (${roughPcs}).`);
        return;
    }

    const newConv = {
        conversionDate: convDate,
        roughPieces:    roughPcs,
        polishPieces:   polishPcs,
        remarks:        remarks,
        createdAt:      new Date().toISOString()
    };

    try {
        conversionList.push(newConv);
        await saveConversionOnServer(newConv);

        // Refresh without page reload
        toggleConvForm();
        refreshInventory();

        // Show quick confirmation
        showToast(`✅ Conversion saved: −${roughPcs} Rough → +${polishPcs} Polish`);
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
