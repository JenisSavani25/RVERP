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
let partiesList = [];

// Polish shapes used in Surat → Mumbai transfers and vendor consignment
const POLISH_SHAPE_OPTIONS = [
    "FLOWER", "CALF", "MIX", "KITE", "M6", "PIE CUT MIX", "TAY", "TAPPER", "HEXA", "LOZENGE"
];

const POLISH_SHAPE_LABELS = {
    "FLOWER": "Flower",
    "CALF": "Calf",
    "MIX": "Mix",
    "KITE": "Kite",
    "M6": "M6",
    "PIE CUT MIX": "Pie cut mix",
    "TAY": "Tay",
    "TAPPER": "Tapper",
    "HEXA": "Hexa",
    "LOZENGE": "Lozenge"
};

function formatPolishShapeLabel(shape) {
    const key = (shape || "").trim().toUpperCase();
    return POLISH_SHAPE_LABELS[key] || key || "—";
}

/** Mumbai polish stock for a shape (from transfers minus pending vendor issues). */
function getPolishShapeAvailInMumbai(shapeName, extraStaged = []) {
    const shape = (shapeName || "").trim().toUpperCase();
    if (!shape) return 0;

    loadTransferData();
    loadIssueData();

    let qty = 0;

    transfersList.forEach(t => {
        if (t.itemType !== "Polish") return;
        if ((t.shapeName || "").toUpperCase() !== shape) return;
        const q = parseInt(t.quantity) || 0;
        if (t.toLocation === "Mumbai") qty += q;
        if (t.fromLocation === "Mumbai") qty -= q;
    });

    issuesList.forEach(iss => {
        if (iss.status !== "Pending") return;
        iss.items.forEach(item => {
            if (item.type !== "Polish") return;
            const s = (item.shapeName || item.lotId || "").toUpperCase();
            if (s !== shape) return;
            qty -= parseInt(item.quantity) || 0;
        });
    });

    extraStaged.forEach(item => {
        if (item.type !== "Polish") return;
        if ((item.shapeName || "").toUpperCase() !== shape) return;
        qty -= parseInt(item.quantity) || 0;
    });

    return Math.max(0, qty);
}

/** Per-shape Mumbai polish stock (from transfers + vendor consignments). */
function getPolishShapeStockDistribution() {
    loadTransferData();
    loadIssueData();

    const shapes = {};
    POLISH_SHAPE_OPTIONS.forEach(s => {
        shapes[s] = { shapeName: s, label: formatPolishShapeLabel(s), available: 0, vendor: 0, total: 0 };
    });

    const ensureShape = (raw) => {
        const key = (raw || "").trim().toUpperCase();
        if (!key) return null;
        if (!shapes[key]) {
            shapes[key] = { shapeName: key, label: formatPolishShapeLabel(key), available: 0, vendor: 0, total: 0 };
        }
        return shapes[key];
    };

    transfersList.forEach(t => {
        if (t.itemType !== "Polish") return;
        const s = ensureShape(t.shapeName || t.lotId);
        if (!s) return;
        const q = parseInt(t.quantity) || 0;
        if (t.toLocation === "Mumbai") s.available += q;
        if (t.fromLocation === "Mumbai") s.available -= q;
    });

    issuesList.forEach(iss => {
        if (iss.status !== "Pending") return;
        iss.items.forEach(item => {
            if (item.type !== "Polish") return;
            const s = ensureShape(item.shapeName || item.lotId);
            if (!s) return;
            const q = parseInt(item.quantity) || 0;
            s.vendor += q;
            s.available -= q;
        });
    });

    Object.values(shapes).forEach(s => {
        s.available = Math.max(0, s.available);
        s.total = s.available + s.vendor;
    });

    return shapes;
}
let isLoadedFromServer = false;
const ALL_DATA_CACHE_KEY = "rv_gems_all_data_cache_v1";
const ALL_DATA_CACHE_TTL_MS = 120000; // 2 minutes
let API_BASE_URL = localStorage.getItem("rv_gems_api_url");
if (!API_BASE_URL) {
    API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api/ERP'
        : 'https://rv-gems-backend.onrender.com/api/ERP'; // Default production URL
}

function applyServerState(data) {
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
    partiesList = data.partiesList || [];
    isLoadedFromServer = true;
}

function readCachedServerState() {
    try {
        const raw = sessionStorage.getItem(ALL_DATA_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.savedAt || !parsed.data) return null;
        if ((Date.now() - parsed.savedAt) > ALL_DATA_CACHE_TTL_MS) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

function writeCachedServerState(data) {
    try {
        sessionStorage.setItem(ALL_DATA_CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            data
        }));
    } catch {
        // Ignore storage quota/private mode errors
    }
}

function invalidateServerStateCache() {
    try {
        sessionStorage.removeItem(ALL_DATA_CACHE_KEY);
    } catch {
        // Ignore
    }
}

async function loadAllDataFromServer() {
    if (isLoadedFromServer) return;
    const cachedData = readCachedServerState();
    if (cachedData) {
        applyServerState(cachedData);
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/all-data`);
        if (!response.ok) throw new Error("HTTP error! status: " + response.status);
        const data = await response.json();
        applyServerState(data);
        writeCachedServerState(data);
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
        const sourceLoc = s.sourceLocation || 'Mumbai';
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

// ── Update (edit) existing transaction records ──
async function putRecordOnServer(path, data, label) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (networkErr) {
        throw new Error("Network/CORS error reaching the server: " + networkErr.message);
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected ${label} (HTTP ${response.status}): ${body}`);
    }
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

async function updateRoughBuyOnServer(buyingNo, data)   { return putRecordOnServer(`rough-buys/${buyingNo}`, data, "rough buy update"); }
async function updateRoughSaleOnServer(sellingNo, data) { return putRecordOnServer(`rough-sales/${sellingNo}`, data, "rough sale update"); }
async function updatePolishLotOnServer(buyingNo, data)  { return putRecordOnServer(`polish-lots/${buyingNo}`, data, "polish buy update"); }
async function updatePolishSaleOnServer(sellingNo, data){ return putRecordOnServer(`polish-sales/${sellingNo}`, data, "polish sale update"); }
async function updateBoxSaleOnServer(sellingNo, data)   { return putRecordOnServer(`box-sales/${sellingNo}`, data, "box sale update"); }

// ── Delete a transaction record by its records-tab type + id ──
async function deleteRecordOnServer(type, id) {
    const map = {
        buys: 'rough-buys',
        sales: 'rough-sales',
        polish_buys: 'polish-lots',
        polish_sales: 'polish-sales',
        box_selling: 'box-sales'
    };
    const path = map[type];
    if (!path) throw new Error("Unknown record type: " + type);

    let response;
    try {
        response = await fetch(`${API_BASE_URL}/${path}/${id}`, { method: 'DELETE' });
    } catch (networkErr) {
        throw new Error("Network/CORS error reaching the server: " + networkErr.message);
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected delete (HTTP ${response.status}): ${body}`);
    }
    invalidateServerStateCache();
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
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

async function updateVendorOnServer(vendorNo, vendor) {
    const response = await fetch(`${API_BASE_URL}/vendors/${encodeURIComponent(vendorNo)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendor)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected vendor update (HTTP ${response.status}): ${body}`);
    }
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

async function savePartyOnServer(party) {
    const response = await fetch(`${API_BASE_URL}/parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected party save (HTTP ${response.status}): ${body}`);
    }
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

async function updatePartyOnServer(id, party) {
    const response = await fetch(`${API_BASE_URL}/parties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(party)
    });
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Server rejected party update (HTTP ${response.status}): ${body}`);
    }
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

// ── Shared autocomplete helpers for party/dalal/vendor selection ──
// Names are merged from the master tables AND every transaction record, so the
// dropdowns stay populated even if the partiesList endpoint isn't deployed yet.
function getTxnLists() {
    return [buysList, salesList, polishBuysList, polishSalesList, boxSellingList];
}

function getPartyNameOptions() {
    const names = [];
    (partiesList || []).forEach(p => names.push(p.name));
    getTxnLists().forEach(list => (list || []).forEach(e => names.push(e.partyName)));
    const clean = names.map(n => (n || "").trim().toUpperCase()).filter(Boolean);
    return [...new Set(clean)].sort();
}

function getDalalNameOptions() {
    const names = [];
    (vendorsList || []).forEach(v => names.push(v.name));
    getTxnLists().forEach(list => (list || []).forEach(e => names.push(e.dalal)));
    const clean = names.map(n => (n || "").trim().toUpperCase()).filter(Boolean);
    return [...new Set(clean)].sort();
}

function getVendorLookupOptions() {
    return (vendorsList || []).map(v => ({
        value: v.vendorId,
        label: `${v.name} (${v.vendorType || "—"} - ${v.city || "—"})`,
        search: `${v.vendorId} ${v.name} ${v.vendorType || ""} ${v.city || ""} ${v.mobile || ""}`.toUpperCase()
    })).sort((a, b) => a.label.localeCompare(b.label));
}

function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function filterAutocompleteItems(items, query, max = 50) {
    const q = (query || "").trim().toUpperCase();
    if (!q) return items.slice(0, max);
    const starts = [];
    const includes = [];
    items.forEach(item => {
        const hay = (item.search != null ? item.search : item.label || item.value || "").toUpperCase();
        if (hay.startsWith(q)) starts.push(item);
        else if (hay.includes(q)) includes.push(item);
    });
    return [...starts, ...includes].slice(0, max);
}

const _autocompleteSetup = new Set();
const _autocompleteLookups = new Map();

/**
 * Type-to-filter autocomplete. getOptionsFn may return strings or {value, label, search?}.
 * Pass hiddenId when the visible label differs from the stored value (e.g. vendor pick).
 */
function initAutocomplete(inputId, getOptionsFn, config = {}) {
    const input = document.getElementById(inputId);
    if (!input || _autocompleteSetup.has(inputId)) return;
    _autocompleteSetup.add(inputId);
    if (config.hiddenId) _autocompleteLookups.set(inputId, getOptionsFn);

    const hidden = config.hiddenId ? document.getElementById(config.hiddenId) : null;
    const uppercase = config.uppercase !== false;

    let wrapper = input.closest(".name-autocomplete");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "name-autocomplete";
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
    }

    const list = document.createElement("div");
    list.className = "name-autocomplete-list hidden";
    list.setAttribute("role", "listbox");
    wrapper.appendChild(list);

    input.setAttribute("autocomplete", "off");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    if (config.placeholder) input.placeholder = config.placeholder;

    let activeIndex = -1;
    let currentItems = [];

    function normalizeItems(raw) {
        return (raw || []).map(item => {
            if (typeof item === "string") {
                const v = item.trim().toUpperCase();
                return { value: v, label: v, search: v };
            }
            const label = item.label || item.value || "";
            const value = item.value != null ? item.value : label;
            const search = item.search != null ? item.search : `${value} ${label}`;
            return { value, label, search };
        });
    }

    function getItems() {
        return normalizeItems(typeof getOptionsFn === "function" ? getOptionsFn() : []);
    }

    function setActive(idx) {
        activeIndex = idx;
        list.querySelectorAll(".name-autocomplete-item").forEach((el, i) => {
            el.classList.toggle("active", i === activeIndex);
        });
        const activeEl = list.querySelector(`.name-autocomplete-item[data-index="${activeIndex}"]`);
        if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
    }

    function selectItem(item) {
        input.value = item.label;
        if (hidden) hidden.value = item.value;
        list.classList.add("hidden");
        activeIndex = -1;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function renderList() {
        const all = getItems();
        currentItems = filterAutocompleteItems(all, input.value, config.maxResults || 50);
        activeIndex = -1;

        if (currentItems.length === 0) {
            const q = (input.value || "").trim();
            list.innerHTML = q
                ? `<div class="name-autocomplete-empty">No matches for "${escapeHtml(q)}"</div>`
                : `<div class="name-autocomplete-empty">No options available</div>`;
            list.classList.remove("hidden");
            return;
        }

        list.innerHTML = currentItems.map((item, i) =>
            `<div class="name-autocomplete-item" role="option" data-index="${i}" data-value="${escapeHtml(item.value)}" data-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</div>`
        ).join("");
        list.classList.remove("hidden");
    }

    input.addEventListener("input", () => {
        if (uppercase) {
            const pos = input.selectionStart;
            input.value = input.value.toUpperCase();
            input.setSelectionRange(pos, pos);
        }
        if (hidden) hidden.value = "";
        renderList();
    });

    input.addEventListener("focus", renderList);

    input.addEventListener("keydown", (e) => {
        if (list.classList.contains("hidden")) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") renderList();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(Math.min(activeIndex + 1, currentItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(activeIndex - 1, 0));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            selectItem(currentItems[activeIndex]);
        } else if (e.key === "Escape") {
            list.classList.add("hidden");
            activeIndex = -1;
        }
    });

    list.addEventListener("mousedown", (e) => {
        const row = e.target.closest(".name-autocomplete-item");
        if (!row) return;
        e.preventDefault();
        selectItem({
            value: row.dataset.value,
            label: row.dataset.label
        });
    });

    input.addEventListener("blur", () => {
        setTimeout(() => {
            list.classList.add("hidden");
            activeIndex = -1;
            if (!hidden) return;
            const typed = (input.value || "").trim().toUpperCase();
            if (!typed) {
                hidden.value = "";
                return;
            }
            const match = getItems().find(item =>
                (item.label || "").toUpperCase() === typed ||
                String(item.value || "").toUpperCase() === typed
            );
            if (match) {
                input.value = match.label;
                hidden.value = match.value;
            }
        }, 150);
    });
}

function setAutocompleteValue(inputId, value, hiddenId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const hidden = hiddenId ? document.getElementById(hiddenId) : null;
    const val = (value || "").trim();
    if (!val) {
        input.value = "";
        if (hidden) hidden.value = "";
        return;
    }
    if (hidden) {
        const getFn = _autocompleteLookups.get(inputId);
        const items = normalizeAutocompleteItemsForLookup(getFn ? getFn() : []);
        const match = items.find(item => String(item.value) === val || (item.label || "").toUpperCase() === val.toUpperCase());
        if (match) {
            input.value = match.label;
            hidden.value = match.value;
            return;
        }
        input.value = val.toUpperCase();
        hidden.value = val;
        return;
    }
    input.value = val.toUpperCase();
}

function normalizeAutocompleteItemsForLookup(raw) {
    return (raw || []).map(item => {
        if (typeof item === "string") {
            const v = item.trim().toUpperCase();
            return { value: v, label: v, search: v };
        }
        const label = item.label || item.value || "";
        const value = item.value != null ? item.value : label;
        const search = item.search != null ? item.search : `${value} ${label}`;
        return { value, label, search };
    });
}

function fillNameSelect(selectId, options, selectedValue) {
    const el = document.getElementById(selectId);
    if (!el) return;
    if (el.tagName === "INPUT") {
        setAutocompleteValue(selectId, selectedValue);
        return;
    }
    const current = (selectedValue != null ? selectedValue : el.value || "").trim().toUpperCase();
    let html = `<option value="">-- Select --</option>`;
    const list = (options || []).slice();
    if (current && !list.includes(current)) list.push(current);
    html += list.map(n => `<option value="${n}">${n}</option>`).join("");
    el.innerHTML = html;
    el.value = current;
}

// Populates #party-name and #dalal with type-to-filter lists (if present)
function populateEntityDropdowns(selectedParty, selectedDalal) {
    initAutocomplete("party-name", getPartyNameOptions, { placeholder: "Type to search party..." });
    initAutocomplete("dalal", getDalalNameOptions, { placeholder: "Type to search dalal..." });
    if (selectedParty) setAutocompleteValue("party-name", selectedParty);
    if (selectedDalal) setAutocompleteValue("dalal", selectedDalal);
}

function initVendorIssueAutocomplete(selectedVendorId) {
    initAutocomplete("issue-vendor-name", getVendorLookupOptions, {
        hiddenId: "issue-vendor-id",
        placeholder: "Type vendor name...",
        uppercase: false
    });
    if (selectedVendorId) {
        setAutocompleteValue("issue-vendor-name", selectedVendorId, "issue-vendor-id");
    } else if (vendorsList.length > 0) {
        setAutocompleteValue("issue-vendor-name", vendorsList[0].vendorId, "issue-vendor-id");
    }
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
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
    invalidateServerStateCache();
    return response.json().catch(() => ({}));
}

