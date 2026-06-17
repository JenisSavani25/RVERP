// --- ROUGH BUYS ENTRY LOGIC ---

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load shared buys data
    loadBuysData();
    
    // Set Default Form Date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("buying-date").value = today;
    
    // Populate form next number
    setNextBuyingNumber();

    // Trigger Initial Calculations
    toggleCurrencyMode();
    calculateFormPrices();

    // Add real-time event listeners to validate values
    setupRealTimeValidation();
});

function setNextBuyingNumber() {
    const maxNo = buysList.reduce((max, buy) => Math.max(max, parseInt(buy.buyingNo) || 0), 0);
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

    // Central Pricing Engine calculations
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

    // GST (0.25% on Bill Amount)
    const gstAmount = calculateGST(billAmount); 
    const netBillAmount = calculateNetBillAmount(billAmount, gstAmount);
    const netCashAmount = cashAmount;
    
    // Final Amount = Net Bill + Net Cash + Dalali Amount
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
    const buyingDateStr = document.getElementById("buying-date").value;
    const deadlineDays = parseInt(document.getElementById("deadline-days").value) || 0;
    
    let deadlineDateStr = "-";
    if (buyingDateStr) {
        deadlineDateStr = calculateDeadlineDate(buyingDateStr, deadlineDays);
        document.getElementById("deadline-date-display").value = formatDateToLocale(deadlineDateStr);
    } else {
        document.getElementById("deadline-date-display").value = "-";
    }

    // Initial Received/Paid accounting
    const initialReceived = parseFloat(document.getElementById("initial-received").value) || 0;
    const outstanding = calculateOutstandingAmount(finalAmount, initialReceived);
    document.getElementById("initial-outstanding").textContent = formatCurrency(outstanding);
}

// Form validation listeners to enforce bounds, precision, and avoid negatives
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
            
            // 1. Avoid Negative Numbers
            if (val < 0) {
                input.value = 0;
                val = 0;
                showFieldError(input, "Negative values are not allowed");
            } else {
                clearFieldError(input);
            }

            // 2. Validate max percent constraints
            if (item.max && val > item.max) {
                input.value = item.max;
                showFieldError(input, `Maximum limit is ${item.max}%`);
            }

            // 3. Round inputs to their business precision limit on change
            if (input.value !== "" && !isNaN(val)) {
                if (item.integer) {
                    input.value = Math.round(val);
                }
            }
        });
    });

    // Validate duplicate Buying Number
    const buyingNoInput = document.getElementById("buying-no");
    buyingNoInput.addEventListener("input", () => {
        const no = parseInt(buyingNoInput.value);
        if (buysList.some(buy => buy.buyingNo === no)) {
            showFieldError(buyingNoInput, "Buying Number already exists!");
        } else {
            clearFieldError(buyingNoInput);
        }
    });
}

function showFieldError(input, message) {
    input.classList.add("invalid-input");
    input.title = message;
    
    // Check if error message element already exists
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
    
    // 1. Buying Number
    const buyingNoInput = document.getElementById("buying-no");
    const buyingNo = parseInt(buyingNoInput.value);
    if (isNaN(buyingNo) || buyingNo <= 0) {
        showFieldError(buyingNoInput, "Buying Number must be a positive integer.");
        isValid = false;
    } else if (buysList.some(buy => buy.buyingNo === buyingNo)) {
        showFieldError(buyingNoInput, "Buying Number already exists.");
        isValid = false;
    } else {
        clearFieldError(buyingNoInput);
    }
    
    // 2. Buying Date
    const dateInput = document.getElementById("buying-date");
    if (!dateInput.value) {
        showFieldError(dateInput, "Buying Date is required.");
        isValid = false;
    } else {
        clearFieldError(dateInput);
    }
    
    // 3. Pieces
    const piecesInput = document.getElementById("pieces");
    const pieces = parseInt(piecesInput.value);
    if (isNaN(pieces) || pieces <= 0) {
        showFieldError(piecesInput, "Pieces must be at least 1.");
        isValid = false;
    } else {
        clearFieldError(piecesInput);
    }
    
    // 4. Carat
    const caratInput = document.getElementById("carat");
    const carat = parseFloat(caratInput.value);
    if (isNaN(carat) || carat <= 0) {
        showFieldError(caratInput, "Carat must be greater than 0.");
        isValid = false;
    } else {
        clearFieldError(caratInput);
    }
    
    // 5. Dalal
    const dalalInput = document.getElementById("dalal");
    if (!dalalInput.value.trim()) {
        showFieldError(dalalInput, "Dalal (Broker) name is required.");
        isValid = false;
    } else {
        clearFieldError(dalalInput);
    }
    
    // 6. Party Name
    const partyInput = document.getElementById("party-name");
    if (!partyInput.value.trim()) {
        showFieldError(partyInput, "Seller Party Name is required.");
        isValid = false;
    } else {
        clearFieldError(partyInput);
    }
    
    // 7. Currency & Pricing
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
    
    // 8. Percentages
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
    
    // 9. Initial Accounting & Payments
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
    
    // Validate that payment does not exceed limits
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
        const gst = calculateGST(billAmount);
        const netBillAmount = calculateNetBillAmount(billAmount, gst);
        const netCashAmount = cashAmount;
        const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, dalaliAmount);
        
        if (initialPaymentType === "Bill" && initialReceived > (netBillAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Paid amount exceeds the Net Bill Amount of ${formatCurrency(netBillAmount)}.`);
            isValid = false;
        } else if (initialPaymentType === "Cash" && initialReceived > (netCashAmount + dalaliAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Paid amount exceeds the Cash + Brokerage (Dalali) Amount of ${formatCurrency(netCashAmount + dalaliAmount)}.`);
            isValid = false;
        } else if (initialReceived > (finalAmount + 0.01)) {
            showFieldError(initialReceivedInput, `Paid amount exceeds the final outstanding amount of ${formatCurrency(finalAmount)}.`);
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
    
    const dalali = parseFloat(document.getElementById("dalali-pct").value) || 0;
    const dalaliAmount = calculateDalaliAmount(discountedAmount, dalali);
    
    const billPercentage = parseFloat(document.getElementById("bill-percentage").value) || 0;
    const billAmount = calculateBillAmount(discountedAmount, billPercentage);
    const cashAmount = calculateCashAmount(discountedAmount, billAmount);
    
    const gst = calculateGST(billAmount);
    const netBillAmount = calculateNetBillAmount(billAmount, gst);
    const netCashAmount = cashAmount;
    
    const finalAmount = calculateFinalAmount(netBillAmount, netCashAmount, dalaliAmount);

    // Initial Payment entry
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
                    date: buyingDate,
                    type: 'Bill',
                    amount: billPart,
                    deadlineDays: deadlineDays,
                    deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
                    remarks: remarks ? `${remarks} (Auto-split Bill)` : 'Auto-split Bill portion'
                });
            }
            if (cashPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 1) + '_init_cash',
                    date: buyingDate,
                    type: 'Cash',
                    amount: cashPart,
                    deadlineDays: deadlineDays,
                    deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
                    remarks: remarks ? `${remarks} (Auto-split Cash)` : 'Auto-split Cash portion'
                });
            }
            if (dalaliPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 2) + '_init_dalali',
                    date: buyingDate,
                    type: 'Dalali',
                    amount: dalaliPart,
                    deadlineDays: deadlineDays,
                    deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
                    remarks: remarks ? `${remarks} (Auto-split Dalali)` : 'Auto-split Dalali portion'
                });
            }
        } else if (initialPaymentType === "Cash") {
            const cashPart = Math.min(initialReceived, netCashAmount);
            const dalaliPart = Math.round(initialReceived - cashPart);
            if (cashPart > 0) {
                payments.push({
                    id: 'pay_' + Date.now() + '_init_cash',
                    date: buyingDate,
                    type: 'Cash',
                    amount: cashPart,
                    deadlineDays: deadlineDays,
                    deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
                    remarks: remarks || 'Initial Cash payment'
                });
            }
            if (dalaliPart > 0) {
                payments.push({
                    id: 'pay_' + (Date.now() + 1) + '_init_dalali',
                    date: buyingDate,
                    type: 'Dalali',
                    amount: dalaliPart,
                    deadlineDays: deadlineDays,
                    deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
                    remarks: remarks || 'Initial Dalali payment'
                });
            }
        } else {
            payments.push({
                id: 'pay_' + Date.now() + '_init',
                date: buyingDate,
                type: initialPaymentType,
                amount: initialReceived,
                deadlineDays: deadlineDays,
                deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
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
        deadlineDate: calculateDeadlineDate(buyingDate, deadlineDays),
        payments
    };

    try {
        await saveRoughBuyOnServer(newBuy);
        // Only redirect once the server confirms the insert succeeded
        window.location.href = "index.html";
    } catch (e) {
        alert("Could not save this entry to the server.\n\n" + e.message +
              "\n\nThe record was NOT saved. Please screenshot this and the Network tab.");
    }
}
