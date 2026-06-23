// --- TRANSFER MANAGEMENT LOGIC ---

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    loadTransferData();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById("transfer-date").value = today;

    setNextTransferNumber();
    populateSelections();
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

function getPolishAvailAtLocation(loc) {
    const polishLots = getPolishStockDistribution();
    const lot = polishLots.POLISH || {};
    return parseInt(lot[loc]) || 0;
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
    if (searchInput) searchInput.value = "";

    if (itemType === "Polish") {
        handlePolishShapeChange();
    } else {
        const dabbiContainer = document.getElementById("dabbi-list-container");
        dabbiContainer.innerHTML = "";

        const dabbis = getDabbiStockDistribution();
        let added = 0;

        const sortedDabbiIds = Object.keys(dabbis).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedDabbiIds.forEach(boxId => {
            const box = dabbis[boxId];
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

function handlePolishShapeChange() {
    const fromLoc = document.getElementById("from-location").value;
    const shapeName = document.getElementById("polish-shape-name").value;
    const availHint = document.getElementById("polish-avail-hint");
    const caratHint = document.getElementById("polish-carat-hint");
    const qtyInput = document.getElementById("polish-quantity");
    const caratInput = document.getElementById("polish-carat");

    let availPcs = 0;
    let availCt = 0;

    if (fromLoc === "Mumbai" && shapeName) {
        const avail = getPolishShapeMumbaiAvail(shapeName);
        availPcs = avail.pcs;
        availCt = avail.carat;
    } else {
        availPcs = getPolishAvailAtLocation(fromLoc);
    }

    availHint.textContent = `Available in ${fromLoc}: ${availPcs} pcs`;
    if (caratHint) {
        caratHint.textContent = fromLoc === "Mumbai" && shapeName
            ? `Available: ${availCt.toFixed(2)} ct`
            : "Enter carat for this transfer";
    }

    qtyInput.max = availPcs > 0 ? availPcs : "";

    const qty = parseInt(qtyInput.value) || 0;
    if (availPcs > 0 && qty > availPcs) {
        qtyInput.value = availPcs;
    }

    if (caratInput && fromLoc === "Mumbai" && shapeName && availCt > 0) {
        const ct = parseFloat(caratInput.value) || 0;
        if (ct > availCt) caratInput.value = availCt.toFixed(3);
    }
}

function updateDabbiSelectedCount() {
    const container = document.getElementById("dabbi-list-container");
    const checked = container.querySelectorAll("input[type='checkbox']:checked");
    document.getElementById("dabbi-count-hint").textContent = `Selected: ${checked.length} boxes`;
}

function formatPolishTransferDetail(t) {
    const shape = (t.shapeName || "").trim().toUpperCase();
    const qty = parseInt(t.quantity) || 0;
    const ct = parseFloat(t.carat) || 0;
    const ctStr = ct > 0 ? ` / ${ct.toFixed(2)} ct` : "";
    if (shape) return `${shape} — ${qty} pcs${ctStr}`;
    if (qty > 0) return `${qty} pcs${ctStr}`;
    return "—";
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
        transferNo,
        date,
        itemType,
        fromLocation,
        toLocation,
        remarks,
        createdAt: new Date().toISOString()
    };

    if (itemType === "Polish") {
        const shapeName = document.getElementById("polish-shape-name").value;
        const fromLocation = document.getElementById("from-location").value;
        const qty = parseInt(document.getElementById("polish-quantity").value) || 0;
        const carat = parseFloat(document.getElementById("polish-carat").value) || 0;

        let availPcs = 0;
        let availCt = 0;
        if (fromLocation === "Mumbai" && shapeName) {
            const avail = getPolishShapeMumbaiAvail(shapeName);
            availPcs = avail.pcs;
            availCt = avail.carat;
        } else {
            availPcs = getPolishAvailAtLocation(fromLocation);
        }

        if (!shapeName || !POLISH_SHAPE_OPTIONS.includes(shapeName)) {
            alert("Please select a valid shape from the list.");
            return;
        }
        if (qty <= 0) {
            alert("Transfer quantity must be greater than zero.");
            return;
        }
        if (carat <= 0) {
            alert("Transfer carat must be greater than zero.");
            return;
        }
        if (qty > availPcs) {
            alert(`Insufficient stock! Maximum available in ${fromLocation} is ${availPcs} pcs.`);
            return;
        }
        if (fromLocation === "Mumbai" && carat > availCt + 0.0001) {
            alert(`Insufficient carat! Maximum available is ${availCt.toFixed(2)} ct.`);
            return;
        }

        newTransfer.shapeName = shapeName;
        newTransfer.quantity = qty;
        newTransfer.carat = carat;
    } else {
        const container = document.getElementById("dabbi-list-container");
        const checked = container.querySelectorAll("input[type='checkbox']:checked");

        if (checked.length === 0) {
            alert("Please select at least one Dabbi box to transfer.");
            return;
        }

        newTransfer.boxIds = [];
        checked.forEach(chk => newTransfer.boxIds.push(chk.value));
    }

    try {
        transfersList.push(newTransfer);
        await saveTransferOnServer(newTransfer);

        alert(`Transfer ${transferNo} executed successfully!`);
        document.getElementById("transfer-remarks").value = "";
        document.getElementById("polish-shape-name").value = "";
        document.getElementById("polish-quantity").value = "";
        document.getElementById("polish-carat").value = "";

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
            tdDetails.innerHTML = `<strong>${formatPolishTransferDetail(t)}</strong>`;
        } else {
            tdDetails.textContent = `Boxes: ${t.boxIds ? t.boxIds.join(", ") : "—"} (${t.boxIds ? t.boxIds.length : 0} boxes)`;
        }

        const tdRemarks = document.createElement("td");
        tdRemarks.textContent = t.remarks || "—";
        tdRemarks.className = "text-muted";

        const tdDelete = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger btn-compact";
        delBtn.textContent = "🗑️ Delete";
        const transferKey = t.id != null ? t.id : t.transferNo;
        delBtn.onclick = () => deleteTransferRecord(transferKey);
        tdDelete.appendChild(delBtn);

        tr.appendChild(tdDate);
        tr.appendChild(tdNo);
        tr.appendChild(tdType);
        tr.appendChild(tdFrom);
        tr.appendChild(tdTo);
        tr.appendChild(tdDetails);
        tr.appendChild(tdRemarks);
        tr.appendChild(tdDelete);

        tbody.appendChild(tr);
    });
}

async function deleteTransferRecord(key) {
    const ok = await deleteRecordWithPassword(key, 'transfers', {
        confirmMessage: "Deleting this transfer will restore stock at the source location.\n\nProceed?",
        onSuccess: () => {
            populateSelections();
            renderTransferLog();
        }
    });
    if (ok) alert("Transfer deleted successfully.");
}

function filterDabbiList() {
    const searchVal = document.getElementById("dabbi-search").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#dabbi-list-container .item-checkbox-row");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchVal) ? "flex" : "none";
    });
}
