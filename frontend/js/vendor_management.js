// --- VENDOR MANAGEMENT LOGIC ---

let stagedItems = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load state lists
    loadVendorData();
    loadIssueData();

    // Set default issue date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("issue-date").value = today;

    // Generate next IDs
    setNextVendorId();
    setNextIssueNo();

    // Populate selectors and lists
    populateVendorDropdown();
    handleStageTypeChange();
    renderVendorsList();
    renderConsignments();
});

function setNextVendorId() {
    let maxNum = 0;
    vendorsList.forEach(v => {
        if (v.vendorId && v.vendorId.startsWith("V")) {
            const num = parseInt(v.vendorId.replace("V", "")) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    document.getElementById("vendor-id").value = `V${String(nextNum).padStart(3, '0')}`;
}

function setNextIssueNo() {
    let maxNum = 0;
    issuesList.forEach(iss => {
        // Strip suffixes if split (e.g. ISS-001-R1)
        if (iss.issueNo && iss.issueNo.startsWith("ISS-")) {
            const cleanNo = iss.issueNo.split("-").slice(0, 2).join("-");
            const num = parseInt(cleanNo.replace("ISS-", "")) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    document.getElementById("issue-no").value = `ISS-${String(nextNum).padStart(3, '0')}`;
}

function populateVendorDropdown() {
    const dropdown = document.getElementById("issue-vendor-id");
    dropdown.innerHTML = "";

    if (vendorsList.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No vendors registered yet";
        dropdown.appendChild(opt);
        return;
    }

    vendorsList.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.vendorId;
        opt.textContent = `${v.name} (${v.vendorType} - ${v.city})`;
        dropdown.appendChild(opt);
    });
}

async function saveVendorMaster(event) {
    event.preventDefault();

    const vendorId = document.getElementById("vendor-id").value;
    const name = document.getElementById("vendor-name").value.trim();
    const vendorType = document.getElementById("vendor-type").value;
    const city = document.getElementById("vendor-city").value.trim();
    const mobile = document.getElementById("vendor-mobile").value.trim();

    if (!name || !city || !mobile) {
        alert("Please fill all required fields!");
        return;
    }

    const newVendor = {
        vendorId: vendorId,
        name: name,
        vendorType: vendorType,
        city: city,
        mobile: mobile,
        createdAt: new Date().toISOString()
    };

    try {
        vendorsList.push(newVendor);
        await saveVendorOnServer(newVendor);

        alert(`Vendor ${name} registered successfully!`);
        
        // Reset vendor form fields
        document.getElementById("vendor-name").value = "";
        document.getElementById("vendor-city").value = "";
        document.getElementById("vendor-mobile").value = "";

        setNextVendorId();
        populateVendorDropdown();
        renderVendorsList();
    } catch (e) {
        vendorsList = vendorsList.filter(item => item.vendorId !== newVendor.vendorId);
        alert("Vendor save failed.\n\n" + e.message);
    }
}

function renderVendorsList() {
    const tbody = document.getElementById("vendors-list-body");
    tbody.innerHTML = "";

    vendorsList.forEach(v => {
        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = v.vendorId;

        const tdName = document.createElement("td");
        tdName.innerHTML = `<strong>${v.name}</strong>`;

        const tdType = document.createElement("td");
        tdType.textContent = v.vendorType;

        const tdCity = document.createElement("td");
        tdCity.textContent = v.city;

        const tdMobile = document.createElement("td");
        tdMobile.textContent = v.mobile;

        tr.appendChild(tdId);
        tr.appendChild(tdName);
        tr.appendChild(tdType);
        tr.appendChild(tdCity);
        tr.appendChild(tdMobile);

        tbody.appendChild(tr);
    });
}

function handleStageTypeChange() {
    const stageType = document.getElementById("stage-type").value;
    const itemSelect = document.getElementById("stage-item-select");
    const qtyContainer = document.getElementById("stage-qty-container");
    const qtyInput = document.getElementById("stage-qty");

    itemSelect.innerHTML = "";

    if (stageType === "Polish") {
        qtyContainer.style.display = "block";
        qtyInput.value = "1";

        const polishLots = getPolishStockDistribution();
        let added = 0;

        // Sort lot IDs
        const sortedLotIds = Object.keys(polishLots).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedLotIds.forEach(lotId => {
            const lot = polishLots[lotId];
            const availInMumbai = lot.Mumbai || 0;

            // Calculate already staged qty of this lot
            const stagedQty = stagedItems
                .filter(item => item.type === "Polish" && item.lotId === lotId)
                .reduce((sum, item) => sum + item.quantity, 0);

            const netAvail = availInMumbai - stagedQty;

            if (netAvail > 0) {
                const opt = document.createElement("option");
                opt.value = lotId;
                opt.textContent = `Polish Diamonds (Avail in Mumbai: ${netAvail} pcs)`;
                opt.dataset.avail = netAvail;
                itemSelect.appendChild(opt);
                added++;
            }
        });

        if (added === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No available Polish lots in Mumbai";
            opt.dataset.avail = 0;
            itemSelect.appendChild(opt);
        }
    } else {
        qtyContainer.style.display = "none";
        qtyInput.value = "1";

        const dabbis = getDabbiStockDistribution();
        let added = 0;

        // Sort boxes
        const sortedDabbiIds = Object.keys(dabbis).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        sortedDabbiIds.forEach(boxId => {
            const box = dabbis[boxId];
            // Must be physically in Mumbai, and not already staged
            const isStaged = stagedItems.some(item => item.type === "Dabbi" && item.id === boxId);

            if (box.location === "Mumbai" && box.status === "Available" && !isStaged) {
                const opt = document.createElement("option");
                opt.value = boxId;
                opt.textContent = `Box ${boxId} (${box.shape1 || '—'} - ${box.carat.toFixed(2)} ct)`;
                opt.dataset.avail = 1;
                itemSelect.appendChild(opt);
                added++;
            }
        });

        if (added === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No available Dabbis in Mumbai";
            opt.dataset.avail = 0;
            itemSelect.appendChild(opt);
        }
    }

    handleStageItemChange();
}

function handleStageItemChange() {
    const itemSelect = document.getElementById("stage-item-select");
    const availHint = document.getElementById("stage-avail-hint");
    const qtyInput = document.getElementById("stage-qty");

    if (itemSelect.selectedIndex === -1 || !itemSelect.value) {
        availHint.textContent = "Avail: 0";
        qtyInput.max = 0;
        qtyInput.value = "";
        return;
    }

    const selectedOpt = itemSelect.options[itemSelect.selectedIndex];
    const avail = parseInt(selectedOpt.dataset.avail) || 0;

    availHint.textContent = `Avail: ${avail}`;
    qtyInput.max = avail;
    if (avail > 0) {
        qtyInput.value = Math.min(avail, parseInt(qtyInput.value) || 1);
    } else {
        qtyInput.value = "";
    }
}

function addItemToStagedList() {
    const type = document.getElementById("stage-type").value;
    const itemSelect = document.getElementById("stage-item-select");
    const itemId = itemSelect.value;
    const qtyInput = document.getElementById("stage-qty");

    if (!itemId) {
        alert("Please select a valid item to stage!");
        return;
    }

    const selectedOpt = itemSelect.options[itemSelect.selectedIndex];
    const avail = parseInt(selectedOpt.dataset.avail) || 0;

    if (type === "Polish") {
        const qty = parseInt(qtyInput.value) || 0;
        if (qty <= 0) {
            alert("Quantity must be greater than zero!");
            return;
        }
        if (qty > avail) {
            alert(`Insufficient stock in Mumbai! Max available is ${avail}`);
            return;
        }

        // Add to staged list (accumulate if already exists in staged queue)
        const existingIndex = stagedItems.findIndex(item => item.type === "Polish" && item.lotId === itemId);
        if (existingIndex !== -1) {
            stagedItems[existingIndex].quantity += qty;
        } else {
            stagedItems.push({
                type: "Polish",
                lotId: itemId,
                quantity: qty,
                label: `💎 Polish Diamonds (${qty} pcs)`
            });
        }
    } else {
        stagedItems.push({
            type: "Dabbi",
            id: itemId,
            label: `📦 Box ${itemId}`
        });
    }

    renderStagedItems();
    handleStageTypeChange(); // refresh options to deduct staged quantities
}

function removeStagedItem(idx) {
    stagedItems.splice(idx, 1);
    renderStagedItems();
    handleStageTypeChange();
}

function renderStagedItems() {
    const container = document.getElementById("staged-items-container");
    const emptyText = document.getElementById("staged-empty-text");

    // Clear previous items
    const rows = container.querySelectorAll(".staged-item");
    rows.forEach(r => r.remove());

    if (stagedItems.length === 0) {
        emptyText.style.display = "block";
        return;
    }

    emptyText.style.display = "none";

    stagedItems.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "staged-item";

        const span = document.createElement("span");
        span.textContent = item.label;
        span.className = "font-semibold";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = "&times;";
        btn.title = "Remove from staging";
        btn.onclick = () => removeStagedItem(idx);

        div.appendChild(span);
        div.appendChild(btn);
        container.appendChild(div);
    });
}

async function saveInventoryIssue(event) {
    event.preventDefault();

    const issueNo = document.getElementById("issue-no").value;
    const date = document.getElementById("issue-date").value;
    const vendorId = document.getElementById("issue-vendor-id").value;

    if (!vendorId) {
        alert("Please register and select a vendor first!");
        return;
    }

    const vendor = vendorsList.find(v => v.vendorId === vendorId);
    if (!vendor) {
        alert("Selected vendor not found!");
        return;
    }

    if (stagedItems.length === 0) {
        alert("Please stage at least one item to issue!");
        return;
    }

    const newIssue = {
        issueNo: issueNo,
        date: date,
        vendorId: vendorId,
        vendorName: vendor.name,
        items: stagedItems.map(item => {
            if (item.type === "Polish") {
                return { type: "Polish", lotId: item.lotId, quantity: item.quantity };
            } else {
                return { type: "Dabbi", id: item.id };
            }
        }),
        status: "Pending",
        resolvedDate: null,
        createdAt: new Date().toISOString()
    };

    try {
        issuesList.push(newIssue);
        await saveVendorIssueOnServer(newIssue);

        alert(`Consignment ${issueNo} issued successfully to ${vendor.name}!`);

        // Reset staged items
        stagedItems = [];
        renderStagedItems();

        setNextIssueNo();
        handleStageTypeChange();
        renderConsignments();
    } catch (e) {
        issuesList = issuesList.filter(item => item.issueNo !== newIssue.issueNo);
        alert("Consignment save failed.\n\n" + e.message);
    }
}

function renderConsignments() {
    const tbody = document.getElementById("consignments-tbody");
    const emptyState = document.getElementById("consignments-empty");
    tbody.innerHTML = "";

    const pendingIssues = issuesList.filter(iss => iss.status === "Pending");

    if (pendingIssues.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    // Sort pending issues by date descending, then by issueNo descending
    const sortedIssues = [...pendingIssues].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB.getTime() !== dateA.getTime()) {
            return dateB.getTime() - dateA.getTime();
        }
        return b.issueNo.localeCompare(a.issueNo);
    });

    sortedIssues.forEach(iss => {
        // Calculate aging days
        const issueDate = new Date(iss.date);
        const today = new Date();
        // Zero out times for date-only comparison
        issueDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);

        const diffTime = today - issueDate;
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        let agingClass = "green";
        if (diffDays > 30) {
            agingClass = "red";
        } else if (diffDays > 15) {
            agingClass = "orange";
        }

        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDateToLocale(iss.date);

        const tdNo = document.createElement("td");
        tdNo.innerHTML = `<strong class="text-primary">${iss.issueNo}</strong>`;

        const tdVendor = document.createElement("td");
        tdVendor.innerHTML = `<strong>${iss.vendorName}</strong>`;

        const tdAging = document.createElement("td");
        tdAging.innerHTML = `<span class="aging-badge ${agingClass}">${diffDays} days</span>`;

        const tdItems = document.createElement("td");
        
        iss.items.forEach(item => {
            const itemRow = document.createElement("div");
            itemRow.className = "issue-item-row";

            const itemText = document.createElement("span");
            if (item.type === "Polish") {
                itemText.textContent = `💎 Polish — Qty: ${item.quantity} pcs`;
            } else {
                itemText.textContent = `📦 Box: ${item.id}`;
            }
            itemText.className = "font-semibold";

            const actionsDiv = document.createElement("div");

            const returnBtn = document.createElement("button");
            returnBtn.className = "item-action-btn return-btn";
            returnBtn.textContent = "Return";
            returnBtn.title = "Mark as returned to Mumbai Stock";
            returnBtn.onclick = () => returnConsignedItem(iss.issueNo, item);

            const soldBtn = document.createElement("button");
            soldBtn.className = "item-action-btn sold-btn";
            soldBtn.textContent = "Mark Sold";
            soldBtn.title = "Convert to sale entry in ERP";
            soldBtn.onclick = () => sellConsignedItem(iss.issueNo, iss.vendorName, item);

            actionsDiv.appendChild(returnBtn);
            actionsDiv.appendChild(soldBtn);

            itemRow.appendChild(itemText);
            itemRow.appendChild(actionsDiv);
            tdItems.appendChild(itemRow);
        });

        tr.appendChild(tdDate);
        tr.appendChild(tdNo);
        tr.appendChild(tdVendor);
        tr.appendChild(tdAging);
        tr.appendChild(tdItems);

        tbody.appendChild(tr);
    });
}

async function returnConsignedItem(issueNo, itemToReturn) {
    if (!confirm("Are you sure this item has been returned physically to Mumbai stock?")) {
        return;
    }

    const idx = issuesList.findIndex(iss => iss.issueNo === issueNo);
    if (idx === -1) return;

    const iss = issuesList[idx];
    let isSplit = false;
    let returnedIssue = null;

    // If the issue has only this item, just mark the whole issue as Returned
    if (iss.items.length === 1) {
        iss.status = "Returned";
        iss.resolvedDate = new Date().toISOString().split('T')[0];
    } else {
        // If multiple items, remove it from this issue and create a new separate Returned issue record
        iss.items = iss.items.filter(item => {
            if (itemToReturn.type === "Polish") {
                return !(item.type === "Polish" && item.lotId === itemToReturn.lotId);
            } else {
                return !(item.type === "Dabbi" && item.id === itemToReturn.id);
            }
        });

        returnedIssue = {
            issueNo: `${iss.issueNo}-R${Date.now().toString().slice(-4)}`,
            date: iss.date,
            vendorId: iss.vendorId,
            vendorName: iss.vendorName,
            items: [itemToReturn],
            status: "Returned",
            resolvedDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        issuesList.push(returnedIssue);
        isSplit = true;
    }

    try {
        await updateVendorIssueOnServer(iss);
        if (isSplit && returnedIssue) {
            await saveVendorIssueOnServer(returnedIssue);
        }
        
        alert("Item marked as returned successfully and added back to Mumbai Stock!");
        renderConsignments();
        handleStageTypeChange();
    } catch (e) {
        alert("Could not update consignment return status.\n\n" + e.message);
    }
}

function sellConsignedItem(issueNo, vendorName, itemToSell) {
    // We will redirect to either polish_sales.html or box_selling.html passing URL params.
    // In addition, we need to pass the issueNo and the itemId / quantity.
    // When the sale is completed, the destination page will load the issues list, find this issue, 
    // split out this item (or mark the issue sold if it's the only item), and save it.
    
    if (itemToSell.type === "Polish") {
        const url = `polish_sales.html?sourceLocation=Mumbai&vendor=${encodeURIComponent(vendorName)}&lotId=${encodeURIComponent(itemToSell.lotId)}&quantity=${itemToSell.quantity}&issueNo=${encodeURIComponent(issueNo)}`;
        window.location.href = url;
    } else {
        const url = `box_selling.html?sourceLocation=Mumbai&vendor=${encodeURIComponent(vendorName)}&boxIds=${encodeURIComponent(itemToSell.id)}&issueNo=${encodeURIComponent(issueNo)}`;
        window.location.href = url;
    }
}
