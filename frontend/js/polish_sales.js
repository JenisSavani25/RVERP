// --- POLISH SALES ENTRY LOGIC ---

let prefilledIssueNo = null;
let prefilledSourceLocation = 'Mumbai';
let prefilledLotId = null;
let editSellingNo = null;

function getSaleSourceLocation() {
    // Vendor consignment sales deduct from vendor stock, not Mumbai
    if (prefilledIssueNo) return 'Vendor';
    return prefilledSourceLocation || 'Mumbai';
}

/** Polish sales only: final receivable = net bill + net cash − dalali (not added). */
function calculatePolishSaleFinalAmount(netBill, netCash, dalaliAmt) {
    const bill = Math.max(0, parseFloat(netBill) || 0);
    const cash = Math.max(0, parseFloat(netCash) || 0);
    const broker = Math.max(0, parseFloat(dalaliAmt) || 0);
    return Math.max(0, Math.round(bill + cash - broker));
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load shared data
    loadPolishSalesData();
    loadIssueData();

    // Populate party/dalal dropdowns from master lists
    populateEntityDropdowns();
    
    // Set Default Form Date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("selling-date").value = today;

    // Add real-time event listeners to validate values
    setupRealTimeValidation();

    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam !== null && !isNaN(parseInt(editParam))) {
        enterEditMode(parseInt(editParam));
    } else {
        // Populate form next number
        setNextSellingNumber();
        parseUrlParamsAndPrefill();
        handleSaleShapeChange();
        toggleCurrencyMode();
        calculateFormPrices();
    }
});

function enterEditMode(no) {
    const entry = polishSalesList.find(s => parseInt(s.sellingNo) === no);
    if (!entry) {
        alert("Could not find Polish Sale #" + no + " to edit. It may have been deleted.");
        setNextSellingNumber();
        toggleCurrencyMode();
        calculateFormPrices();
        return;
    }
    editSellingNo = no;

    // Preserve lot/source/issue linkage so the update carries them unchanged
    prefilledLotId = entry.lotId || "";
    prefilledSourceLocation = entry.sourceLocation || "Mumbai";
    prefilledIssueNo = entry.issueNo || null;

    document.getElementById("selling-no").value = entry.sellingNo;
    document.getElementById("selling-no").readOnly = true;
    document.getElementById("selling-date").value = entry.sellingDate || "";
    populateEntityDropdowns(entry.partyName, entry.dalal);
    document.getElementById("pieces").value = entry.pieces || "";
    document.getElementById("carat").value = entry.carat || "";
    const shapeSel = document.getElementById("sale-shape-name");
    if (shapeSel) shapeSel.value = (entry.shapeName || entry.lotId || "").toUpperCase();
    handleSaleShapeChange();

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
    const dalaliInput = document.getElementById("dalali-pct");
    if (dalaliInput) dalaliInput.value = entry.dalali || 0;
    document.getElementById("bill-percentage").value = entry.billPercentage || 0;
    document.getElementById("deadline-days").value = entry.deadlineDays || 0;

    const initType = document.getElementById("initial-payment-type");
    if (initType) { initType.value = "Pending"; initType.disabled = true; }
    const initRecv = document.getElementById("initial-received");
    if (initRecv) { initRecv.value = 0; initRecv.disabled = true; }

    calculateFormPrices();

    const title = document.getElementById("page-title");
    if (title) title.textContent = `Edit Polish Sale #${entry.sellingNo}`;
    const submitBtn = document.querySelector('#sale-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Update Sale Entry";
}

function setNextSellingNumber() {
    const maxNo = polishSalesList.reduce((max, sale) => Math.max(max, parseInt(sale.sellingNo) || 0), 0);
    document.getElementById("selling-no").value = maxNo + 1;
}

function toggleCurrencyMode() {
    const isDollar = document.getElementById("currency-dollar").checked;
    const dollarContainer = document.getElementById("dollar-fields-container");
    const rupeesContainer = document.getElementById("rupees-fields-container");
    const priceInput = document.getElementById("price");

    if (isDollar) {
        dollarContainer.classList.remove("hidden");
        rupeesContainer.classList.add("hidden");
        priceInput.readOnly = true;
    } else {
        dollarContainer.classList.add("hidden");
        rupeesContainer.classList.remove("hidden");
        priceInput.readOnly = false;
        document.getElementById("total-dollar").value = "";
        document.getElementById("dollar-rate").value = "";
        document.getElementById("price-auto").value = "";
    }
    calculateFormPrices();
}

function calculateFormPrices() {
    const carat = parseFloat(document.getElementById("carat").value) || 0;
    const isDollar = document.getElementById("currency-dollar").checked;
    
    let price = 0;
    
    if (isDollar) {
        const totalDollar = parseFloat(document.getElementById("total-dollar").value) || 0;
        const dollarRate = parseFloat(document.getElementById("dollar-rate").value) || 0;
        price = calculatePrice(totalDollar, dollarRate);
        document.getElementById("price").value = price > 0 ? Math.round(price) : "";
        document.getElementById("price-auto").value = price > 0 ? Math.round(price) : "";
    } else {
        price = parseFloat(document.getElementById("price").value) || 0;
    }

    // Calculations
    const totalPrice = calculateTotalPrice(carat, price);
    document.getElementById("total-price").value = formatCurrency(totalPrice);

    // Discount
    const discountPct = parseFloat(document.getElementById("discount").value) || 0;
    const discountAmount = calculateDiscountAmount(totalPrice, discountPct);
    const discountedAmount = calculateDiscountedAmount(totalPrice, discountAmount);
    document.getElementById("discounted-amount").value = formatCurrency(discountedAmount);

    // Dalali
    const dalaliPct = parseFloat(document.getElementById("dalali-pct").value) || 0;
    const dalaliAmount = calculateDalaliAmount(discountedAmount, dalaliPct);
    document.getElementById("dalali-amount").value = formatCurrency(dalaliAmount);

    // Bill split
    const billPct = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount = calculateBillAmount(discountedAmount, billPct);
    const cashAmount = calculateCashAmount(discountedAmount, billAmount);

    // GST (1.5% GST on Bill Amount for Polish transactions)
    const gstAmount = calculateGST(billAmount, 0.015); 
    const netBillAmount = calculateNetBillAmount(billAmount, gstAmount);
    const netCashAmount = cashAmount;
    
    // Final Amount = Net Bill + Net Cash − Dalali (polish sales only)
    const finalAmount = calculatePolishSaleFinalAmount(netBillAmount, netCashAmount, dalaliAmount);

    // Update Split labels
    document.getElementById("label-bill-amt").textContent = formatCurrency(billAmount);
    document.getElementById("label-cash-amt").textContent = formatCurrency(cashAmount);
    document.getElementById("label-dalali-amt-split").textContent = formatCurrency(dalaliAmount);
    document.getElementById("gst-amount").value = formatCurrency(gstAmount);
    document.getElementById("label-net-bill").textContent = formatCurrency(netBillAmount);
    document.getElementById("label-net-cash").textContent = formatCurrency(netCashAmount);
    document.getElementById("label-final-amount").textContent = formatCurrency(finalAmount);

    // Deadline Date Calculation
    const sellingDateStr = document.getElementById("selling-date").value;
    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 0;
    
    let deadlineDateStr = "-";
    if (sellingDateStr) {
        deadlineDateStr = calculateDeadlineDate(sellingDateStr, deadlineDays);
        document.getElementById("deadline-date-display").value = formatDateToLocale(deadlineDateStr);
    } else {
        document.getElementById("deadline-date-display").value = "-";
    }

    // Initial Received accounting
    const initialReceived = parseFloat(document.getElementById("initial-received").value) || 0;
    const outstanding = calculateOutstandingAmount(finalAmount, initialReceived);
    document.getElementById("initial-outstanding").textContent = formatCurrency(outstanding);
}

function setupRealTimeValidation() {
    const numericInputs = [
        { id: "pieces", integer: true },
        { id: "carat", decimals: 3 },
        { id: "total-dollar", integer: true },
        { id: "dollar-rate", decimals: 2 },
        { id: "price", integer: true },
        { id: "discount", decimals: 1, max: 100 },
        { id: "dalali-pct", decimals: 2, max: 100 },
        { id: "bill-percentage", decimals: 1, max: 100 },
        { id: "initial-received", integer: true },
        { id: "deadline-days", integer: true }
    ];

    numericInputs.forEach(item => {
        const input = document.getElementById(item.id);
        if (!input) return;

        input.addEventListener("input", () => {
            let val = parseFloat(input.value);
            
            if (val < 0) {
                input.value = 0;
                val = 0;
                showFieldError(input, "Negative values are not allowed");
            } else {
                clearFieldError(input);
            }

            if (item.max && val > item.max) {
                input.value = item.max;
                showFieldError(input, `Maximum limit is ${item.max}%`);
            }

            if (input.value !== "" && !isNaN(val)) {
                if (item.integer) {
                    input.value = Math.round(val);
                }
            }
        });
    });

    const sellingNoInput = document.getElementById("selling-no");
    sellingNoInput.addEventListener("input", () => {
        const no = parseInt(sellingNoInput.value);
        if (polishSalesList.some(sale => sale.sellingNo === no)) {
            showFieldError(sellingNoInput, "Selling Number already exists!");
        } else {
            clearFieldError(sellingNoInput);
        }
    });

    document.getElementById("pieces")?.addEventListener("input", handleSaleShapeChange);
    document.getElementById("carat")?.addEventListener("input", handleSaleShapeChange);
}

function handleSaleShapeChange() {
    const shapeName = document.getElementById("sale-shape-name")?.value;
    const hint = document.getElementById("sale-shape-avail-hint");
    if (!hint) return;

    if (!shapeName) {
        hint.textContent = "Select shape to see available stock";
        return;
    }

    const avail = getPolishShapeSaleAvailForValidation(shapeName, prefilledIssueNo, editSellingNo);
    hint.textContent = `Available: ${avail.pcs} pcs / ${avail.carat.toFixed(2)} ct`;
}

function getPolishShapeSaleAvailForValidation(shapeName, issueNo, editingSaleNo) {
    let avail = getPolishShapeSaleAvail(shapeName, issueNo);
    if (editingSaleNo !== null) {
        const orig = polishSalesList.find(s => parseInt(s.sellingNo) === editingSaleNo);
        const origShape = (orig?.shapeName || orig?.lotId || "").toUpperCase();
        if (orig && origShape === (shapeName || "").toUpperCase()) {
            avail.pcs += parseInt(orig.pieces) || 0;
            avail.carat += parseFloat(orig.carat) || 0;
        }
    }
    return avail;
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
    if (errSpan) {
        errSpan.remove();
    }
}

function validateForm() {
    let isValid = true;
    
    const sellingNoInput = document.getElementById("selling-no");
    const sellingNo = parseInt(sellingNoInput.value);
    if (isNaN(sellingNo) || sellingNo <= 0) {
        showFieldError(sellingNoInput, "Selling Number must be a positive integer.");
        isValid = false;
    } else if (editSellingNo === null && polishSalesList.some(sale => sale.sellingNo === sellingNo)) {
        showFieldError(sellingNoInput, "Selling Number already exists.");
        isValid = false;
    } else {
        clearFieldError(sellingNoInput);
    }
    
    const dateInput = document.getElementById("selling-date");
    if (!dateInput.value) {
        showFieldError(dateInput, "Selling Date is required.");
        isValid = false;
    } else {
        clearFieldError(dateInput);
    }
    
    // Lot checklist check is removed as Polish is now flat-stock pool
    
    const piecesInput = document.getElementById("pieces");
    const pieces = parseInt(piecesInput.value);
    if (isNaN(pieces) || pieces <= 0) {
        showFieldError(piecesInput, "Pieces must be at least 1.");
        isValid = false;
    } else {
        clearFieldError(piecesInput);
    }
    
    const caratInput = document.getElementById("carat");
    const carat = parseFloat(caratInput.value);
    if (isNaN(carat) || carat <= 0) {
        showFieldError(caratInput, "Carat must be greater than 0.");
        isValid = false;
    } else {
        clearFieldError(caratInput);
    }

    const shapeInput = document.getElementById("sale-shape-name");
    const shapeName = shapeInput?.value?.trim().toUpperCase();
    if (!shapeName || !POLISH_SHAPE_OPTIONS.includes(shapeName)) {
        if (shapeInput) showFieldError(shapeInput, "Please select a valid shape.");
        isValid = false;
    } else {
        if (shapeInput) clearFieldError(shapeInput);
        const avail = getPolishShapeSaleAvailForValidation(shapeName, prefilledIssueNo, editSellingNo);
        if (pieces > avail.pcs) {
            showFieldError(piecesInput, `Exceeds available stock (${avail.pcs} pcs for ${formatPolishShapeLabel(shapeName)}).`);
            isValid = false;
        }
        if (carat > avail.carat + 0.0001) {
            showFieldError(caratInput, `Exceeds available carat (${avail.carat.toFixed(2)} ct).`);
            isValid = false;
        }
    }
    
    const dalalInput = document.getElementById("dalal");
    if (!dalalInput.value.trim()) {
        showFieldError(dalalInput, "Dalal (Broker) name is required.");
        isValid = false;
    } else {
        clearFieldError(dalalInput);
    }
    
    const partyInput = document.getElementById("party-name");
    if (!partyInput.value.trim()) {
        showFieldError(partyInput, "Buyer Party Name is required.");
        isValid = false;
    } else {
        clearFieldError(partyInput);
    }
    
    const isDollar = document.getElementById("currency-dollar").checked;
    if (isDollar) {
        const totalDollarInput = document.getElementById("total-dollar");
        const totalDollar = parseFloat(totalDollarInput.value);
        if (isNaN(totalDollar) || totalDollar <= 0) {
            showFieldError(totalDollarInput, "Total Dollars must be greater than 0.");
            isValid = false;
        } else {
            clearFieldError(totalDollarInput);
        }
        
        const dollarRateInput = document.getElementById("dollar-rate");
        const dollarRate = parseFloat(dollarRateInput.value);
        if (isNaN(dollarRate) || dollarRate <= 0) {
            showFieldError(dollarRateInput, "Dollar Rate must be greater than 0.");
            isValid = false;
        } else {
            clearFieldError(dollarRateInput);
        }
    } else {
        const priceInput = document.getElementById("price");
        const price = parseFloat(priceInput.value);
        if (isNaN(price) || price <= 0) {
            showFieldError(priceInput, "Price in Rupees must be greater than 0.");
            isValid = false;
        } else {
            clearFieldError(priceInput);
        }
    }
    
    const discountInput = document.getElementById("discount");
    const discount = parseFloat(discountInput.value);
    if (isNaN(discount) || discount < 0 || discount > 100) {
        showFieldError(discountInput, "Discount must be between 0% and 100%.");
        isValid = false;
    } else {
        clearFieldError(discountInput);
    }
    
    const dalaliInput = document.getElementById("dalali-pct");
    const dalali = parseFloat(dalaliInput.value);
    if (isNaN(dalali) || dalali < 0 || dalali > 100) {
        showFieldError(dalaliInput, "Dalali must be between 0% and 100%.");
        isValid = false;
    } else {
        clearFieldError(dalaliInput);
    }
    
    const billPercentageInput = document.getElementById("bill-percentage");
    const billPercentage = parseFloat(billPercentageInput.value);
    if (isNaN(billPercentage) || billPercentage < 0 || billPercentage > 100) {
        showFieldError(billPercentageInput, "Bill Percentage must be between 0% and 100%.");
        isValid = false;
    } else {
        clearFieldError(billPercentageInput);
    }
    
    const initialPaymentType = document.getElementById("initial-payment-type").value;
    const initialReceivedInput = document.getElementById("initial-received");
    const initialReceived = parseFloat(initialReceivedInput.value) || 0;
    
    if (initialReceived < 0) {
        showFieldError(initialReceivedInput, "Received amount cannot be negative.");
        isValid = false;
    } else {
        clearFieldError(initialReceivedInput);
    }
    
    if (initialPaymentType !== "Pending" && initialReceived <= 0) {
        showFieldError(initialReceivedInput, "Received amount must be greater than 0 if type is selected.");
        isValid = false;
    }
    
    if (isValid && initialReceived > 0) {
        const carat = parseFloat(caratInput.value);
        let price = 0;
        if (isDollar) {
            const totalDollar = parseFloat(document.getElementById("total-dollar").value);
            const dollarRate = parseFloat(document.getElementById("dollar-rate").value);
            price = calculatePrice(totalDollar, dollarRate);
        } else {
            price = parseFloat(document.getElementById("price").value);
        }
        
        const totalPrice = calculateTotalPrice(carat, price);
        const discountAmount = calculateDiscountAmount(totalPrice, discount);
        const discountedAmount = calculateDiscountedAmount(totalPrice, discountAmount);
        const dalaliAmount = calculateDalaliAmount(discountedAmount, dalali);
        const billAmount = calculateBillAmount(discountedAmount, billPercentage);
        const cashAmount = calculateCashAmount(discountedAmount, billAmount);
        const gst = calculateGST(billAmount, 0.015);
        const netBillAmount = calculateNetBillAmount(billAmount, gst);
        const netCashAmount = cashAmount;
        const finalAmount = calculatePolishSaleFinalAmount(netBillAmount, netCashAmount, dalaliAmount);
        
        if (initialPaymentType === "Bill" && initialReceived > (netBillAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Received amount exceeds the Net Bill Amount of ${formatCurrency(netBillAmount)}.`);
            isValid = false;
        } else if (initialPaymentType === "Cash" && initialReceived > (netCashAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Received amount exceeds the Net Cash Amount of ${formatCurrency(netCashAmount)}.`);
            isValid = false;
        } else if (initialReceived > (finalAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Received amount exceeds the final outstanding amount of ${formatCurrency(finalAmount)}.`);
            isValid = false;
        }
    }
    
    const deadlineDaysInput = document.getElementById("deadline-days");
    const deadlineDays = parseInt(deadlineDaysInput.value);
    if (isNaN(deadlineDays) || deadlineDays < 0) {
        showFieldError(deadlineDaysInput, "Deadline days cannot be negative.");
        isValid = false;
    } else {
        clearFieldError(deadlineDaysInput);
    }
    
    return isValid;
}

async function saveSaleEntry(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        alert("Error: Please fix all validation errors before saving.");
        return;
    }

    const sellingNo = parseInt(document.getElementById("selling-no").value);
    const sellingDate = document.getElementById("selling-date").value;
    const dalal = document.getElementById("dalal").value.trim();
    const partyName = document.getElementById("party-name").value.trim();
    const pieces = parseInt(document.getElementById("pieces").value) || 1;
    const carat = parseFloat(document.getElementById("carat").value) || 0;
    const shapeName = (document.getElementById("sale-shape-name")?.value || "").trim().toUpperCase();
    const currencyType = document.querySelector('input[name="currency-type"]:checked').value;
    
    let totalDollar = null;
    let dollarRate = null;
    if (currencyType === 'Dollar') {
        totalDollar = parseFloat(document.getElementById("total-dollar").value) || 0;
        dollarRate = parseFloat(document.getElementById("dollar-rate").value) || 0;
    }
    
    const price = parseFloat(document.getElementById("price").value) || 0;
    const totalPrice = calculateTotalPrice(carat, price);
    
    const discount = parseFloat(document.getElementById("discount").value) || 0;
    const discountAmount = calculateDiscountAmount(totalPrice, discount);
    const discountedAmount = calculateDiscountedAmount(totalPrice, discountAmount);
    
    const dalali = parseFloat(document.getElementById("dalali-pct").value) || 0;
    const dalaliAmount = calculateDalaliAmount(discountedAmount, dalali);
    
    const billPercentage = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount = calculateBillAmount(discountedAmount, billPercentage);
    const cashAmount = calculateCashAmount(discountedAmount, billAmount);
    
    const gst = calculateGST(billAmount, 0.015);
    const netBillAmount = calculateNetBillAmount(billAmount, gst);
    const netCashAmount = cashAmount;
    
    const finalAmount = calculatePolishSaleFinalAmount(netBillAmount, netCashAmount, dalaliAmount);

    const initialPaymentType = document.getElementById("initial-payment-type").value;
    const initialReceived = parseFloat(document.getElementById("initial-received").value) || 0;
    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 0;
    const remarks = document.getElementById("initial-remarks").value.trim();
    
    const payments = [];
    if (initialPaymentType !== "Pending" && initialReceived > 0) {
        if (initialPaymentType === "Both") {
            const totalAmt = netBillAmount + netCashAmount;
            let billPart = 0;
            let cashPart = 0;
            if (totalAmt > 0) {
                billPart = Math.round(initialReceived * (netBillAmount / totalAmt));
                cashPart = Math.round(initialReceived - billPart);
            }
            
            if (billPart > 0) {
                payments.push({
                    id: 'pay_' + Date.now() + '_init_bill',
                    date: sellingDate,
                    type: 'Bill',
                    amount: billPart,
                    remarks: remarks ? `${remarks} (Auto-split Bill)` : 'Auto-split Bill portion'
                });
            }
            if (cashPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 1) + '_init_cash',
                    date: sellingDate,
                    type: 'Cash',
                    amount: cashPart,
                    remarks: remarks ? `${remarks} (Auto-split Cash)` : 'Auto-split Cash portion'
                });
            }
        } else if (initialPaymentType === "Cash") {
            payments.push({
                id: 'pay_' + Date.now() + '_init_cash',
                date: sellingDate,
                type: 'Cash',
                amount: initialReceived,
                remarks: remarks || 'Initial Cash payment'
            });
        } else {
            payments.push({
                id: 'pay_' + Date.now() + '_init',
                date: sellingDate,
                type: initialPaymentType,
                amount: initialReceived,
                remarks: remarks || 'Initial payment entry'
            });
        }
    }

    const lotId = prefilledLotId || shapeName || "";

    const newSale = {
        sellingNo,
        sellingDate,
        dalal,
        partyName,
        pieces,
        carat,
        shapeName,
        currencyType,
        totalDollar,
        dollarRate,
        price,
        totalPrice,
        discount,
        discountedAmount,
        dalali,
        dalaliAmount,
        billPercentage,
        billAmount,
        cashAmount,
        gst,
        netBillAmount,
        netCashAmount,
        finalAmount,
        deadlineDays,
        deadlineDate: calculateDeadlineDate(sellingDate, deadlineDays),
        payments,
        lotId: lotId,
        sourceLocation: getSaleSourceLocation(),
        issueNo: prefilledIssueNo
    };

    if (editSellingNo !== null) {
        try {
            await updatePolishSaleOnServer(editSellingNo, newSale);
            window.location.href = "records.html";
        } catch (e) {
            alert("Could not update this polish sale entry.\n\n" + e.message);
        }
        return;
    }

    try {
        polishSalesList.push(newSale);
        await savePolishSaleOnServer(newSale);

        if (prefilledIssueNo && shapeName) {
            await resolveVendorIssueOnSale(prefilledIssueNo, shapeName, pieces);
        }
        
        // Redirect only when server confirms save
        window.location.href = "mumbai_inventory.html";
    } catch (e) {
        polishSalesList = polishSalesList.filter(item => item.sellingNo !== newSale.sellingNo);
        alert("Could not save this polish sale entry.\n\n" + e.message);
    }
}

function parseUrlParamsAndPrefill() {
    const params = new URLSearchParams(window.location.search);
    
    const vendor = params.get("vendor");
    const shapeName = params.get("shapeName");
    const lotId = params.get("lotId"); // legacy
    const quantity = params.get("quantity");
    const issueNo = params.get("issueNo");

    if (vendor) {
        fillNameSelect("dalal", getDalalNameOptions(), vendor);
    }

    if (shapeName) {
        const shapeSel = document.getElementById("sale-shape-name");
        if (shapeSel) {
            shapeSel.value = shapeName.toUpperCase();
            if (issueNo) shapeSel.disabled = true;
        }
        prefilledLotId = shapeName;
    } else if (lotId) {
        prefilledLotId = lotId;
    }

    if (quantity) {
        const piecesInput = document.getElementById("pieces");
        piecesInput.value = quantity;
        if (issueNo) piecesInput.readOnly = true;
    }

    const caratParam = params.get("carat");
    if (caratParam) {
        const caratInput = document.getElementById("carat");
        caratInput.value = caratParam;
        if (issueNo) caratInput.readOnly = true;
    }

    if (issueNo) {
        prefilledIssueNo = issueNo;
    }

    handleSaleShapeChange();
}

async function resolveVendorIssueOnSale(issueNo, shapeOrLotId, quantity) {
    const idx = issuesList.findIndex(iss => iss.issueNo === issueNo);
    if (idx === -1) return;

    const iss = issuesList[idx];
    const matchKey = (shapeOrLotId || "").toUpperCase();

    const itemIndex = iss.items.findIndex(item => {
        if (item.type !== "Polish") return false;
        const key = (item.shapeName || item.lotId || "").toUpperCase();
        return key === matchKey;
    });
    if (itemIndex === -1) return;

    const itemToResolve = iss.items[itemIndex];
    const qty = parseInt(quantity) || 0;
    const shapeName = itemToResolve.shapeName || itemToResolve.lotId;

    let isSplit = false;
    let soldIssue = null;

    if (itemToResolve.quantity > qty) {
        itemToResolve.quantity -= qty;

        soldIssue = {
            issueNo: `${iss.issueNo}-S${Date.now().toString().slice(-4)}`,
            date: iss.date,
            vendorId: iss.vendorId,
            vendorName: iss.vendorName,
            items: [{ type: "Polish", shapeName, quantity: qty }],
            status: "Sold",
            resolvedDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };
        issuesList.push(soldIssue);
        isSplit = true;
    } else {
        if (iss.items.length === 1) {
            iss.status = "Sold";
            iss.resolvedDate = new Date().toISOString().split('T')[0];
        } else {
            iss.items.splice(itemIndex, 1);

            soldIssue = {
                issueNo: `${iss.issueNo}-S${Date.now().toString().slice(-4)}`,
                date: iss.date,
                vendorId: iss.vendorId,
                vendorName: iss.vendorName,
                items: [{ type: "Polish", shapeName, quantity: itemToResolve.quantity }],
                status: "Sold",
                resolvedDate: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            };
            issuesList.push(soldIssue);
            isSplit = true;
        }
    }

    await updateVendorIssueOnServer(iss);
    if (isSplit && soldIssue) {
        await saveVendorIssueOnServer(soldIssue);
    }
}
