// ─────────────────────────────────────────────────────────────────────────────
// ROUGH → POLISH CONVERSION MODULE
// Converts a Rough Buy lot into polished diamonds. The polished pieces are added
// to polish stock (via conversionList) and the consumed rough pieces are deducted.
// ─────────────────────────────────────────────────────────────────────────────

let selectedRoughBuy = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();

    document.getElementById('conv-date').value = new Date().toISOString().split('T')[0];

    populateRoughBuyDropdown();
    renderRecentConversions();
});

// Populate the Rough Buy selector from buysList
function populateRoughBuyDropdown() {
    const sel = document.getElementById('rough-buy-select');
    const options = ['<option value="">— Select Rough Buy —</option>'];

    (buysList || [])
        .slice()
        .sort((a, b) => (parseInt(b.buyingNo) || 0) - (parseInt(a.buyingNo) || 0))
        .forEach(b => {
            const label = `#${b.buyingNo} — ${b.partyName || 'Unknown'} (${b.pieces || 0} pcs, ${(parseFloat(b.carat) || 0).toFixed(3)} ct)`;
            options.push(`<option value="${b.buyingNo}">${label}</option>`);
        });

    sel.innerHTML = options.join('');
}

// When a Rough Buy is selected, auto-fill its source values
function onRoughBuySelected() {
    const no = document.getElementById('rough-buy-select').value;
    selectedRoughBuy = (buysList || []).find(b => String(b.buyingNo) === String(no)) || null;

    if (!selectedRoughBuy) {
        setText('src-party', '—');
        setText('src-pieces', '—');
        setText('src-carat', '—');
        setText('src-rate', '—');
        setText('src-total', '—');
        recalcConversion();
        return;
    }

    const pieces = parseInt(selectedRoughBuy.pieces) || 0;
    const carat  = parseFloat(selectedRoughBuy.carat) || 0;
    const rate   = parseFloat(selectedRoughBuy.price) || 0;
    const total  = parseFloat(selectedRoughBuy.totalPrice) || 0;

    setVal('src-party', selectedRoughBuy.partyName || '—');
    setVal('src-pieces', pieces);
    setVal('src-carat', carat.toFixed(3));
    setVal('src-rate', formatCurrency(Math.round(rate)));
    setVal('src-total', formatCurrency(Math.round(total)));

    recalcConversion();
}

// Recalculate all derived values
function recalcConversion() {
    const polishedCarat    = parseFloat(document.getElementById('polished-carat').value) || 0;
    const polishedPieces   = parseInt(document.getElementById('polished-pieces').value) || 0;
    const notPolishedPcs   = parseInt(document.getElementById('notpolished-pieces').value) || 0;

    const roughCarat = selectedRoughBuy ? (parseFloat(selectedRoughBuy.carat) || 0) : 0;
    const total      = selectedRoughBuy ? (parseFloat(selectedRoughBuy.totalPrice) || 0) : 0;

    // Derived metrics (formulas as specified)
    const pointer      = polishedPieces > 0 ? polishedCarat / polishedPieces : 0;
    const rate         = polishedCarat > 0 ? total / polishedCarat : 0;
    const gain         = roughCarat > 0 ? polishedCarat / roughCarat : 0;
    const chargesPerCt = rate * 0.15;
    const finalPrice   = rate + chargesPerCt;
    const amount       = polishedCarat * finalPrice;
    const totalCharges = chargesPerCt * polishedCarat;

    setVal('calc-pointer',     pointer ? pointer.toFixed(3) : '—');
    setVal('calc-rate',        rate ? formatCurrency(Math.round(rate)) : '—');
    setVal('calc-gain',        gain ? gain.toFixed(3) : '—');
    setVal('calc-charges-ct',  chargesPerCt ? formatCurrency(Math.round(chargesPerCt)) : '—');
    setVal('calc-final-price', finalPrice ? formatCurrency(Math.round(finalPrice)) : '—');
    setText('calc-total-charges', formatCurrency(Math.round(totalCharges)));
    setText('calc-amount',        formatCurrency(Math.round(amount)));

    // Warnings
    const warnEl = document.getElementById('conv-warning');
    const srcPieces = selectedRoughBuy ? (parseInt(selectedRoughBuy.pieces) || 0) : 0;
    const consumed  = polishedPieces + notPolishedPcs;
    if (selectedRoughBuy && consumed > srcPieces && srcPieces > 0) {
        warnEl.textContent = `⚠ Polished (${polishedPieces}) + Not-polished (${notPolishedPcs}) = ${consumed} exceeds the ${srcPieces} pcs in Rough Buy #${selectedRoughBuy.buyingNo}.`;
        warnEl.classList.remove('hidden');
    } else {
        warnEl.classList.add('hidden');
    }
}

// Save conversion entry
async function saveConversionEntry(event) {
    event.preventDefault();

    if (!selectedRoughBuy) { alert('Please select a Rough Buy entry.'); return; }

    const convDate       = document.getElementById('conv-date').value;
    const polishedCarat  = parseFloat(document.getElementById('polished-carat').value) || 0;
    const polishedPieces = parseInt(document.getElementById('polished-pieces').value) || 0;
    const notPolishedPcs = parseInt(document.getElementById('notpolished-pieces').value) || 0;
    const notPolishedCt  = parseFloat(document.getElementById('notpolished-carat').value) || 0;

    if (!convDate) { alert('Please enter a conversion date.'); return; }
    if (polishedCarat <= 0) { alert('Polished Carat must be greater than 0.'); return; }
    if (polishedPieces <= 0) { alert('Pieces (after polish) must be at least 1.'); return; }

    const newConv = {
        conversionDate:    convDate,
        roughBuyingNo:     parseInt(selectedRoughBuy.buyingNo) || null,
        roughPieces:       polishedPieces + notPolishedPcs,   // rough consumed (deducted from rough stock)
        polishPieces:      polishedPieces,                    // added to polish stock
        polishedCarat:     polishedCarat,
        notPolishedPieces: notPolishedPcs,
        notPolishedCarat:  notPolishedCt,
        createdAt:         new Date().toISOString()
    };

    const btn = document.getElementById('conv-save-btn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
        conversionList.push(newConv);
        await saveConversionOnServer(newConv);

        showToast(`✅ Conversion saved: +${polishedPieces} pcs to Polish stock`);
        resetConvForm();
        renderRecentConversions();
    } catch (e) {
        conversionList = conversionList.filter(item => item.createdAt !== newConv.createdAt);
        alert("Conversion save failed.\n\n" + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

function resetConvForm() {
    document.getElementById('conv-form').reset();
    document.getElementById('conv-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('notpolished-pieces').value = 0;
    document.getElementById('notpolished-carat').value = 0;
    selectedRoughBuy = null;
    onRoughBuySelected();
}

// Render the recent conversions table
function renderRecentConversions() {
    const body  = document.getElementById('recent-conv-body');
    const empty = document.getElementById('recent-conv-empty');
    const table = document.getElementById('recent-conv-table');

    const list = (conversionList || []).slice().reverse();

    if (list.length === 0) {
        body.innerHTML = '';
        table.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
    }
    table.classList.remove('hidden');
    empty.classList.add('hidden');

    body.innerHTML = list.map(c => {
        const rb = (buysList || []).find(b => String(b.buyingNo) === String(c.roughBuyingNo));
        const party = (rb && rb.partyName) || '—';
        const total = rb ? (parseFloat(rb.totalPrice) || 0) : 0;
        const pCarat = parseFloat(c.polishedCarat) || 0;
        const rate = pCarat > 0 ? total / pCarat : 0;
        const finalPrice = rate * 1.15;
        const amount = pCarat * finalPrice;
        const npPcs = parseInt(c.notPolishedPieces) || 0;
        return `<tr>
            <td>${convFmtDate(c.conversionDate)}</td>
            <td><strong class="text-primary">${c.roughBuyingNo ? '#' + c.roughBuyingNo : '—'}</strong></td>
            <td>${party}</td>
            <td>+${parseInt(c.polishPieces) || 0}</td>
            <td>${pCarat ? pCarat.toFixed(3) : '—'}</td>
            <td>${npPcs}</td>
            <td>${amount ? formatCurrency(Math.round(amount)) : '—'}</td>
        </tr>`;
    }).join('');
}

// ── Small helpers ──
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function setText(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

function convFmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch { return dateStr; }
}

function showToast(message) {
    let toast = document.getElementById('conv-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'conv-toast';
        toast.style.cssText = `
            position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
            background: #1e293b; color: #fff; padding: 12px 24px; border-radius: 10px;
            font-size: 13px; font-weight: 600; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 9999; opacity: 0; transition: opacity 0.3s ease;`;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
