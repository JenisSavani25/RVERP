// --- BOX SELLING ENTRY LOGIC ---

let prefilledIssueNo = null;
let prefilledSourceLocation = 'Mumbai';
let editBoxSellNo = null;
let editBoxEntry = null;

// ──────────────────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    loadBoxMakingData();
    loadBoxSellingData();
    loadIssueData();

    // Populate party/dalal dropdowns from master lists
    populateEntityDropdowns();

    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("selling-date").value = today;

    // Real-time validation
    setupRealTimeValidation();

    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam !== null && !isNaN(parseInt(editParam))) {
        populateBoxCheckboxList();
        enterEditMode(parseInt(editParam));
    } else {
        // Parse URL parameters
        parseUrlParams();
        // Populate the Box checkboxes
        populateBoxCheckboxList();
        // Initial calc pass
        toggleCurrencyMode();
        calculateFormPrices();
    }
});

function enterEditMode(no) {
    const entry = boxSellingList.find(s => parseInt(s.sellingNo) === no);
    if (!entry) {
        alert("Could not find Box Sale #" + no + " to edit. It may have been deleted.");
        parseUrlParams();
        toggleCurrencyMode();
        calculateFormPrices();
        return;
    }
    editBoxSellNo = no;
    editBoxEntry = entry;

    document.getElementById("selling-date").value = entry.sellingDate || "";
    populateEntityDropdowns(entry.partyName, entry.dalal);

    if (entry.currencyType === 'Dollar') {
        document.getElementById("currency-dollar").checked = true;
    } else {
        document.getElementById("currency-rupees").checked = true;
    }
    toggleCurrencyMode();
    if (entry.currencyType === 'Dollar') {
        document.getElementById("total-dollar").value = entry.totalDollar || "";
        document.getElementById("dollar-rate").value = entry.dollarRate || "";
    } else {
        document.getElementById("price").value = entry.price || "";
    }

    document.getElementById("discount").value = entry.discount || 0;
    document.getElementById("dalali-pct").value = entry.dalali || 0;
    document.getElementById("bill-percentage").value = entry.billPercentage || 0;
    document.getElementById("deadline-days").value = entry.deadlineDays || 30;

    // The box composition cannot change on edit; seed the fixed carat value
    const caratInput = document.getElementById("box-carat-value");
    if (caratInput) caratInput.value = entry.carat || 0;

    const initType = document.getElementById("initial-payment-type");
    if (initType) { initType.value = "Pending"; initType.disabled = true; }
    const initRecv = document.getElementById("initial-received");
    if (initRecv) { initRecv.value = 0; initRecv.disabled = true; }

    const boxContainer = document.getElementById("box-list-container");
    if (boxContainer) {
        boxContainer.innerHTML = `<div class="text-muted" style="padding:10px;">Box composition cannot be changed when editing. Editing invoice details only.<br>Boxes in this sale: <strong>${entry.boxId || '—'}</strong></div>`;
    }

    calculateFormPrices();

    const title = document.getElementById("page-title");
    if (title) title.textContent = `Edit Box Sale #${entry.sellingNo}`;
    const submitBtn = document.querySelector('#box-sell-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "💾 Update Box Sale Entry";
}

// ──────────────────────────────────────────────────────────────────────────────
// PARSE URL PARAMS
// ──────────────────────────────────────────────────────────────────────────────
function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    
    const vendor = params.get("vendor");
    const issueNo = params.get("issueNo");

    if (vendor) {
        fillNameSelect("dalal", getDalalNameOptions(), vendor);
    }
    
    if (issueNo) {
        prefilledIssueNo = issueNo;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// POPULATE BOX CHECKBOX LIST
// ──────────────────────────────────────────────────────────────────────────────
function populateBoxCheckboxList() {
    const container = document.getElementById("box-list-container");
    container.innerHTML = "";

    const params = new URLSearchParams(window.location.search);
    const boxIdsParam = params.get("boxIds");
    let prefilledBoxIds = [];
    if (boxIdsParam) {
        prefilledBoxIds = boxIdsParam.split(",");
    }

    const dabbis = getDabbiStockDistribution();
    let added = 0;

    if (boxMakingList.length === 0) {
        document.getElementById("no-boxes-warning").classList.remove("hidden");
        container.innerHTML = `<div class="text-center text-muted p-md">No boxes registered — please use Box Making first</div>`;
        return;
    }

    const selectedLoc = 'Mumbai';

    // Sort boxes
    const sortedDabbiIds = Object.keys(dabbis).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedDabbiIds.forEach(boxId => {
        const box = dabbis[boxId];
        const isPrefilled = prefilledBoxIds.includes(boxId);
        
        // Show if:
        // 1. It is prefilled from the URL (even if its status is 'Issued', since it's the one being sold)
        // 2. Or, it is currently Available and is in Mumbai (sales always from Mumbai)
        if (isPrefilled || (box.status === "Available" && box.location === selectedLoc)) {
            const row = document.createElement("div");
            row.className = "item-checkbox-row";

            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.id = `chk-sell-box-${boxId}`;
            chk.value = boxId;
            chk.onchange = onBoxSelectionChange;

            if (isPrefilled) {
                chk.checked = true;
            }

            const lbl = document.createElement("label");
            lbl.htmlFor = `chk-sell-box-${boxId}`;
            
            const boxInfo = document.createElement("span");
            boxInfo.textContent = `Box: ${boxId} | ${box.carat.toFixed(2)} ct`;

            lbl.appendChild(boxInfo);

            row.appendChild(chk);
            row.appendChild(lbl);

            container.appendChild(row);
            added++;
        }
    });

    if (added === 0) {
        container.innerHTML = `<div class="text-center text-muted p-md">No available boxes to sell</div>`;
    }

    onBoxSelectionChange();
}

// ──────────────────────────────────────────────────────────────────────────────
// ON BOX SELECTION CHANGE
// ──────────────────────────────────────────────────────────────────────────────
function onBoxSelectionChange() {
    const container = document.getElementById("box-list-container");
    const checked = container.querySelectorAll("input[type='checkbox']:checked");
    
    document.getElementById("box-count-hint").textContent = `Selected: ${checked.length} boxes`;
    document.getElementById("bdc-selected-count").textContent = `${checked.length} Selected`;

    const card = document.getElementById("box-details-card");
    const caratBadge = document.getElementById("carat-info-badge");
    const caratInput = document.getElementById("box-carat-value");
    const tbody = document.getElementById("bdc-selected-boxes-tbody");
    
    tbody.innerHTML = "";

    if (checked.length === 0) {
        card.classList.add("hidden");
        caratBadge.classList.add("hidden");
        caratInput.value = "0";
        calculateFormPrices();
        return;
    }

    const dabbis = getDabbiStockDistribution();
    let totalCarat = 0;
    let totalMValue = 0;

    checked.forEach(chk => {
        const boxId = chk.value;
        const box = dabbis[boxId];
        
        if (box) {
            totalCarat += box.carat;
            totalMValue += box.mValue;

            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.innerHTML = `<strong class="box-badge">${box.boxId}</strong>`;

            const tdShape = document.createElement("td");
            tdShape.textContent = box.shape1 || "—";

            const tdPurity = document.createElement("td");
            tdPurity.textContent = box.purity || "—";

            const tdMM = document.createElement("td");
            tdMM.textContent = box.mm || "—";

            const tdCarat = document.createElement("td");
            tdCarat.className = "num";
            tdCarat.textContent = `${box.carat.toFixed(2)} ct`;

            const tdMValue = document.createElement("td");
            tdMValue.className = "num num-highlight";
            tdMValue.textContent = formatCurrency(box.mValue);

            tr.appendChild(tdId);
            tr.appendChild(tdShape);
            tr.appendChild(tdPurity);
            tr.appendChild(tdMM);
            tr.appendChild(tdCarat);
            tr.appendChild(tdMValue);
            
            tbody.appendChild(tr);
        }
    });

    // Update aggregate details
    document.getElementById("bdc-total-carat").textContent = `${totalCarat.toFixed(2)} ct`;
    document.getElementById("bdc-total-mvalue").textContent = formatCurrency(totalMValue);
    
    document.getElementById("carat-badge-val").textContent = totalCarat.toFixed(2);
    caratInput.value = totalCarat.toString();

    card.classList.remove("hidden");
    caratBadge.classList.remove("hidden");

    calculateFormPrices();
}

// ──────────────────────────────────────────────────────────────────────────────
// CURRENCY TOGGLE
// ──────────────────────────────────────────────────────────────────────────────
function toggleCurrencyMode() {
    const isDollar        = document.getElementById("currency-dollar").checked;
    const dollarContainer = document.getElementById("dollar-fields-container");
    const rupeesContainer = document.getElementById("rupees-fields-container");
    const priceInput      = document.getElementById("price");

    if (isDollar) {
        dollarContainer.classList.remove("hidden");
        rupeesContainer.classList.add("hidden");
        priceInput.readOnly = true;
    } else {
        dollarContainer.classList.add("hidden");
        rupeesContainer.classList.remove("hidden");
        priceInput.readOnly = false;
        document.getElementById("total-dollar").value  = "";
        document.getElementById("dollar-rate").value   = "";
        document.getElementById("price-auto").value    = "";
    }
    calculateFormPrices();
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN CALCULATION (identical logic to Polish Sales, 1.5% GST)
// ──────────────────────────────────────────────────────────────────────────────
function calculateFormPrices() {
    const carat    = parseFloat(document.getElementById("box-carat-value").value) || 0;
    const isDollar = document.getElementById("currency-dollar").checked;

    let price = 0;

    if (isDollar) {
        const totalDollar = parseFloat(document.getElementById("total-dollar").value) || 0;
        const dollarRate  = parseFloat(document.getElementById("dollar-rate").value)  || 0;
        price = calculatePrice(totalDollar, dollarRate);
        document.getElementById("price").value      = price > 0 ? Math.round(price) : "";
        document.getElementById("price-auto").value = price > 0 ? Math.round(price) : "";
    } else {
        price = parseFloat(document.getElementById("price").value) || 0;
    }

    // Total Price = Carat × Price
    const totalPrice = calculateTotalPrice(carat, price);
    document.getElementById("total-price").value = formatCurrency(totalPrice);

    // Discount
    const discountPct    = parseFloat(document.getElementById("discount").value) || 0;
    const discountAmount = calculateDiscountAmount(totalPrice, discountPct);
    const discountedAmt  = calculateDiscountedAmount(totalPrice, discountAmount);
    document.getElementById("discounted-amount").value = formatCurrency(discountedAmt);

    // Dalali
    const dalaliPct    = parseFloat(document.getElementById("dalali-pct").value) || 0;
    const dalaliAmount = calculateDalaliAmount(discountedAmt, dalaliPct);
    document.getElementById("dalali-amount").value = formatCurrency(dalaliAmount);

    // Bill / Cash split
    const billPct    = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount = calculateBillAmount(discountedAmt, billPct);
    const cashAmount = calculateCashAmount(discountedAmt, billAmount);

    // GST 1.5% on Bill (same as Polish Sales)
    const gstAmount    = calculateGST(billAmount, 0.015);
    const netBillAmt   = calculateNetBillAmount(billAmount, gstAmount);
    const netCashAmt   = cashAmount;

    // Final Amount = Net Bill + Net Cash + Dalali
    const finalAmount = calculateFinalAmount(netBillAmt, netCashAmt, dalaliAmount);

    // Update Split Box labels
    document.getElementById("label-bill-amt").textContent         = formatCurrency(billAmount);
    document.getElementById("label-cash-amt").textContent         = formatCurrency(cashAmount);
    document.getElementById("label-dalali-amt-split").textContent = formatCurrency(dalaliAmount);
    document.getElementById("gst-amount").value                   = formatCurrency(gstAmount);
    document.getElementById("label-net-bill").textContent         = formatCurrency(netBillAmt);
    document.getElementById("label-net-cash").textContent         = formatCurrency(netCashAmt);
    document.getElementById("label-final-amount").textContent     = formatCurrency(finalAmount);

    // Deadline date
    const sellingDateStr = document.getElementById("selling-date").value;
    const deadlineDays   = parseInt(document.getElementById("deadline-days").value) || 0;
    if (sellingDateStr) {
        const dl = calculateDeadlineDate(sellingDateStr, deadlineDays);
        document.getElementById("deadline-date-display").value = formatDateToLocale(dl);
    } else {
        document.getElementById("deadline-date-display").value = "-";
    }

    // Outstanding balance
    const initialReceived = parseFloat(document.getElementById("initial-received").value) || 0;
    const outstanding     = calculateOutstandingAmount(finalAmount, initialReceived);
    document.getElementById("initial-outstanding").textContent = formatCurrency(outstanding);
}

// ──────────────────────────────────────────────────────────────────────────────
// REAL-TIME VALIDATION
// ──────────────────────────────────────────────────────────────────────────────
function setupRealTimeValidation() {
    const numericInputs = [
        { id: "total-dollar",     integer: true },
        { id: "dollar-rate",      decimals: 2 },
        { id: "price",            integer: true },
        { id: "discount",         decimals: 1, max: 100 },
        { id: "dalali-pct",       decimals: 2, max: 100 },
        { id: "bill-percentage",  decimals: 1, max: 100 },
        { id: "initial-received", integer: true },
        { id: "deadline-days",    integer: true }
    ];

    numericInputs.forEach(item => {
        const input = document.getElementById(item.id);
        if (!input) return;
        input.addEventListener("input", () => {
            let val = parseFloat(input.value);
            if (val < 0) {
                input.value = 0;
                showFieldError(input, "Negative values are not allowed");
            } else {
                clearFieldError(input);
            }
            if (item.max && val > item.max) {
                input.value = item.max;
                showFieldError(input, `Maximum limit is ${item.max}%`);
            }
            if (input.value !== "" && !isNaN(val) && item.integer) {
                input.value = Math.round(val);
            }
        });
    });
}

function showFieldError(input, message) {
    input.classList.add("invalid-input");
    input.title = message;
    let errSpan = input.parentNode.querySelector(".error-msg");
    if (!errSpan) {
        errSpan = document.createElement("span");
        errSpan.className = "error-msg text-danger";
        errSpan.style.fontSize = "10px";
        errSpan.style.marginTop = "2px";
        input.parentNode.appendChild(errSpan);
    }
    errSpan.textContent = message;
}

function clearFieldError(input) {
    input.classList.remove("invalid-input");
    input.title = "";
    const errSpan = input.parentNode.querySelector(".error-msg");
    if (errSpan) errSpan.remove();
}

// ──────────────────────────────────────────────────────────────────────────────
// FORM VALIDATION
// ──────────────────────────────────────────────────────────────────────────────
function validateForm() {
    let isValid = true;

    // Checkbox selections (skipped in edit mode — box composition is fixed)
    if (editBoxSellNo === null) {
        const container = document.getElementById("box-list-container");
        const checked = container.querySelectorAll("input[type='checkbox']:checked");

        if (checked.length === 0) {
            container.style.borderColor = "var(--color-danger, #ef4444)";
            alert("Please select at least one Dabbi box to sell.");
            isValid = false;
        } else {
            container.style.borderColor = "#cbd5e1";
        }
    }

    // Selling Date
    const dateInput = document.getElementById("selling-date");
    if (!dateInput.value) {
        showFieldError(dateInput, "Selling Date is required.");
        isValid = false;
    } else { clearFieldError(dateInput); }

    // Dalal
    const dalalInput = document.getElementById("dalal");
    if (!dalalInput.value.trim()) {
        showFieldError(dalalInput, "Dalal name is required.");
        isValid = false;
    } else { clearFieldError(dalalInput); }

    // Party Name
    const partyInput = document.getElementById("party-name");
    if (!partyInput.value.trim()) {
        showFieldError(partyInput, "Party Name is required.");
        isValid = false;
    } else { clearFieldError(partyInput); }

    // Carat must be > 0
    const carat = parseFloat(document.getElementById("box-carat-value").value) || 0;
    if (carat <= 0) {
        isValid = false;
    }

    // Price validation
    const isDollar = document.getElementById("currency-dollar").checked;
    if (isDollar) {
        const totalDollarInput = document.getElementById("total-dollar");
        const dollarRateInput  = document.getElementById("dollar-rate");
        const totalDollar = parseFloat(totalDollarInput.value);
        const dollarRate  = parseFloat(dollarRateInput.value);
        if (isNaN(totalDollar) || totalDollar <= 0) {
            showFieldError(totalDollarInput, "Total Dollars must be > 0.");
            isValid = false;
        } else { clearFieldError(totalDollarInput); }
        if (isNaN(dollarRate) || dollarRate <= 0) {
            showFieldError(dollarRateInput, "Dollar Rate must be > 0.");
            isValid = false;
        } else { clearFieldError(dollarRateInput); }
    } else {
        const priceInput = document.getElementById("price");
        const price = parseFloat(priceInput.value);
        if (isNaN(price) || price <= 0) {
            showFieldError(priceInput, "Price must be greater than 0.");
            isValid = false;
        } else { clearFieldError(priceInput); }
    }

    // Initial received
    const initType     = document.getElementById("initial-payment-type").value;
    const initRecInput = document.getElementById("initial-received");
    const initRec      = parseFloat(initRecInput.value) || 0;
    if (initRec < 0) {
        showFieldError(initRecInput, "Received amount cannot be negative.");
        isValid = false;
    } else if (initType !== "Pending" && initRec <= 0) {
        showFieldError(initRecInput, "Received amount must be > 0 if payment type is selected.");
        isValid = false;
    } else { clearFieldError(initRecInput); }

    if (isValid && initRec > 0) {
        let price = 0;
        if (isDollar) {
            const totalDollar = parseFloat(document.getElementById("total-dollar").value) || 0;
            const dollarRate  = parseFloat(document.getElementById("dollar-rate").value) || 0;
            price = calculatePrice(totalDollar, dollarRate);
        } else {
            price = parseFloat(document.getElementById("price").value) || 0;
        }
        
        const totalPrice = calculateTotalPrice(carat, price);
        const discount = parseFloat(document.getElementById("discount").value) || 0;
        const discountAmount = calculateDiscountAmount(totalPrice, discount);
        const discountedAmt = calculateDiscountedAmount(totalPrice, discountAmount);
        
        const dalaliPct = parseFloat(document.getElementById("dalali-pct").value) || 0;
        const dalaliAmount = calculateDalaliAmount(discountedAmt, dalaliPct);
        const billPct = parseFloat(document.getElementById("bill-percentage").value) || 0;
        const billAmount = calculateBillAmount(discountedAmt, billPct);
        const cashAmount = calculateCashAmount(discountedAmt, billAmount);
        const gst = calculateGST(billAmount, 0.015);
        const netBillAmt = calculateNetBillAmount(billAmount, gst);
        const netCashAmt = cashAmount;
        const finalAmount = calculateFinalAmount(netBillAmt, netCashAmt, dalaliAmount);

        if (initType === "Bill" && initRec > (netBillAmt + 0.01)) {
            showFieldError(initRecInput, `Received amount exceeds the Net Bill Amount of ${formatCurrency(netBillAmt)}.`);
            isValid = false;
        } else if (initType === "Cash" && initRec > (netCashAmt + dalaliAmount + 0.01)) {
            showFieldError(initRecInput, `Received amount exceeds the Cash + Brokerage (Dalali) Amount of ${formatCurrency(netCashAmt + dalaliAmount)}.`);
            isValid = false;
        } else if (initRec > (finalAmount + 0.01)) {
            showFieldError(initRecInput, `Received amount exceeds the final outstanding amount of ${formatCurrency(finalAmount)}.`);
            isValid = false;
        }
    }

    return isValid;
}

// ──────────────────────────────────────────────────────────────────────────────
// SAVE ENTRY
// ──────────────────────────────────────────────────────────────────────────────
async function saveBoxSellEntry(event) {
    event.preventDefault();

    if (!validateForm()) {
        alert("Please fix all highlighted errors before saving.");
        return;
    }

    if (editBoxSellNo !== null) {
        await saveBoxSaleEdit();
        return;
    }

    const container = document.getElementById("box-list-container");
    const checked = container.querySelectorAll("input[type='checkbox']:checked");
    const selectedBoxIds = Array.from(checked).map(chk => chk.value);

    // Load available database records to embed details
    const dabbis = getDabbiStockDistribution();
    
    // Construct items array for box sales schema
    const items = [];
    let totalCarat = 0;

    selectedBoxIds.forEach(id => {
        const box = dabbis[id];
        if (box) {
            items.push({
                boxId: id,
                carat: box.carat,
                mPrice: box.mPrice,
                mValue: box.mValue
            });
            totalCarat += box.carat;
        }
    });

    // Auto-generate sequential selling number
    const sellingNo = boxSellingList.reduce((max, s) => Math.max(max, parseInt(s.sellingNo) || 0), 0) + 1;

    const sellingDate = document.getElementById("selling-date").value;
    const dalal       = document.getElementById("dalal").value.trim();
    const partyName   = document.getElementById("party-name").value.trim();
    const isDollar    = document.getElementById("currency-dollar").checked;
    const carat       = totalCarat;

    let price = 0, totalDollar = null, dollarRate = null;
    if (isDollar) {
        totalDollar = parseFloat(document.getElementById("total-dollar").value) || 0;
        dollarRate  = parseFloat(document.getElementById("dollar-rate").value)  || 0;
        price       = calculatePrice(totalDollar, dollarRate);
    } else {
        price = parseFloat(document.getElementById("price").value) || 0;
    }

    const totalPrice     = calculateTotalPrice(carat, price);
    const discount       = parseFloat(document.getElementById("discount").value) || 0;
    const discountAmount = calculateDiscountAmount(totalPrice, discount);
    const discountedAmt  = calculateDiscountedAmount(totalPrice, discountAmount);
    const dalaliPct      = parseFloat(document.getElementById("dalali-pct").value) || 0;
    const dalaliAmount   = calculateDalaliAmount(discountedAmt, dalaliPct);
    const billPct        = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount     = calculateBillAmount(discountedAmt, billPct);
    const cashAmount     = calculateCashAmount(discountedAmt, billAmount);
    const gst            = calculateGST(billAmount, 0.015);
    const netBillAmt     = calculateNetBillAmount(billAmount, gst);
    const netCashAmt     = cashAmount;
    const finalAmount    = calculateFinalAmount(netBillAmt, netCashAmt, dalaliAmount);

    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 30;
    const deadlineDate = calculateDeadlineDate(sellingDate, deadlineDays);

    const initType    = document.getElementById("initial-payment-type").value;
    const initRec     = parseFloat(document.getElementById("initial-received").value) || 0;
    const initRemarks = document.getElementById("initial-remarks").value.trim();

    const payments = [];
    if (initType !== "Pending" && initRec > 0) {
        if (initType === "Both") {
            const totalAmt = netBillAmt + netCashAmt + (dalaliAmount || 0);
            let billPart = 0;
            let dalaliPart = 0;
            let cashPart = 0;
            if (totalAmt > 0) {
                billPart = Math.round(initRec * (netBillAmt / totalAmt));
                dalaliPart = Math.round(initRec * ((dalaliAmount || 0) / totalAmt));
                cashPart = Math.round(initRec - billPart - dalaliPart);
            }
            if (billPart > 0) payments.push({
                id: 'pay_' + Date.now() + '_bill', date: sellingDate,
                type: 'Bill', amount: billPart,
                remarks: initRemarks || 'Initial payment (Bill portion)'
            });
            if (cashPart > 0) payments.push({
                id: 'pay_' + (Date.now()+1) + '_cash', date: sellingDate,
                type: 'Cash', amount: cashPart,
                remarks: initRemarks || 'Initial payment (Cash portion)'
            });
            if (dalaliPart > 0) payments.push({
                id: 'pay_' + (Date.now()+2) + '_dalali', date: sellingDate,
                type: 'Dalali', amount: dalaliPart,
                remarks: initRemarks || 'Initial payment (Dalali portion)'
            });
        } else if (initType === "Cash") {
            const cashPart = Math.min(initRec, netCashAmt);
            const dalaliPart = Math.round(initRec - cashPart);
            if (cashPart > 0) payments.push({
                id: 'pay_' + Date.now() + '_cash', date: sellingDate,
                type: 'Cash', amount: cashPart,
                remarks: initRemarks || 'Initial Cash payment'
            });
            if (dalaliPart > 0) payments.push({
                id: 'pay_' + (Date.now()+1) + '_dalali', date: sellingDate,
                type: 'Dalali', amount: dalaliPart,
                remarks: initRemarks || 'Initial Dalali payment'
            });
        } else {
            payments.push({
                id: 'pay_' + Date.now() + '_init', date: sellingDate,
                type: initType, amount: initRec,
                remarks: initRemarks || 'Initial payment entry'
            });
        }
    }

    const newEntry = {
        sellingNo,
        items,
        totalCarat,
        sellingDate,
        dalal,
        partyName,
        currencyType: isDollar ? "Dollar" : "Rupees",
        totalDollar,
        dollarRate,
        price,
        carat,
        totalPrice,
        discount,
        discountedAmount: discountedAmt,
        dalali:           dalaliPct,
        dalaliAmount,
        billPercentage:   billPct,
        billAmount,
        cashAmount,
        gst,
        netBillAmount:    netBillAmt,
        netCashAmount:    netCashAmt,
        finalAmount,
        deadlineDays,
        deadlineDate,
        payments,
        // Keep single boxId for backward compatibility if only 1 box was sold
        boxId: selectedBoxIds.length === 1 ? selectedBoxIds[0] : selectedBoxIds.join(","),
        boxDetails: selectedBoxIds.length === 1 && dabbis[selectedBoxIds[0]] ? {
            shape1: dabbis[selectedBoxIds[0]].shape1, color: dabbis[selectedBoxIds[0]].color,
            purity: dabbis[selectedBoxIds[0]].purity, mm: dabbis[selectedBoxIds[0]].mm,
            shape2: dabbis[selectedBoxIds[0]].shape2, carat: dabbis[selectedBoxIds[0]].carat,
            mPrice: dabbis[selectedBoxIds[0]].mPrice, mValue: dabbis[selectedBoxIds[0]].mValue
        } : null,
        issueNo: prefilledIssueNo
    };

    try {
        boxSellingList.push(newEntry);
        await saveBoxSaleOnServer(newEntry);

        // Resolve corresponding vendor issue if needed
        if (prefilledIssueNo) {
            await resolveVendorIssueOnSale(prefilledIssueNo, selectedBoxIds);
        }

        window.location.href = "mumbai_inventory.html";
    } catch (e) {
        boxSellingList = boxSellingList.filter(item => item.sellingNo !== newEntry.sellingNo);
        alert("Could not save this box sale entry.\n\n" + e.message);
    }
}

// Edit path for box sales: invoice/financial fields change, box composition stays fixed.
async function saveBoxSaleEdit() {
    const entry = editBoxEntry;
    const items = (entry.items || []).map(it => ({
        boxId: it.boxId, carat: it.carat, mPrice: it.mPrice, mValue: it.mValue
    }));
    const carat = entry.carat || items.reduce((s, i) => s + (i.carat || 0), 0);

    const sellingDate = document.getElementById("selling-date").value;
    const dalal       = document.getElementById("dalal").value.trim();
    const partyName   = document.getElementById("party-name").value.trim();
    const isDollar    = document.getElementById("currency-dollar").checked;

    let price = 0, totalDollar = null, dollarRate = null;
    if (isDollar) {
        totalDollar = parseFloat(document.getElementById("total-dollar").value) || 0;
        dollarRate  = parseFloat(document.getElementById("dollar-rate").value)  || 0;
        price       = calculatePrice(totalDollar, dollarRate);
    } else {
        price = parseFloat(document.getElementById("price").value) || 0;
    }

    const totalPrice     = calculateTotalPrice(carat, price);
    const discount       = parseFloat(document.getElementById("discount").value) || 0;
    const discountAmount = calculateDiscountAmount(totalPrice, discount);
    const discountedAmt  = calculateDiscountedAmount(totalPrice, discountAmount);
    const dalaliPct      = parseFloat(document.getElementById("dalali-pct").value) || 0;
    const dalaliAmount   = calculateDalaliAmount(discountedAmt, dalaliPct);
    const billPct        = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount     = calculateBillAmount(discountedAmt, billPct);
    const cashAmount     = calculateCashAmount(discountedAmt, billAmount);
    const gst            = calculateGST(billAmount, 0.015);
    const netBillAmt     = calculateNetBillAmount(billAmount, gst);
    const netCashAmt     = cashAmount;
    const finalAmount    = calculateFinalAmount(netBillAmt, netCashAmt, dalaliAmount);
    const deadlineDays   = parseInt(document.getElementById("deadline-days").value) || 30;
    const deadlineDate   = calculateDeadlineDate(sellingDate, deadlineDays);

    const newEntry = {
        sellingNo: editBoxSellNo,
        items,
        totalCarat: carat,
        sellingDate,
        dalal,
        partyName,
        currencyType: isDollar ? "Dollar" : "Rupees",
        totalDollar,
        dollarRate,
        price,
        carat,
        totalPrice,
        discount,
        discountedAmount: discountedAmt,
        dalali: dalaliPct,
        dalaliAmount,
        billPercentage: billPct,
        billAmount,
        cashAmount,
        gst,
        netBillAmount: netBillAmt,
        netCashAmount: netCashAmt,
        finalAmount,
        deadlineDays,
        deadlineDate,
        payments: entry.payments || [],
        boxId: entry.boxId,
        issueNo: entry.issueNo || null
    };

    try {
        await updateBoxSaleOnServer(editBoxSellNo, newEntry);
        window.location.href = "records.html";
    } catch (e) {
        alert("Could not update this box sale entry.\n\n" + e.message);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// RESOLVE VENDOR ISSUE ON SALE
// ──────────────────────────────────────────────────────────────────────────────
async function resolveVendorIssueOnSale(issueNo, soldBoxIds) {
    const idx = issuesList.findIndex(iss => iss.issueNo === issueNo);
    if (idx === -1) return;

    const iss = issuesList[idx];

    // Find items in this issue that match the sold box IDs
    const itemsToResolve = iss.items.filter(item => item.type === "Dabbi" && soldBoxIds.includes(item.id));

    let isSplit = false;
    let soldIssue = null;

    // If the issue has only these items, update its status to Sold
    if (iss.items.length === itemsToResolve.length) {
        iss.status = "Sold";
        iss.resolvedDate = new Date().toISOString().split('T')[0];
    } else {
        // Remove the sold boxes from this issue
        iss.items = iss.items.filter(item => !(item.type === "Dabbi" && soldBoxIds.includes(item.id)));
        
        // Create a new separate Sold issue record containing only the sold items
        soldIssue = {
            issueNo: `${iss.issueNo}-S${Date.now().toString().slice(-4)}`,
            date: iss.date,
            vendorId: iss.vendorId,
            vendorName: iss.vendorName,
            items: itemsToResolve,
            status: "Sold",
            resolvedDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };
        issuesList.push(soldIssue);
        isSplit = true;
    }

    await updateVendorIssueOnServer(iss);
    if (isSplit && soldIssue) {
        await saveVendorIssueOnServer(soldIssue);
    }
}

function filterBoxList() {
    const searchVal = document.getElementById("box-search").value.trim().toLowerCase();
    const rows = document.querySelectorAll("#box-list-container .item-checkbox-row");
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchVal)) {
            row.style.display = "flex";
        } else {
            row.style.display = "none";
        }
    });
}
