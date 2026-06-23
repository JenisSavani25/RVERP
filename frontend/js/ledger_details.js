// --- LEDGER DETAILS MODULE LOGIC ---
let currentActiveTransactionId = null;
let currentTransactionType = 'sales'; // 'sales', 'buys', 'polish_sales', 'polish_buys'
let currentTransactionList = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Load all four databases + box selling
    loadSalesData();
    loadBuysData();
    loadPolishSalesData();
    loadPolishBuysData();
    loadBoxSellingData();
    
    // Set default payment date to today
    document.getElementById("payment-date").value = new Date().toISOString().split('T')[0];

    // Read ID and Type from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get("id"));
    const type = urlParams.get("type") || 'sales';
    
    currentTransactionType = type;

    // Resolve which list to use
    if (type === 'polish_sales') {
        currentTransactionList = polishSalesList;
    } else if (type === 'polish_buys') {
        currentTransactionList = polishBuysList;
    } else if (type === 'buys') {
        currentTransactionList = buysList;
    } else if (type === 'box_selling') {
        currentTransactionList = boxSellingList;
    } else {
        currentTransactionList = salesList;
    }
    
    if (id) {
        currentActiveTransactionId = id;
        loadTransactionLedger(id);
    } else {
        alert("No Transaction ID provided! Redirecting to dashboard.");
        window.location.href = "index.html";
    }

    // Set up payment form validation
    setupPaymentValidation();
});

function isSaleType() {
    return currentTransactionType === 'sales' || currentTransactionType === 'polish_sales' || currentTransactionType === 'box_selling';
}

function hasDalali() {
    // Dalali exists on Rough Buys, Polish Sales and Box Selling
    return currentTransactionType === 'buys' || currentTransactionType === 'polish_sales' || currentTransactionType === 'box_selling';
}

function getGSTRate() {
    return (currentTransactionType === 'polish_sales' || currentTransactionType === 'polish_buys' || currentTransactionType === 'box_selling') ? 0.015 : 0.0025;
}

function getGSTLabel() {
    return getGSTRate() === 0.015 ? 'GST (1.5% on Bill):' : 'GST (0.25% on Bill):';
}

function loadTransactionLedger(id) {
    const sale = currentTransactionList.find(item => {
        return isSaleType() ? item.sellingNo === id : item.buyingNo === id;
    });

    if (!sale) {
        alert("Transaction not found!");
        window.location.href = "index.html";
        return;
    }

    // Toggle labels based on type
    const lblTypeTitle = document.getElementById("lbl-inv-type-title");
    const lblNoLabel = document.getElementById("lbl-inv-no-label");
    const lblPartyType = document.getElementById("lbl-inv-party-type");
    const lblAddPaymentTitle = document.getElementById("lbl-add-payment-title");
    const lblPaymentAmt = document.getElementById("lbl-payment-amount-label");
    const lblProgressTitle = document.getElementById("lbl-progress-title");
    const lblProgressReceived = document.getElementById("lbl-progress-received");

    if (currentTransactionType === 'sales') {
        lblTypeTitle.textContent = "Sale Entry Invoice Receipt";
        lblNoLabel.innerHTML = `Selling No: <strong id="lbl-inv-selling-no">#${sale.sellingNo}</strong>`;
        lblPartyType.textContent = "Buyer Party";
        lblAddPaymentTitle.textContent = "Add Payment Entry";
        lblPaymentAmt.innerHTML = `Received Amount (₹) <span class="required">*</span>`;
        lblProgressTitle.textContent = "Overall Payment Progress";
        lblProgressReceived.innerHTML = `Received: <strong id="det-total-paid">₹0.00</strong>`;
    } else if (currentTransactionType === 'polish_sales') {
        lblTypeTitle.textContent = "Polish Sale Entry Invoice Receipt";
        lblNoLabel.innerHTML = `Selling No: <strong id="lbl-inv-selling-no">#${sale.sellingNo}</strong>`;
        lblPartyType.textContent = "Buyer Party";
        lblAddPaymentTitle.textContent = "Add Payment Entry";
        lblPaymentAmt.innerHTML = `Received Amount (₹) <span class="required">*</span>`;
        lblProgressTitle.textContent = "Overall Payment Progress";
        lblProgressReceived.innerHTML = `Received: <strong id="det-total-paid">₹0.00</strong>`;
    } else if (currentTransactionType === 'box_selling') {
        lblTypeTitle.textContent = "Box Selling Invoice Receipt";
        lblNoLabel.innerHTML = `Selling No: <strong id="lbl-inv-selling-no">#${sale.sellingNo} (Box ${sale.boxId})</strong>`;
        lblPartyType.textContent = "Buyer Party";
        lblAddPaymentTitle.textContent = "Add Payment Entry";
        lblPaymentAmt.innerHTML = `Received Amount (₹) <span class="required">*</span>`;
        lblProgressTitle.textContent = "Overall Payment Progress";
        lblProgressReceived.innerHTML = `Received: <strong id="det-total-paid">₹0.00</strong>`;
    } else if (currentTransactionType === 'polish_buys') {
        lblTypeTitle.textContent = "Polish Purchase Entry Receipt";
        lblNoLabel.innerHTML = `Buying No: <strong id="lbl-inv-selling-no">#${sale.buyingNo}</strong>`;
        lblPartyType.textContent = "Seller Party";
        lblAddPaymentTitle.textContent = "Record Payment Paid";
        lblPaymentAmt.innerHTML = `Paid Amount (₹) <span class="required">*</span>`;
        lblProgressTitle.textContent = "Overall Paid Progress";
        lblProgressReceived.innerHTML = `Paid: <strong id="det-total-paid">₹0.00</strong>`;
    } else {
        // buys
        lblTypeTitle.textContent = "Purchase Entry Receipt";
        lblNoLabel.innerHTML = `Buying No: <strong id="lbl-inv-selling-no">#${sale.buyingNo}</strong>`;
        lblPartyType.textContent = "Seller Party";
        lblAddPaymentTitle.textContent = "Record Payment Paid";
        lblPaymentAmt.innerHTML = `Paid Amount (₹) <span class="required">*</span>`;
        lblProgressTitle.textContent = "Overall Paid Progress";
        lblProgressReceived.innerHTML = `Paid: <strong id="det-total-paid">₹0.00</strong>`;
    }

    // Populate Invoice details
    const transactionNo = isSaleType() ? sale.sellingNo : sale.buyingNo;
    const transactionDate = isSaleType() ? sale.sellingDate : sale.buyingDate;

    document.getElementById("details-invoice-no").textContent = `#${String(transactionNo).padStart(4, '0')}`;
    document.getElementById("lbl-inv-date").textContent = formatDateToLocale(transactionDate);

    const deadlineDate = sale.deadlineDate || calculateDeadlineDate(transactionDate, sale.deadlineDays || 30);
    document.getElementById("lbl-inv-deadline").textContent = formatDateToLocale(deadlineDate);
    document.getElementById("lbl-inv-party").textContent = sale.partyName;
    document.getElementById("lbl-inv-dalal").textContent = sale.dalal;
    
    if (sale.currencyType === "Dollar") {
        document.getElementById("lbl-inv-currency-details").textContent = `Currency: Dollar ($${Math.round(sale.totalDollar)} @ ${Math.round(sale.dollarRate)})`;
    } else {
        document.getElementById("lbl-inv-currency-details").textContent = "Currency: Rupees (₹)";
    }

    document.getElementById("lbl-inv-pcs").textContent = sale.pieces;
    document.getElementById("lbl-inv-carat").textContent = sale.carat.toFixed(3);
    document.getElementById("lbl-inv-price").textContent = formatCurrency(sale.price);
    document.getElementById("lbl-inv-total-price").textContent = formatCurrency(sale.totalPrice);
    
    document.getElementById("lbl-inv-gross").textContent = formatCurrency(sale.totalPrice);
    document.getElementById("lbl-inv-discount-pct").textContent = sale.discount;
    document.getElementById("lbl-inv-discount-amt").textContent = formatCurrency(calculateDiscountAmount(sale.totalPrice, sale.discount));
    document.getElementById("lbl-inv-discounted-total").textContent = formatCurrency(sale.discountedAmount);

    // Dalali row visibility — shown for Rough Buys and Polish Sales only
    const rowDalali = document.getElementById("row-inv-dalali");
    if (hasDalali()) {
        if (rowDalali) rowDalali.style.display = "flex";
        document.getElementById("lbl-inv-dalali-pct").textContent = sale.dalali;
        document.getElementById("lbl-inv-dalali-amt").textContent = formatCurrency(sale.dalaliAmount);
    } else {
        if (rowDalali) rowDalali.style.display = "none";
    }

    // GST rate label (dynamic: 0.25% for rough, 1.5% for polish)
    const gstLabelEl = document.getElementById("lbl-inv-gst-rate-desc");
    if (gstLabelEl) gstLabelEl.textContent = getGSTLabel();

    document.getElementById("lbl-inv-bill-pct").textContent = sale.billPercentage;
    document.getElementById("lbl-inv-cash-pct").textContent = 100 - sale.billPercentage;
    document.getElementById("lbl-inv-bill-base").textContent = formatCurrency(calculateBillAmount(sale.discountedAmount, sale.billPercentage));
    document.getElementById("lbl-inv-gst").textContent = formatCurrency(sale.gst);
    document.getElementById("lbl-inv-net-bill").textContent = formatCurrency(sale.netBillAmount);
    document.getElementById("lbl-inv-net-cash").textContent = formatCurrency(sale.netCashAmount);
    document.getElementById("lbl-inv-final").textContent = formatCurrency(sale.finalAmount);

    // Populate payment type options dynamically
    const paymentTypeSelect = document.getElementById("payment-type");
    paymentTypeSelect.innerHTML = "";
    
    const optBill = document.createElement("option");
    optBill.value = "Bill";
    optBill.textContent = "Bill Account";
    paymentTypeSelect.appendChild(optBill);

    const optCash = document.createElement("option");
    optCash.value = "Cash";
    optCash.textContent = "Cash Account";
    paymentTypeSelect.appendChild(optCash);

    if (hasDalali() && (sale.dalaliAmount || 0) > 0) {
        const optDalali = document.createElement("option");
        optDalali.value = "Dalali";
        optDalali.textContent = "Brokerage (Dalali) Account";
        paymentTypeSelect.appendChild(optDalali);
    }

    // Render payment entries and ledger
    renderLedgerDetails(sale);
}

function renderLedgerDetails(sale) {
    const billPaid = sale.payments.filter(p => p.type === 'Bill').reduce((sum, p) => sum + p.amount, 0);
    const cashPaid = sale.payments.filter(p => p.type === 'Cash').reduce((sum, p) => sum + p.amount, 0);
    const dalaliPaid = sale.payments.filter(p => p.type === 'Dalali').reduce((sum, p) => sum + p.amount, 0);

    const billRem = Math.max(0, Math.round(sale.netBillAmount - billPaid));
    const cashRem = Math.max(0, Math.round(sale.netCashAmount - cashPaid));
    const dalaliRem = Math.max(0, Math.round((sale.dalaliAmount || 0) - dalaliPaid));
    
    const totalPaid = Math.round(billPaid + cashPaid + dalaliPaid);
    const totalOutstanding = calculateOutstandingAmount(sale.finalAmount, totalPaid);
    const paymentPct = sale.finalAmount > 0 ? Math.min(100, (totalPaid / sale.finalAmount) * 100) : 0;

    // Render numbers in ledger panels
    document.getElementById("det-bill-bal").textContent = formatCurrency(sale.netBillAmount);
    document.getElementById("det-bill-paid").textContent = formatCurrency(billPaid);
    document.getElementById("det-bill-rem").textContent = formatCurrency(billRem);

    document.getElementById("det-cash-bal").textContent = formatCurrency(sale.netCashAmount);
    document.getElementById("det-cash-paid").textContent = formatCurrency(cashPaid);
    document.getElementById("det-cash-rem").textContent = formatCurrency(cashRem);

    // Render Brokerage (Dalali) card
    const cardDalali = document.getElementById("card-dalali-bal");
    if (hasDalali() && (sale.dalaliAmount || 0) > 0) {
        if (cardDalali) cardDalali.style.display = "block";
        document.getElementById("det-dalali-bal").textContent = formatCurrency(sale.dalaliAmount);
        document.getElementById("det-dalali-paid").textContent = formatCurrency(dalaliPaid);
        document.getElementById("det-dalali-rem").textContent = formatCurrency(dalaliRem);
    } else {
        if (cardDalali) cardDalali.style.display = "none";
    }

    document.getElementById("det-payment-pct").textContent = `${paymentPct.toFixed(1)}% Paid`;
    document.getElementById("det-progress-bar").style.width = `${paymentPct}%`;
    document.getElementById("det-total-paid").textContent = formatCurrency(totalPaid);
    document.getElementById("det-total-outstanding").textContent = formatCurrency(totalOutstanding);

    // Status coloring of overall progress bar
    const bar = document.getElementById("det-progress-bar");
    bar.style.backgroundColor = "var(--color-danger)";
    if (paymentPct >= 100) {
        bar.style.backgroundColor = "var(--color-success)";
    } else if (paymentPct > 0) {
        bar.style.backgroundColor = "var(--color-warning)";
    }

    // Dynamic Deadline Progress Calculation
    const transactionDate = isSaleType() ? sale.sellingDate : sale.buyingDate;
    const deadlineDate = sale.deadlineDate || calculateDeadlineDate(transactionDate, sale.deadlineDays || 30);
    const todayStr = new Date().toISOString().split('T')[0];
    const msDiff = new Date(deadlineDate) - new Date(todayStr);
    const daysRemaining = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    
    document.getElementById("det-deadline-date").textContent = formatDateToLocale(deadlineDate);
    const daysLabel = document.getElementById("det-days-remaining");
    if (daysRemaining > 0) {
        daysLabel.textContent = `(${daysRemaining} Days Left)`;
        daysLabel.className = "text-muted";
    } else if (daysRemaining === 0) {
        daysLabel.textContent = `(Due Today)`;
        daysLabel.className = "text-orange font-weight-bold";
    } else {
        daysLabel.textContent = `(${Math.abs(daysRemaining)} Days Overdue)`;
        daysLabel.className = "text-danger font-weight-bold";
    }

    // Render payment history list
    const tbody = document.getElementById("payment-history-body");
    tbody.innerHTML = "";

    if (sale.payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No payments logged yet.</td></tr>`;
        return;
    }

    sale.payments.forEach(payment => {
        const tr = document.createElement("tr");
        let badgeClass = 'badge-warning';
        if (payment.type === 'Bill') {
            badgeClass = 'badge-success';
        } else if (payment.type === 'Dalali') {
            badgeClass = 'badge-info';
        }
        tr.innerHTML = `
            <td>${formatDateToLocale(payment.date)}</td>
            <td><span class="badge ${badgeClass}">${payment.type}</span></td>
            <td class="text-right font-weight-bold">${formatCurrency(payment.amount)}</td>
            <td>
                <button class="btn btn-danger btn-compact" onclick="deletePayment('${payment.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupPaymentValidation() {
    const amountInput = document.getElementById("payment-amount");

    amountInput.addEventListener("input", () => {
        const val = parseFloat(amountInput.value);
        if (val < 0) {
            amountInput.value = 0;
            alert("Payment amount cannot be negative!");
        } else if (!isNaN(val)) {
            amountInput.value = Math.round(val);
        }
    });
}

async function addPaymentEntry(event) {
    event.preventDefault();
    if (!currentActiveTransactionId) return;

    const saleIndex = currentTransactionList.findIndex(item => {
        return isSaleType() ? item.sellingNo === currentActiveTransactionId : item.buyingNo === currentActiveTransactionId;
    });
    if (saleIndex === -1) return;

    const sale = currentTransactionList[saleIndex];
    const type = document.getElementById("payment-type").value;
    const amount = Math.round(parseFloat(document.getElementById("payment-amount").value)) || 0;
    const date = document.getElementById("payment-date").value;

    // Validation checks
    if (amount <= 0 || isNaN(amount)) {
        alert("Please enter a valid payment amount greater than zero!");
        return;
    }

    if (!date) {
        alert("Please select a valid payment date!");
        return;
    }

    // Validate if the amount exceeds outstanding
    const billPaid = sale.payments.filter(p => p.type === 'Bill').reduce((sum, p) => sum + p.amount, 0);
    const cashPaid = sale.payments.filter(p => p.type === 'Cash').reduce((sum, p) => sum + p.amount, 0);
    const dalaliPaid = sale.payments.filter(p => p.type === 'Dalali').reduce((sum, p) => sum + p.amount, 0);
    
    const maxBillAllowed = Math.round(sale.netBillAmount - billPaid);
    const maxCashAllowed = Math.round(sale.netCashAmount - cashPaid);
    const maxDalaliAllowed = Math.round((sale.dalaliAmount || 0) - dalaliPaid);

    if (type === 'Bill' && amount > (maxBillAllowed + 0.01)) {
        if (!confirm(`Warning: Payment amount exceeds the remaining Bill Balance of ${formatCurrency(maxBillAllowed)}. Do you want to proceed?`)) {
            return;
        }
    }
    if (type === 'Cash' && amount > (maxCashAllowed + 0.01)) {
        if (!confirm(`Warning: Payment amount exceeds the remaining Cash Balance of ${formatCurrency(maxCashAllowed)}. Do you want to proceed?`)) {
            return;
        }
    }
    if (type === 'Dalali' && amount > (maxDalaliAllowed + 0.01)) {
        if (!confirm(`Warning: Payment amount exceeds the remaining Brokerage (Dalali) Balance of ${formatCurrency(maxDalaliAllowed)}. Do you want to proceed?`)) {
            return;
        }
    }

    const newPayment = {
        id: 'pay_' + Date.now(),
        date,
        type,
        amount
    };

    try {
        sale.payments.push(newPayment);
        await addPaymentOnServer(newPayment, currentTransactionType, currentActiveTransactionId);
        loadTransactionLedger(currentActiveTransactionId);
        
        // Clear form
        document.getElementById("payment-amount").value = "";
    } catch (e) {
        sale.payments = sale.payments.filter(p => p.id !== newPayment.id);
        alert("Could not add payment.\n\n" + e.message);
    }
}

async function deletePayment(paymentId) {
    if (!confirmRecordDeletePassword()) return;
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    
    const sale = currentTransactionList.find(item => {
        return isSaleType() ? item.sellingNo === currentActiveTransactionId : item.buyingNo === currentActiveTransactionId;
    });
    if (!sale) return;

    const existingPayments = [...sale.payments];
    sale.payments = sale.payments.filter(p => p.id !== paymentId);
    
    try {
        await deletePaymentOnServer(paymentId);
        await refreshAllDataFromServer();
        loadTransactionLedger(currentActiveTransactionId);
    } catch (e) {
        sale.payments = existingPayments;
        alert("Could not delete payment.\n\n" + e.message);
    }
}
