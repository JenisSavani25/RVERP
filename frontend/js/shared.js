// --- SHARED DATA STATE & PERSISTENCE ---
let salesList = [];
let buysList = [];
let polishSalesList = [];
let polishBuysList = [];
let boxMakingList = [];
let boxSellingList = [];
let conversionList = [];
let transfersList = [];
let vendorsList = [];
let issuesList = [];
let isLoadedFromServer = false;
let API_BASE_URL = localStorage.getItem("rv_gems_api_url");
if (!API_BASE_URL) {
    API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api/ERP'
        : 'https://rv-gems-backend.onrender.com/api/ERP'; // Default production URL
}

async function loadAllDataFromServer() {
    if (isLoadedFromServer) return;
    try {
        const response = await fetch(`${API_BASE_URL}/all-data`);
        if (!response.ok) throw new Error("HTTP error! status: " + response.status);
        const data = await response.json();
        salesList = data.salesList || [];
        buysList = data.buysList || [];
        polishSalesList = data.polishSalesList || [];
        polishBuysList = data.polishBuysList || [];
        boxMakingList = data.boxMakingList || [];
        boxSellingList = data.boxSellingList || [];
        conversionList = data.conversionList || [];
        transfersList = data.transfersList || [];
        vendorsList = data.vendorsList || [];
        issuesList = data.issuesList || [];
        isLoadedFromServer = true;
        console.log("ERP state loaded successfully from PostgreSQL backend!");
    } catch (e) {
        console.error("Backend fetch failed, falling back to LocalStorage:", e);
    }
}

// One-time migration to clear historical sample and seeded data from LocalStorage
if (typeof localStorage !== 'undefined' && localStorage.getItem("rv_gems_clean_slate_v2") === null) {
    const keysToClear = [
        "rv_gems_sales",
        "rv_gems_buys",
        "rv_gems_polish_sales",
        "rv_gems_polish_buys",
        "rv_gems_box_making",
        "rv_gems_box_selling",
        "rv_gems_conversions",
        "rv_gems_transfers",
        "rv_gems_vendors",
        "rv_gems_issues",
        "rv_gems_clean_slate"
    ];
    keysToClear.forEach(key => localStorage.removeItem(key));
    localStorage.setItem("rv_gems_clean_slate_v2", "true");
}

// Load Polish Sales Data
function loadPolishSalesData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_polish_sales");
    if (data) {
        try {
            polishSalesList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing polish sales storage", e);
            polishSalesList = [];
        }
    } else {
        polishSalesList = [];
        savePolishSalesData();
    }
}

// Save Polish Sales Data
function savePolishSalesData() {
    localStorage.setItem("rv_gems_polish_sales", JSON.stringify(polishSalesList));
}

// Load Polish Buys Data
function loadPolishBuysData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_polish_buys");
    if (data) {
        try {
            polishBuysList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing polish buys storage", e);
            polishBuysList = [];
        }
    } else {
        polishBuysList = [];
        savePolishBuysData();
    }
}

// Save Polish Buys Data
function savePolishBuysData() {
    localStorage.setItem("rv_gems_polish_buys", JSON.stringify(polishBuysList));
}

// Load Sales Data
function loadSalesData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_sales");
    if (data) {
        try {
            salesList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing sales storage", e);
            salesList = [];
        }
    } else {
        salesList = [];
        saveSalesData();
    }
}

// Save Sales Data
function saveSalesData() {
    localStorage.setItem("rv_gems_sales", JSON.stringify(salesList));
}

// Load Buys Data
function loadBuysData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_buys");
    if (data) {
        try {
            buysList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing buys storage", e);
            buysList = [];
        }
    } else {
        buysList = [];
        saveBuysData();
    }
}

// Save Buys Data
function saveBuysData() {
    localStorage.setItem("rv_gems_buys", JSON.stringify(buysList));
}

// --- REUSABLE CALCULATION SERVICE ENGINE ---

function calculatePrice(totalDollar, dollarRate) {
    const dollars = Math.max(0, parseFloat(totalDollar) || 0);
    const rate = Math.max(0, parseFloat(dollarRate) || 0);
    return Math.round(dollars * rate);
}

function calculateTotalPrice(carat, price) {
    const weight = Math.max(0, parseFloat(carat) || 0);
    const ratePrice = Math.max(0, parseFloat(price) || 0);
    return Math.round(weight * ratePrice);
}

function calculateDiscountAmount(totalPrice, discountPct) {
    const total = Math.max(0, parseFloat(totalPrice) || 0);
    const pct = Math.max(0, Math.min(100, parseFloat(discountPct) || 0));
    return Math.round(total * (pct / 100));
}

function calculateDiscountedAmount(totalPrice, discountAmount) {
    const total = Math.max(0, parseFloat(totalPrice) || 0);
    const disc = Math.max(0, parseFloat(discountAmount) || 0);
    return Math.round(Math.max(0, total - disc));
}

function calculateDalaliAmount(discountedAmount, dalaliPct) {
    const base = Math.max(0, parseFloat(discountedAmount) || 0);
    const pct = Math.max(0, Math.min(100, parseFloat(dalaliPct) || 0));
    return Math.round(base * (pct / 100));
}

function calculateBillAmount(discountedAmount, billPct) {
    const base = Math.max(0, parseFloat(discountedAmount) || 0);
    const pct = Math.max(0, Math.min(100, parseFloat(billPct) || 0));
    return Math.round(base * (pct / 100));
}

function calculateCashAmount(discountedAmount, billAmount) {
    const base = Math.max(0, parseFloat(discountedAmount) || 0);
    const bill = Math.max(0, parseFloat(billAmount) || 0);
    return Math.round(Math.max(0, base - bill));
}

function calculateGST(billAmount, rate = 0.0025) {
    const bill = Math.max(0, parseFloat(billAmount) || 0);
    return Math.round(bill * rate);
}

function calculateNetBillAmount(billAmount, gst) {
    const bill = Math.max(0, parseFloat(billAmount) || 0);
    const tax = Math.max(0, parseFloat(gst) || 0);
    return Math.round(bill + tax);
}

function calculateFinalAmount(netBill, netCash, dalaliAmt) {
    const bill = Math.max(0, parseFloat(netBill) || 0);
    const cash = Math.max(0, parseFloat(netCash) || 0);
    const broker = Math.max(0, parseFloat(dalaliAmt) || 0);
    return Math.round(bill + cash + broker);
}

// Outstanding = Final Amount - Paid Amount
function calculateOutstandingAmount(finalAmount, paidAmount) {
    const final = Math.max(0, parseFloat(finalAmount) || 0);
    const paid = Math.max(0, parseFloat(paidAmount) || 0);
    return Math.round(Math.max(0, final - paid));
}

// Calculate Date + Days
function calculateDeadlineDate(dateStr, days) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + (parseInt(days) || 0));
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// --- UTILITY FORMATTERS ---

// Converts YYYY-MM-DD to DD/MM/YYYY
function formatDateToLocale(dateString) {
    if (!dateString) return "-";
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}



// Formats number to Indian Rupee format style (₹53,683)
function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) val = 0;
    
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    return formatter.format(Math.round(val));
}

// Load Box Making Data
function loadBoxMakingData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_box_making");
    if (data) {
        try {
            boxMakingList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing box making storage", e);
            boxMakingList = [];
        }
    } else {
        boxMakingList = [];
        saveBoxMakingData();
    }
    // Seeding has been removed to start with a completely clean database
    // if (typeof window !== 'undefined') {
    //     seedBoxMakingEntries();
    // }
}

// Save Box Making Data
function saveBoxMakingData() {
    localStorage.setItem("rv_gems_box_making", JSON.stringify(boxMakingList));
}

// Load Box Selling Data
function loadBoxSellingData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_box_selling");
    if (data) {
        try {
            boxSellingList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing box selling storage", e);
            boxSellingList = [];
        }
    } else {
        boxSellingList = [];
        saveBoxSellingData();
    }
}


// Save Box Selling Data
function saveBoxSellingData() {
    localStorage.setItem("rv_gems_box_selling", JSON.stringify(boxSellingList));
}

// Load Rough→Polish Conversion Data
function loadConversionData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_conversions");
    if (data) {
        try {
            conversionList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing conversion storage", e);
            conversionList = [];
        }
    } else {
        conversionList = [];
        saveConversionData();
    }
}

// Save Conversion Data
function saveConversionData() {
    localStorage.setItem("rv_gems_conversions", JSON.stringify(conversionList));
}

// Load Transfer Data
function loadTransferData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_transfers");
    if (data) {
        try {
            transfersList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing transfers storage", e);
            transfersList = [];
        }
    } else {
        transfersList = [];
        saveTransferData();
    }
}

// Save Transfer Data
function saveTransferData() {
    localStorage.setItem("rv_gems_transfers", JSON.stringify(transfersList));
}

// Load Vendor Master Data
function loadVendorData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_vendors");
    if (data) {
        try {
            vendorsList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing vendors storage", e);
            vendorsList = [];
        }
    } else {
        vendorsList = [];
        saveVendorData();
    }
}

// Save Vendor Master Data
function saveVendorData() {
    localStorage.setItem("rv_gems_vendors", JSON.stringify(vendorsList));
}

// Load Vendor Issue Data
function loadIssueData() {
    if (isLoadedFromServer) return;
    const data = localStorage.getItem("rv_gems_issues");
    if (data) {
        try {
            issuesList = JSON.parse(data);
        } catch (e) {
            console.error("Error parsing issues storage", e);
            issuesList = [];
        }
    } else {
        issuesList = [];
        saveIssueData();
    }
}

// Save Vendor Issue Data
function saveIssueData() {
    localStorage.setItem("rv_gems_issues", JSON.stringify(issuesList));
}

// Get Polish Lot Stock Distribution
function getPolishStockDistribution() {
    loadBuysData();
    loadPolishBuysData();
    loadPolishSalesData();
    loadConversionData();
    loadBoxMakingData();
    loadTransferData();
    loadIssueData();

    let totalBoughtPcs = 0;
    let totalBoughtCt = 0;

    polishBuysList.forEach(b => {
        totalBoughtPcs += parseInt(b.pieces) || 0;
        totalBoughtCt += parseFloat(b.carat) || 0;
    });

    let totalConvPcs = 0;
    let totalConvCt = 0;
    conversionList.forEach(c => {
        const qty = parseInt(c.polishPieces) || 0;
        totalConvPcs += qty;
        totalConvCt += qty * 0.1; // approximate carat weight
    });

    let suratPcs = totalBoughtPcs + totalConvPcs;
    let mumbaiPcs = 0;
    let vendorPcs = 0;
    let soldPcs = 0;

    // Apply Box Making (deducts 2 pieces from Surat)
    const boxMakingDeductions = boxMakingList.length * 2;
    suratPcs = Math.max(0, suratPcs - boxMakingDeductions);

    // Apply Transfers
    transfersList.forEach(t => {
        if (t.itemType !== 'Polish') return;
        const qty = parseInt(t.quantity) || 0;
        const from = t.fromLocation;
        const to = t.toLocation;
        if (from === 'Surat') {
            suratPcs = Math.max(0, suratPcs - qty);
        } else if (from === 'Mumbai') {
            mumbaiPcs = Math.max(0, mumbaiPcs - qty);
        }
        if (to === 'Surat') {
            suratPcs += qty;
        } else if (to === 'Mumbai') {
            mumbaiPcs += qty;
        }
    });

    // Apply Vendor Issues
    issuesList.forEach(iss => {
        const isPending = iss.status === 'Pending';
        const isSold = iss.status === 'Sold';

        iss.items.forEach(item => {
            if (item.type !== 'Polish') return;
            const qty = parseInt(item.quantity) || 0;
            if (isPending) {
                mumbaiPcs = Math.max(0, mumbaiPcs - qty);
                vendorPcs += qty;
            } else if (isSold) {
                mumbaiPcs = Math.max(0, mumbaiPcs - qty);
                // Sold and Total deductions are handled by Polish Sales
            }
        });
    });

    // Apply Polish Sales
    polishSalesList.forEach(s => {
        const qty = parseInt(s.pieces) || 0;
        const sourceLoc = s.sourceLocation || 'Surat';
        if (sourceLoc === 'Vendor') {
            vendorPcs = Math.max(0, vendorPcs - qty);
        } else if (sourceLoc === 'Mumbai') {
            mumbaiPcs = Math.max(0, mumbaiPcs - qty);
        } else {
            suratPcs = Math.max(0, suratPcs - qty);
        }
        soldPcs += qty;
    });

    const totalRemainingPcs = suratPcs + mumbaiPcs + vendorPcs;
    const totalCt = totalBoughtCt + totalConvCt;

    return {
        "POLISH": {
            lotId: "POLISH",
            label: "Polish Diamonds",
            carat: totalCt,
            Surat: suratPcs,
            Mumbai: mumbaiPcs,
            Vendor: vendorPcs,
            Sold: soldPcs,
            Total: totalRemainingPcs
        }
    };
}

// Get Dabbi/Box Location & Status Distribution
function getDabbiStockDistribution() {
    loadBoxMakingData();
    loadBoxSellingData();
    loadTransferData();
    loadIssueData();

    const dabbis = {}; // boxId -> { boxId, carat, mPrice, mValue, shape1, color, purity, mm, shape2, location, status, vendorName, issueNo }

    // 1. Start with all created boxes in Surat
    boxMakingList.forEach(bm => {
        dabbis[bm.idNo] = {
            boxId: bm.idNo,
            carat: parseFloat(bm.carat) || 0,
            mPrice: parseFloat(bm.mPrice) || 0,
            mValue: parseFloat(bm.mValue) || 0,
            shape1: bm.shape1,
            color: bm.color,
            purity: bm.purity,
            mm: bm.mm,
            shape2: bm.shape2,
            location: 'Surat',
            status: 'Available',
            vendorName: '',
            issueNo: ''
        };
    });

    // 2. Apply Transfers
    transfersList.forEach(t => {
        if (t.itemType !== 'Dabbi' || !t.boxIds) return;
        t.boxIds.forEach(id => {
            if (dabbis[id]) {
                dabbis[id].location = t.toLocation;
            }
        });
    });

    // 3. Apply Vendor Issues
    issuesList.forEach(iss => {
        const isPending = iss.status === 'Pending';
        const isReturned = iss.status === 'Returned';
        const isSold = iss.status === 'Sold';

        iss.items.forEach(item => {
            if (item.type !== 'Dabbi' || !dabbis[item.id]) return;
            const id = item.id;
            
            if (isPending) {
                dabbis[id].location = 'Vendor';
                dabbis[id].status = 'Issued';
                dabbis[id].vendorName = iss.vendorName;
                dabbis[id].issueNo = iss.issueNo;
            } else if (isReturned) {
                dabbis[id].location = 'Mumbai';
                dabbis[id].status = 'Available';
                dabbis[id].vendorName = '';
                dabbis[id].issueNo = '';
            } else if (isSold) {
                dabbis[id].location = 'Sold';
                dabbis[id].status = 'Sold';
            }
        });
    });

    // 4. Apply Box Sales
    boxSellingList.forEach(s => {
        if (s.items && Array.isArray(s.items)) {
            s.items.forEach(item => {
                if (dabbis[item.boxId]) {
                    dabbis[item.boxId].location = 'Sold';
                    dabbis[item.boxId].status = 'Sold';
                    if (s.partyName) dabbis[item.boxId].soldTo = s.partyName;
                }
            });
        } else if (s.boxId) {
            if (dabbis[s.boxId]) {
                dabbis[s.boxId].location = 'Sold';
                dabbis[s.boxId].status = 'Sold';
                if (s.partyName) dabbis[s.boxId].soldTo = s.partyName;
            }
        }
    });

    return dabbis;
}

async function saveRoughBuyOnServer(newBuy) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/rough-buys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBuy)
        });
    } catch (networkErr) {
        // No response at all = network/CORS failure (request never completed)
        console.error("Rough Buy save: network/CORS failure", networkErr);
        throw new Error("Network/CORS error reaching the server: " + networkErr.message);
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(`Rough Buy save failed: HTTP ${response.status}`, body);
        throw new Error(`Server rejected save (HTTP ${response.status}): ${body}`);
    }
    console.log("Rough Buy saved successfully on server.");
    return response.json().catch(() => ({}));
}

async function saveRoughSaleOnServer(newSale) {
    const response = await fetch(`${API_BASE_URL}/rough-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected rough sale save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function savePolishLotOnServer(newBuy) {
    const response = await fetch(`${API_BASE_URL}/polish-lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuy)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected polish buy save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function savePolishSaleOnServer(newSale) {
    const response = await fetch(`${API_BASE_URL}/polish-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected polish sale save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function saveConversionOnServer(newConv) {
    const response = await fetch(`${API_BASE_URL}/conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConv)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected conversion save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function saveBoxOnServer(newEntry) {
    const response = await fetch(`${API_BASE_URL}/boxes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected box save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function saveBoxSaleOnServer(newSale) {
    const response = await fetch(`${API_BASE_URL}/box-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSale)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected box sale save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function saveTransferOnServer(newTransfer) {
    const response = await fetch(`${API_BASE_URL}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransfer)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected transfer save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function saveVendorOnServer(newVendor) {
    const response = await fetch(`${API_BASE_URL}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVendor)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected vendor save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function saveVendorIssueOnServer(newIssue) {
    const response = await fetch(`${API_BASE_URL}/vendor-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIssue)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected vendor issue save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function resolveVendorIssueOnServer(issueNo, lotId, pieces) {
    const response = await fetch(`${API_BASE_URL}/vendor-issues/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNo, status: 'Sold' })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected vendor issue resolve (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function addPaymentOnServer(newPayment, transactionType, transactionId) {
    const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentId: newPayment.id,
            date: newPayment.date,
            type: newPayment.type,
            amount: newPayment.amount,
            remarks: newPayment.remarks || '',
            transactionType,
            transactionId
        })
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected payment save (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function deletePaymentOnServer(paymentId) {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected payment delete (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

async function updateVendorIssueOnServer(issue) {
    const response = await fetch(`${API_BASE_URL}/vendor-issues/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected vendor issue update (HTTP ${response.status}): ${body}`);
    }
    return response.json().catch(() => ({}));
}

