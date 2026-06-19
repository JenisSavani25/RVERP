// --- PARTY MASTER MODULE ---
// Lists parties from the party master table, enriched with transaction
// aggregates (counts, purchase/sale totals, receivable/payable). Supports
// creating (name only) and editing party names. All names stored UPPERCASE.

let editingPartyId = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    loadSalesData();
    loadBuysData();
    loadPolishSalesData();
    loadPolishBuysData();
    loadBoxSellingData();

    const today = new Date();
    document.getElementById("current-date-display").textContent =
        formatDateToLocale(today.toISOString().split('T')[0]);

    document.getElementById("pm-name").addEventListener("input", (e) => {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
    });

    renderPartyMaster("");
});

function getPaidTotal(entry) {
    return (entry.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
}

// Build aggregated party map keyed by UPPERCASE name.
// Seeds from the party master table so parties with no transactions show too.
function buildPartyMap() {
    const parties = {};

    function ensure(name, id) {
        const key = (name || "").trim().toUpperCase();
        if (!key) return null;
        if (!parties[key]) {
            parties[key] = { id: id ?? null, name: key, txns: 0, purchases: 0, sales: 0, receivable: 0, payable: 0 };
        } else if (id != null && parties[key].id == null) {
            parties[key].id = id;
        }
        return parties[key];
    }

    (partiesList || []).forEach(p => ensure(p.name, p.id));

    function addBuy(entry) {
        const p = ensure(entry.partyName);
        if (!p) return;
        const amount = parseFloat(entry.finalAmount) || 0;
        const paid = getPaidTotal(entry);
        p.txns++;
        p.purchases += amount;
        p.payable += Math.max(0, amount - paid);
    }

    function addSale(entry) {
        const p = ensure(entry.partyName);
        if (!p) return;
        const amount = parseFloat(entry.finalAmount) || 0;
        const paid = getPaidTotal(entry);
        p.txns++;
        p.sales += amount;
        p.receivable += Math.max(0, amount - paid);
    }

    buysList.forEach(addBuy);
    polishBuysList.forEach(addBuy);
    salesList.forEach(addSale);
    polishSalesList.forEach(addSale);
    boxSellingList.forEach(addSale);

    return Object.values(parties).sort((a, b) => a.name.localeCompare(b.name));
}

function renderPartyMaster(query) {
    const q = (query || "").trim().toLowerCase();
    const all = buildPartyMap();

    document.getElementById("pm-total").textContent = all.length;
    document.getElementById("pm-receivable").textContent =
        formatCurrency(Math.round(all.reduce((s, p) => s + p.receivable, 0)));
    document.getElementById("pm-payable").textContent =
        formatCurrency(Math.round(all.reduce((s, p) => s + p.payable, 0)));

    const rows = all.filter(p => !q || p.name.toLowerCase().includes(q));

    const tbody = document.getElementById("party-master-body");
    const emptyEl = document.getElementById("pm-empty");
    tbody.innerHTML = "";

    if (rows.length === 0) {
        emptyEl.classList.remove("hidden");
        return;
    }
    emptyEl.classList.add("hidden");

    tbody.innerHTML = rows.map(p => {
        const clickable = p.id != null;
        const attrs = clickable ? `style="cursor:pointer;" title="Click to edit" onclick="editParty(${p.id})"` : "";
        return `<tr ${attrs}>
        <td class="font-bold">${p.name}</td>
        <td class="text-right font-mono">${p.txns}</td>
        <td class="text-right font-mono">${formatCurrency(Math.round(p.purchases))}</td>
        <td class="text-right font-mono">${formatCurrency(Math.round(p.sales))}</td>
        <td class="text-right font-mono ${p.receivable > 0 ? 'text-orange font-bold' : ''}">${formatCurrency(Math.round(p.receivable))}</td>
        <td class="text-right font-mono ${p.payable > 0 ? 'text-danger font-bold' : ''}">${formatCurrency(Math.round(p.payable))}</td>
    </tr>`;
    }).join('');
}

function editParty(id) {
    const p = (partiesList || []).find(x => x.id === id);
    if (!p) return;
    editingPartyId = id;
    document.getElementById("pm-name").value = (p.name || "").toUpperCase();
    document.getElementById("pm-form-title").textContent = `Edit Party`;
    document.getElementById("pm-submit-btn").textContent = "💾 Update Party";
    document.getElementById("pm-cancel-btn").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelPartyEdit() {
    editingPartyId = null;
    document.getElementById("party-master-form").reset();
    document.getElementById("pm-form-title").textContent = "Create Party";
    document.getElementById("pm-submit-btn").textContent = "➕ Create Party";
    document.getElementById("pm-cancel-btn").classList.add("hidden");
}

async function savePartyEntry(event) {
    event.preventDefault();
    const name = document.getElementById("pm-name").value.trim().toUpperCase();
    if (!name) {
        alert("Party name is required.");
        return;
    }

    try {
        if (editingPartyId !== null) {
            await updatePartyOnServer(editingPartyId, { name });
        } else {
            await savePartyOnServer({ name });
        }
        isLoadedFromServer = false;
        await loadAllDataFromServer();
        cancelPartyEdit();
        renderPartyMaster(document.getElementById("pm-search").value || "");
    } catch (e) {
        alert("Could not save this party.\n\n" + e.message);
    }
}
