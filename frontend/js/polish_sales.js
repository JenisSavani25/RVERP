// --- POLISH SALES ENTRY LOGIC ---

let prefilledIssueNo = null;
let prefilledSourceLocation = null;
let prefilledLotId = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load shared data
    loadPolishSalesData();
    loadIssueData();
    
    // Set Default Form Date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("selling-date").value = today;
    
    // Populate form next number
    setNextSellingNumber();

    // Lot ID dropdown populated is removed, direct sales now use FIFO

    // Check for vendor prefill parameters
    parseUrlParamsAndPrefill();

    // Prefilled lot checkboxes are removed
    // populateLotCheckboxList();

    // Trigger Initial Calculations
    toggleCurrencyMode();
    calculateFormPrices();

    // Add real-time event listeners to validate values
    setupRealTimeValidation();
});

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
    
    // Final Amount = Net Bill + Net Cash + Dalali
    const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, dalaliAmount);

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
        { id: "dollar-rate", integer: true },
        { id: "price", integer: true },
        { id: "discount", decimals: 1, max: 100 },
        { id: "dalali-pct", decimals: 1, max: 100 },
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
    } else if (polishSalesList.some(sale => sale.sellingNo === sellingNo)) {
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
        const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, dalaliAmount);
        
        if (initialPaymentType === "Bill" && initialReceived > (netBillAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Received amount exceeds the Net Bill Amount of ${formatCurrency(netBillAmount)}.`);
            isValid = false;
        } else if (initialPaymentType === "Cash" && initialReceived > (netCashAmount + dalaliAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Received amount exceeds the Cash + Brokerage (Dalali) Amount of ${formatCurrency(netCashAmount + dalaliAmount)}.`);
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
    
    const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, dalaliAmount);

    const initialPaymentType = document.getElementById("initial-payment-type").value;
    const initialReceived = parseFloat(document.getElementById("initial-received").value) || 0;
    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 0;
    const remarks = document.getElementById("initial-remarks").value.trim();
    
    const payments = [];
    if (initialPaymentType !== "Pending" && initialReceived > 0) {
        if (initialPaymentType === "Both") {
            const totalAmt = netBillAmount + netCashAmount + (dalaliAmount || 0);
            let billPart = 0;
            let dalaliPart = 0;
            let cashPart = 0;
            if (totalAmt > 0) {
                billPart = Math.round(initialReceived * (netBillAmount / totalAmt));
                dalaliPart = Math.round(initialReceived * ((dalaliAmount || 0) / totalAmt));
                cashPart = Math.round(initialReceived - billPart - dalaliPart);
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
            if (dalaliPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 2) + '_init_dalali',
                    date: sellingDate,
                    type: 'Dalali',
                    amount: dalaliPart,
                    remarks: remarks ? `${remarks} (Auto-split Dalali)` : 'Auto-split Dalali portion'
                });
            }
        } else if (initialPaymentType === "Cash") {
            const cashPart = Math.min(initialReceived, netCashAmount);
            const dalaliPart = Math.round(initialReceived - cashPart);
            if (cashPart > 0) {
                payments.push({
                    id: 'pay_' + Date.now() + '_init_cash',
                    date: sellingDate,
                    type: 'Cash',
                    amount: cashPart,
                    remarks: remarks || 'Initial Cash payment'
                });
            }
            if (dalaliPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 1) + '_init_dalali',
                    date: sellingDate,
                    type: 'Dalali',
                    amount: dalaliPart,
                    remarks: remarks || 'Initial Dalali payment'
                });
            }
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

    const lotId = prefilledLotId || "";

    const newSale = {
        sellingNo,
        sellingDate,
        dalal,
        partyName,
        pieces,
        carat,
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
        sourceLocation: document.getElementById("source-location-select") ? document.getElementById("source-location-select").value : (prefilledSourceLocation || 'Surat'),
        issueNo: prefilledIssueNo
    };

    polishSalesList.push(newSale);
    await savePolishSaleOnServer(newSale);

    if (prefilledIssueNo && lotId) {
        await resolveVendorIssueOnSale(prefilledIssueNo, lotId, pieces);
    }
    
    // Redirect back to dashboard
    window.location.href = "index.html";
}

function onSourceLocationChange() {
    // No lot checklist to update
}

function parseUrlParamsAndPrefill() {
    const params = new URLSearchParams(window.location.search);
    
    const vendor = params.get("vendor");
    const lotId = params.get("lotId");
    const quantity = params.get("quantity");
    const issueNo = params.get("issueNo");
    const sourceLoc = params.get("sourceLocation");

    if (vendor) {
        document.getElementById("dalal").value = vendor;
    }
    
    if (sourceLoc) {
        prefilledSourceLocation = sourceLoc; // should be 'Vendor' when sold from vendor
        const select = document.getElementById("source-location-select");
        if (select) {
            let optExists = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === sourceLoc) {
                    optExists = true;
                    select.selectedIndex = i;
                    break;
                }
            }
            if (!optExists) {
                const opt = document.createElement("option");
                opt.value = sourceLoc;
                opt.textContent = sourceLoc;
                select.appendChild(opt);
                select.value = sourceLoc;
            }
            select.disabled = true;
        }
    }

    if (lotId) {
        prefilledLotId = lotId;
    }

    if (quantity) {
        const piecesInput = document.getElementById("pieces");
        piecesInput.value = quantity;
        piecesInput.readOnly = true;
    }

    if (issueNo) {
        prefilledIssueNo = issueNo;
    }
}

async function resolveVendorIssueOnSale(issueNo, lotId, quantity) {
    const idx = issuesList.findIndex(iss => iss.issueNo === issueNo);
    if (idx === -1) return;

    const iss = issuesList[idx];

    // Find the item in this issue that matches the lotId
    const itemIndex = iss.items.findIndex(item => item.type === "Polish" && item.lotId === lotId);
    if (itemIndex === -1) return;

    const itemToResolve = iss.items[itemIndex];
    const qty = parseInt(quantity) || 0;

    let isSplit = false;
    let soldIssue = null;

    if (itemToResolve.quantity > qty) {
        itemToResolve.quantity -= qty;
        
        soldIssue = {
            issueNo: `${iss.issueNo}-S${Date.now().toString().slice(-4)}`,
            date: iss.date,
            vendorId: iss.vendorId,
            vendorName: iss.vendorName,
            items: [{ type: "Polish", lotId: lotId, quantity: qty }],
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
                items: [itemToResolve],
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
