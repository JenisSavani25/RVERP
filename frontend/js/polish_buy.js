// --- POLISH BUYS ENTRY LOGIC ---

let editBuyingNo = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load shared data
    loadPolishBuysData();

    // Populate party/dalal dropdowns from master lists
    populateEntityDropdowns();
    
    // Set Default Form Date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("buying-date").value = today;

    // Add real-time event listeners to validate values
    setupRealTimeValidation();

    const editParam = new URLSearchParams(window.location.search).get('edit');
    if (editParam !== null && !isNaN(parseInt(editParam))) {
        enterEditMode(parseInt(editParam));
    } else {
        setNextBuyingNumber();
        toggleCurrencyMode();
        calculateFormPrices();
    }
});

function enterEditMode(no) {
    const entry = polishBuysList.find(b => parseInt(b.buyingNo) === no);
    if (!entry) {
        alert("Could not find Polish Buy #" + no + " to edit. It may have been deleted.");
        setNextBuyingNumber();
        toggleCurrencyMode();
        calculateFormPrices();
        return;
    }
    editBuyingNo = no;

    document.getElementById("buying-no").value = entry.buyingNo;
    document.getElementById("buying-no").readOnly = true;
    document.getElementById("buying-date").value = entry.buyingDate || "";
    populateEntityDropdowns(entry.partyName, entry.dalal);
    document.getElementById("pieces").value = entry.pieces || "";
    document.getElementById("carat").value = entry.carat || "";

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
    document.getElementById("bill-percentage").value = entry.billPercentage || 0;
    document.getElementById("deadline-days").value = entry.deadlineDays || 0;

    const initType = document.getElementById("initial-payment-type");
    if (initType) { initType.value = "Pending"; initType.disabled = true; }
    const initRecv = document.getElementById("initial-received");
    if (initRecv) { initRecv.value = 0; initRecv.disabled = true; }

    calculateFormPrices();

    const title = document.getElementById("page-title");
    if (title) title.textContent = `Edit Polish Buy #${entry.buyingNo}`;
    const submitBtn = document.querySelector('#buy-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Update Buy Entry";
}

function setNextBuyingNumber() {
    const maxNo = polishBuysList.reduce((max, buy) => Math.max(max, parseInt(buy.buyingNo) || 0), 0);
    document.getElementById("buying-no").value = maxNo + 1;
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

    // Bill split
    const billPct = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount = calculateBillAmount(discountedAmount, billPct);
    const cashAmount = calculateCashAmount(discountedAmount, billAmount);

    // GST (1.5% GST on Bill Amount for Polish transactions)
    const gstAmount = calculateGST(billAmount, 0.015); 
    const netBillAmount = calculateNetBillAmount(billAmount, gstAmount);
    const netCashAmount = cashAmount;
    
    // Final Amount = Net Bill + Net Cash (No Dalali)
    const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, 0);

    // Update Split labels
    document.getElementById("label-bill-amt").textContent = formatCurrency(billAmount);
    document.getElementById("label-cash-amt").textContent = formatCurrency(cashAmount);
    document.getElementById("gst-amount").value = formatCurrency(gstAmount);
    document.getElementById("label-net-bill").textContent = formatCurrency(netBillAmount);
    document.getElementById("label-net-cash").textContent = formatCurrency(netCashAmount);
    document.getElementById("label-final-amount").textContent = formatCurrency(finalAmount);

    // Deadline Date Calculation
    const buyingDateStr = document.getElementById("buying-date").value;
    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 0;
    
    let deadlineDateStr = "-";
    if (buyingDateStr) {
        deadlineDateStr = calculateDeadlineDate(buyingDateStr, deadlineDays);
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

    const buyingNoInput = document.getElementById("buying-no");
    buyingNoInput.addEventListener("input", () => {
        const no = parseInt(buyingNoInput.value);
        if (polishBuysList.some(buy => buy.buyingNo === no)) {
            showFieldError(buyingNoInput, "Buying Number already exists!");
        } else {
            clearFieldError(buyingNoInput);
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
    
    const buyingNoInput = document.getElementById("buying-no");
    const buyingNo = parseInt(buyingNoInput.value);
    if (isNaN(buyingNo) || buyingNo <= 0) {
        showFieldError(buyingNoInput, "Buying Number must be a positive integer.");
        isValid = false;
    } else if (editBuyingNo === null && polishBuysList.some(buy => buy.buyingNo === buyingNo)) {
        showFieldError(buyingNoInput, "Buying Number already exists.");
        isValid = false;
    } else {
        clearFieldError(buyingNoInput);
    }
    
    const dateInput = document.getElementById("buying-date");
    if (!dateInput.value) {
        showFieldError(dateInput, "Buying Date is required.");
        isValid = false;
    } else {
        clearFieldError(dateInput);
    }
    
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
        showFieldError(partyInput, "Seller Party Name is required.");
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
        showFieldError(initialReceivedInput, "Paid amount cannot be negative.");
        isValid = false;
    } else {
        clearFieldError(initialReceivedInput);
    }
    
    if (initialPaymentType !== "Pending" && initialReceived <= 0) {
        showFieldError(initialReceivedInput, "Paid amount must be greater than 0 if type is selected.");
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
        const billAmount = calculateBillAmount(discountedAmount, billPercentage);
        const cashAmount = calculateCashAmount(discountedAmount, billAmount);
        const gst = calculateGST(billAmount, 0.015);
        const netBillAmount = calculateNetBillAmount(billAmount, gst);
        const netCashAmount = cashAmount;
        const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, 0);
        
        if (initialPaymentType === "Bill" && initialReceived > (netBillAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Paid amount exceeds the Net Bill Amount of ${formatCurrency(netBillAmount)}.`);
            isValid = false;
        } else if (initialPaymentType === "Cash" && initialReceived > (netCashAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Paid amount exceeds the Net Cash Amount of ${formatCurrency(netCashAmount)}.`);
            isValid = false;
        } else if (initialReceived > (finalAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Paid amount exceeds the party outstanding of ${formatCurrency(finalAmount)}.`);
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

async function saveBuyEntry(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        alert("Error: Please fix all validation errors before saving.");
        return;
    }

    const buyingNo = parseInt(document.getElementById("buying-no").value);
    const buyingDate = document.getElementById("buying-date").value;
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
    
    const billPercentage = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount = calculateBillAmount(discountedAmount, billPercentage);
    const cashAmount = calculateCashAmount(discountedAmount, billAmount);
    
    const gst = calculateGST(billAmount, 0.015);
    const netBillAmount = calculateNetBillAmount(billAmount, gst);
    const netCashAmount = cashAmount;
    
    const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, 0);

    const initialPaymentType = document.getElementById("initial-payment-type").value;
    const initialReceived = parseFloat(document.getElementById("initial-received").value) || 0;
    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 0;
    const remarks = document.getElementById("initial-remarks").value.trim();
    
    const payments = [];
    if (initialPaymentType !== "Pending" && initialReceived > 0) {
        if (initialPaymentType === "Both") {
            const billPart = Math.round(initialReceived * (netBillAmount / (netBillAmount + netCashAmount)));
            const cashPart = Math.round(initialReceived - billPart);
            
            if (billPart > 0) {
                payments.push({
                    id: 'pay_' + Date.now() + '_init_bill',
                    date: buyingDate,
                    type: 'Bill',
                    amount: billPart,
                    remarks: remarks ? `${remarks} (Auto-split Bill)` : 'Auto-split Bill portion'
                });
            }
            if (cashPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 1) + '_init_cash',
                    date: buyingDate,
                    type: 'Cash',
                    amount: cashPart,
                    remarks: remarks ? `${remarks} (Auto-split Cash)` : 'Auto-split Cash portion'
                });
            }
        } else {
            payments.push({
                id: 'pay_' + Date.now() + '_init',
                date: buyingDate,
                type: initialPaymentType,
                amount: initialReceived,
                remarks: remarks || 'Initial payment entry'
            });
        }
    }

    const newBuy = {
        buyingNo,
        buyingDate,
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
        dalali: 0,
        dalaliAmount: 0,
        billPercentage,
        billAmount,
        cashAmount,
        gst,
        netBillAmount,
        netCashAmount,
        finalAmount,
        deadlineDays,
        deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
        payments
    };

    try {
        if (editBuyingNo !== null) {
            await updatePolishLotOnServer(editBuyingNo, newBuy);
            window.location.href = "records.html";
        } else {
            await savePolishLotOnServer(newBuy);
            // Redirect only when server confirms save
            window.location.href = "index.html";
        }
    } catch (e) {
        alert("Could not save this polish buy entry.\n\n" + e.message);
    }
}
