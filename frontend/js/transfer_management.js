// --- TRANSFER MANAGEMENT LOGIC ---

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load state lists
    loadTransferData();
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("transfer-date").value = today;

    // Set next transfer number
    setNextTransferNumber();

    // Populate the dropdowns and selection lists
    populateSelections();

    // Render transfer history
    renderTransferLog();
});

function setNextTransferNumber() {
    let maxNum = 0;
    transfersList.forEach(t => {
        if (t.transferNo && t.transferNo.startsWith("TR-")) {
            const num = parseInt(t.transferNo.replace("TR-", "")) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    document.getElementById("transfer-no").value = `TR-${String(nextNum).padStart(3, '0')}`;
}

function handleLocationChange() {
    const fromLoc = document.getElementById("from-location").value;
    const toLocInput = document.getElementById("to-location");
    
    if (fromLoc === "Surat") {
        toLocInput.value = "Mumbai";
    } else {
        toLocInput.value = "Surat";
    }

    populateSelections();
}

function handleItemTypeChange() {
    const itemType = document.getElementById("item-type").value;
    const polishArea = document.getElementById("polish-selection-area");
    const dabbiArea = document.getElementById("dabbi-selection-area");

    if (itemType === "Polish") {
        polishArea.classList.remove("hidden");
        dabbiArea.classList.add("hidden");
    } else {
        polishArea.classList.add("hidden");
        dabbiArea.classList.remove("hidden");
    }

    populateSelections();
}

function populateSelections() {
    const fromLoc = document.getElementById("from-location").value;
    const itemType = document.getElementById("item-type").value;

    const searchInput = document.getElementById("dabbi-search");
    if (searchInput) {
        searchInput.value = "";
    }

    if (itemType === "Polish") {
        const lotSelect = document.getElementById("polish-lot-id");
        lotSelect.innerHTML = "";

        const polishLots = getPolishStockDistribution();
        let added = 0;

        // Sort lot IDs alphabetically/numerically
        const sortedLotIds = Object.keys(polishLots).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedLotIds.forEach(lotId => {
            const lot = polishLots[lotId];
            const availQty = lot[fromLoc] || 0;
            if (availQty > 0) {
                const opt = document.createElement("option");
                opt.value = lotId;
                opt.textContent = `Polish Diamonds (Avail in ${fromLoc}: ${availQty} pcs)`;
                opt.dataset.avail = availQty;
                lotSelect.appendChild(opt);
                added++;
            }
        });

        if (added === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = `No available Polish lots in ${fromLoc}`;
            opt.dataset.avail = 0;
            lotSelect.appendChild(opt);
        }

        handlePolishLotChange();
    } else {
        const dabbiContainer = document.getElementById("dabbi-list-container");
        dabbiContainer.innerHTML = "";

        const dabbis = getDabbiStockDistribution();
        let added = 0;

        // Sort dabbi/boxes by ID
        const sortedDabbiIds = Object.keys(dabbis).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedDabbiIds.forEach(boxId => {
            const box = dabbis[boxId];
            // Box must be in From Location and Available (not sold, not issued to vendor)
            if (box.location === fromLoc && box.status === "Available") {
                const row = document.createElement("div");
                row.className = "item-checkbox-row";

                const chk = document.createElement("input");
                chk.type = "checkbox";
                chk.id = `chk-box-${boxId}`;
                chk.value = boxId;
                chk.onchange = updateDabbiSelectedCount;

                const lbl = document.createElement("label");
                lbl.htmlFor = `chk-box-${boxId}`;
                
                const boxInfo = document.createElement("span");
                boxInfo.textContent = `📦 Box: ${boxId} | ${box.shape1 || '—'} | ${box.carat.toFixed(2)} ct`;
                
                const boxVal = document.createElement("span");
                boxVal.textContent = formatCurrency(box.mValue);
                boxVal.className = "font-semibold text-muted";

                lbl.appendChild(boxInfo);
                lbl.appendChild(boxVal);

                row.appendChild(chk);
                row.appendChild(lbl);

                dabbiContainer.appendChild(row);
                added++;
            }
        });

        if (added === 0) {
            dabbiContainer.innerHTML = `<div class="text-center text-muted p-md">No available Dabbis in ${fromLoc}</div>`;
        }

        updateDabbiSelectedCount();
    }
}

function handlePolishLotChange() {
    const lotSelect = document.getElementById("polish-lot-id");
    const availHint = document.getElementById("polish-avail-hint");
    const qtyInput = document.getElementById("polish-quantity");

    if (lotSelect.selectedIndex === -1) {
        availHint.textContent = "Available: 0";
        qtyInput.max = 0;
        qtyInput.value = "";
        return;
    }

    const selectedOpt = lotSelect.options[lotSelect.selectedIndex];
    const avail = parseInt(selectedOpt.dataset.avail) || 0;

    availHint.textContent = `Available in location: ${avail}`;
    qtyInput.max = avail;
    if (avail > 0) {
        qtyInput.value = Math.min(avail, parseInt(qtyInput.value) || 1);
    } else {
        qtyInput.value = "";
    }
}

function updateDabbiSelectedCount() {
    const container = document.getElementById("dabbi-list-container");
    const checked = container.querySelectorAll("input[type='checkbox']:checked");
    document.getElementById("dabbi-count-hint").textContent = `Selected: ${checked.length} boxes`;
}

async function saveTransferEntry(event) {
    event.preventDefault();

    const transferNo = document.getElementById("transfer-no").value;
    const date = document.getElementById("transfer-date").value;
    const fromLocation = document.getElementById("from-location").value;
    const toLocation = document.getElementById("to-location").value;
    const itemType = document.getElementById("item-type").value;
    const remarks = document.getElementById("transfer-remarks").value.trim();

    if (fromLocation === toLocation) {
        alert("From and To locations cannot be the same!");
        return;
    }

    const newTransfer = {
        transferNo: transferNo,
        date: date,
        itemType: itemType,
        fromLocation: fromLocation,
        toLocation: toLocation,
        remarks: remarks,
        createdAt: new Date().toISOString()
    };

    if (itemType === "Polish") {
        const lotSelect = document.getElementById("polish-lot-id");
        if (!lotSelect.value) {
            alert("Please select a valid Polish lot to transfer.");
            return;
        }

        const selectedOpt = lotSelect.options[lotSelect.selectedIndex];
        const avail = parseInt(selectedOpt.dataset.avail) || 0;
        const qty = parseInt(document.getElementById("polish-quantity").value) || 0;

        if (qty <= 0) {
            alert("Transfer quantity must be greater than zero.");
            return;
        }

        if (qty > avail) {
            alert(`Insufficient stock! Maximum available is ${avail} pcs.`);
            return;
        }

        newTransfer.lotId = lotSelect.value;
        newTransfer.quantity = qty;

     } else {
        const container = document.getElementById("dabbi-list-container");
        const checked = container.querySelectorAll("input[type='checkbox']:checked");
        
        if (checked.length === 0) {
            alert("Please select at least one Dabbi box to transfer.");
            return;
        }

        const boxIds = [];
        checked.forEach(chk => {
            boxIds.push(chk.value);
        });

        newTransfer.boxIds = boxIds;
    }

    try {
        // Save Transfer Record
        transfersList.push(newTransfer);
        await saveTransferOnServer(newTransfer);

        // Reset Form & UI
        alert(`Transfer ${transferNo} executed successfully!`);
        document.getElementById("transfer-remarks").value = "";
        
        setNextTransferNumber();
        populateSelections();
        renderTransferLog();
    } catch (e) {
        transfersList = transfersList.filter(item => item.transferNo !== newTransfer.transferNo);
        alert("Transfer save failed.\n\n" + e.message);
    }
}

function renderTransferLog() {
    const tbody = document.getElementById("transfer-log-body");
    const emptyState = document.getElementById("transfers-empty-state");
    tbody.innerHTML = "";

    if (transfersList.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    // Sort transfers by date descending, then by transferNo descending
    const sortedTransfers = [...transfersList].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime();
        }
        return b.transferNo.localeCompare(a.transferNo);
    });

    sortedTransfers.forEach(t => {
        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDateToLocale(t.date);

        const tdNo = document.createElement("td");
        tdNo.innerHTML = `<strong class="text-primary">${t.transferNo}</strong>`;

        const tdType = document.createElement("td");
        tdType.textContent = t.itemType;

        const tdFrom = document.createElement("td");
        tdFrom.textContent = t.fromLocation;

        const tdTo = document.createElement("td");
        tdTo.textContent = t.toLocation;

        const tdDetails = document.createElement("td");
        if (t.itemType === "Polish") {
            tdDetails.textContent = `Quantity: ${t.quantity} pcs`;
        } else {
            tdDetails.textContent = `Boxes: ${t.boxIds ? t.boxIds.join(", ") : "—"} (${t.boxIds ? t.boxIds.length : 0} boxes)`;
        }

        const tdRemarks = document.createElement("td");
        tdRemarks.textContent = t.remarks || "—";
        tdRemarks.className = "text-muted";

        tr.appendChild(tdDate);
        tr.appendChild(tdNo);
        tr.appendChild(tdType);
        tr.appendChild(tdFrom);
        tr.appendChild(tdTo);
        tr.appendChild(tdDetails);
        tr.appendChild(tdRemarks);

        tbody.appendChild(tr);
    });
}

function filterDabbiList() {
    const searchVal = document.getElementById("dabbi-search").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#dabbi-list-container .item-checkbox-row");
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchVal)) {
            row.style.display = "flex";
        } else {
            row.style.display = "none";
        }
    });
}
