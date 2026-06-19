// --- BOX MAKING ENTRY LOGIC ---

// ──────────────────────────────────────────────────────────────────────────────
// PRICE LOOKUP TABLES
// Each entry: [minimum_carat_for_bracket, price_per_carat_in_INR]
// Lookup logic: Find the LAST row where entry_carat <= given_carat → use that price.
// If given_carat is below all entries → use the first (minimum) price.
// Source: RV Gems internal diamond price reference table.
// ──────────────────────────────────────────────────────────────────────────────
const BOX_PRICE_TABLE = {

    // 2-Pointer (P_2)
    'P_2': [
        [0.10, 51500],  [0.25, 58500],  [0.30, 65500],  [0.35, 70000],
        [0.40, 76500],  [0.45, 81500],  [0.50, 89000],  [0.55, 95500],
        [0.60, 102500], [0.65, 107000], [0.70, 114000], [0.75, 120000],
        [0.80, 126500], [0.85, 131000], [0.90, 136500], [0.95, 141000],
        [1.00, 152500], [1.05, 158000], [1.10, 165000], [1.15, 172000],
        [1.20, 177000], [1.25, 183500], [1.30, 187000], [1.35, 194000],
        [1.40, 201000], [1.45, 207000], [1.50, 213000], [1.55, 218000]
    ],

    // 9-Pointer Round (R_9P)
    'R_9P': [
        [0.25, 48200], [0.50, 53800], [0.60, 59400], [0.70, 64400],
        [0.80, 70700], [0.90, 76300], [1.00, 81900], [1.10, 88200],
        [1.20, 93800], [1.30, 98800], [1.40, 104400], [1.50, 110700],
        [1.60, 116300], [1.70, 121900], [1.80, 126900]
    ],

    // 4-Pointer Round (R_4P)
    // NOTE: The 0.44ct value was estimated from the source table — please verify.
    'R_4P': [
        [0.10, 42900], [0.24, 46000], [0.28, 52500], [0.32, 55400],
        [0.36, 58250], [0.40, 61900], [0.44, 67150], [0.48, 70900],
        [0.52, 74650], [0.56, 78400], [0.60, 82500], [0.64, 86250],
        [0.68, 90000], [0.72, 90000], [0.76, 94400], [0.80, 98150]
    ],

    // Emerald (EM)
    'EM': [
        [0.10, 53800],  [0.41, 60700],  [0.51, 66300],  [0.61, 73800],
        [0.71, 78800],  [0.81, 83800],  [0.91, 90000],  [1.01, 95700],
        [1.11, 101300], [1.21, 105700], [1.31, 113800], [1.41, 119400],
        [1.51, 125000], [1.61, 130700], [1.71, 136300], [1.81, 140700],
        [1.91, 147500]
    ],

    // Heart (HEART)
    'HEART': [
        [0.125, 38650], [0.185, 41350], [0.245, 43750], [0.275, 46000],
        [0.305, 48550], [0.335, 51100], [0.365, 53450], [0.395, 56000],
        [0.425, 58550], [0.455, 61100], [0.485, 64150], [0.515, 66850],
        [0.545, 69450], [0.575, 72250], [0.605, 75200], [0.635, 78000],
        [0.665, 80950], [0.695, 83750], [0.725, 86550], [0.755, 89350]
    ],

    // Asscher / Square (AS)
    'AS': [
        [0.10, 53800],  [0.41, 60700],  [0.51, 66300],  [0.61, 73800],
        [0.71, 78800],  [0.81, 83800],  [0.91, 90000],  [1.01, 95700],
        [1.11, 101300], [1.21, 105700], [1.31, 113800], [1.41, 119400],
        [1.51, 125000], [1.61, 130700], [1.71, 136300], [1.81, 140700],
        [1.91, 147500]
    ],

    // Cross (CROSS)
    'CROSS': [
        [0.20, 58630],  [0.30, 63960],  [0.49, 69290],  [0.59, 74620],
        [0.69, 79950],  [0.79, 85280],  [0.89, 90610],  [0.99, 95940],
        [1.10, 101270], [1.20, 106600], [1.30, 111930], [1.40, 117260],
        [1.50, 122590], [1.60, 127920], [1.70, 133250], [1.80, 138580],
        [1.90, 143910], [2.00, 149240], [2.10, 159900], [2.20, 170560],
        [2.30, 181220], [2.40, 191880]
    ]
};

// ──────────────────────────────────────────────────────────────────────────────
// PRICE LOOKUP FUNCTION
// Returns { price, bracketCarat } for the given shape2 + carat.
// ──────────────────────────────────────────────────────────────────────────────
function lookupMPrice(shape2, carat) {
    const table = BOX_PRICE_TABLE[shape2];
    if (!table || table.length === 0) return { price: 0, bracketCarat: 0, found: false };

    const c = parseFloat(carat) || 0;
    if (c <= 0) return { price: 0, bracketCarat: 0, found: false };

    // Default to the first row price (below-minimum fallback)
    let price = table[0][1];
    let bracketCarat = table[0][0];

    for (let i = 0; i < table.length; i++) {
        if (c >= table[i][0]) {
            price = table[i][1];
            bracketCarat = table[i][0];
        } else {
            break;
        }
    }

    return { price, bracketCarat, found: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// FORM CALCULATIONS
// ──────────────────────────────────────────────────────────────────────────────
function calculateBoxValues() {
    const shape2  = document.getElementById("shape2").value;
    const carat   = parseFloat(document.getElementById("carat").value) || 0;
    const bracketCard = document.getElementById("price-bracket-card");
    const bracketText = document.getElementById("price-bracket-text");

    if (shape2 && carat > 0) {
        const result = lookupMPrice(shape2, carat);
        const mPrice = result.price;
        const mValue = Math.round(mPrice * carat);

        document.getElementById("m-price").value = formatCurrency(mPrice);
        document.getElementById("m-value").value  = formatCurrency(mValue);

        // Show bracket indicator
        bracketCard.classList.remove("hidden");
        bracketText.textContent =
            `Shape: ${shape2} | Carat entered: ${carat.toFixed(3)} ct ` +
            `→ Bracket ≥ ${result.bracketCarat.toFixed(3)} ct ` +
            `→ M.Price = ₹${result.price.toLocaleString('en-IN')}/ct`;

        // Sync preview chips
        document.getElementById("prev-shape2").textContent = shape2;
        document.getElementById("prev-carat").textContent  = carat.toFixed(3) + " ct";
        document.getElementById("prev-mprice").textContent = formatCurrency(mPrice) + "/ct";
        document.getElementById("prev-mvalue").textContent = formatCurrency(mValue);

    } else {
        document.getElementById("m-price").value = "₹0";
        document.getElementById("m-value").value  = "₹0";
        bracketCard.classList.add("hidden");

        document.getElementById("prev-shape2").textContent = "SHAPE2";
        document.getElementById("prev-carat").textContent  = "0.000 ct";
        document.getElementById("prev-mprice").textContent = "₹0/ct";
        document.getElementById("prev-mvalue").textContent = "₹0";
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// LIVE PREVIEW BAR UPDATE
// ──────────────────────────────────────────────────────────────────────────────
function updatePreviewBar() {
    const shape1 = (document.getElementById("shape1").value.trim().toUpperCase()) || "SHAPE1";
    const color  = (document.getElementById("color").value.trim().toUpperCase())  || "COLOR";
    const purity = (document.getElementById("purity").value.trim().toUpperCase()) || "PURITY";
    const mm     = (document.getElementById("mm").value.trim().toUpperCase())     || "MM";

    document.getElementById("prev-shape1").textContent = shape1;
    document.getElementById("prev-color").textContent  = color;
    document.getElementById("prev-purity").textContent = purity;
    document.getElementById("prev-mm").textContent     = mm;
}

// ──────────────────────────────────────────────────────────────────────────────
// ID PREVIEW
// ──────────────────────────────────────────────────────────────────────────────
function updateIdPreview() {
    const char = document.getElementById("id-char").value;
    const num  = document.getElementById("id-num").value;

    const fullId = num ? `${char}-${num}` : `${char} — ___`;
    document.getElementById("id-preview-display").textContent = fullId;
    document.getElementById("prev-id").textContent = fullId;

    // Real-time duplicate check
    const idNumInput = document.getElementById("id-num");
    if (num) {
        const combinedId = `${char}-${num}`;
        if (boxMakingList.some(item => item.idNo === combinedId)) {
            showFieldError(idNumInput, `ID ${combinedId} already exists!`);
        } else {
            clearFieldError(idNumInput);
        }
    }
}

// Auto-fill the next sequential ID number
function setNextIdNumber() {
    const maxNum = boxMakingList.reduce((max, item) => Math.max(max, parseInt(item.idNum) || 0), 0);
    document.getElementById("id-num").value = maxNum + 1;
    updateIdPreview();
}

// ──────────────────────────────────────────────────────────────────────────────
// FIELD ERROR HELPERS
// ──────────────────────────────────────────────────────────────────────────────
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
// REALTIME VALIDATION SETUP
// ──────────────────────────────────────────────────────────────────────────────
function setupBoxValidation() {
    // Carat: no negatives, numeric only
    const caratInput = document.getElementById("carat");
    caratInput.addEventListener("input", () => {
        const val = parseFloat(caratInput.value);
        if (val < 0) {
            caratInput.value = 0;
            showFieldError(caratInput, "Carat cannot be negative.");
        } else {
            clearFieldError(caratInput);
        }
    });

    // ID number: duplicate check
    document.getElementById("id-num").addEventListener("input", updateIdPreview);
    document.getElementById("id-char").addEventListener("change", updateIdPreview);
}

// ──────────────────────────────────────────────────────────────────────────────
// FORM VALIDATION
// ──────────────────────────────────────────────────────────────────────────────
function validateBoxForm() {
    let isValid = true;

    // --- ID No ---
    const idNumInput  = document.getElementById("id-num");
    const idCharInput = document.getElementById("id-char");
    const idNum  = parseInt(idNumInput.value);
    const idChar = idCharInput.value;

    if (isNaN(idNum) || idNum <= 0) {
        showFieldError(idNumInput, "ID Number must be a positive integer.");
        isValid = false;
    } else {
        const combinedId = `${idChar}-${idNum}`;
        if (boxMakingList.some(item => item.idNo === combinedId)) {
            showFieldError(idNumInput, `ID ${combinedId} already exists.`);
            isValid = false;
        } else {
            clearFieldError(idNumInput);
        }
    }

    // --- Shape 1 ---
    const shape1Input = document.getElementById("shape1");
    if (!shape1Input.value.trim()) {
        showFieldError(shape1Input, "Shape 1 is required.");
        isValid = false;
    } else {
        clearFieldError(shape1Input);
    }

    // --- Color (optional) ---
    clearFieldError(document.getElementById("color"));

    // --- Purity (optional) ---
    clearFieldError(document.getElementById("purity"));

    // --- MM / Measurement (optional) ---
    clearFieldError(document.getElementById("mm"));

    // --- Shape 2 ---
    const shape2Input = document.getElementById("shape2");
    if (!shape2Input.value) {
        shape2Input.classList.add("invalid-input");
        isValid = false;
    } else {
        shape2Input.classList.remove("invalid-input");
    }

    // --- Carat ---
    const caratInput = document.getElementById("carat");
    const carat = parseFloat(caratInput.value);
    if (isNaN(carat) || carat <= 0) {
        showFieldError(caratInput, "Carat weight must be greater than 0.");
        isValid = false;
    } else {
        clearFieldError(caratInput);
    }

    return isValid;
}

// ──────────────────────────────────────────────────────────────────────────────
// SAVE ENTRY
// ──────────────────────────────────────────────────────────────────────────────
async function saveBoxEntry(event) {
    event.preventDefault();

    if (!validateBoxForm()) {
        alert("Please fix all highlighted errors before saving.");
        return;
    }

    const idChar = document.getElementById("id-char").value;
    const idNum  = parseInt(document.getElementById("id-num").value);
    const idNo   = `${idChar}-${idNum}`;

    const shape1 = document.getElementById("shape1").value.trim().toUpperCase();
    const color  = document.getElementById("color").value.trim().toUpperCase();
    const purity = document.getElementById("purity").value.trim().toUpperCase();
    const mm     = document.getElementById("mm").value.trim().toUpperCase();
    const shape2 = document.getElementById("shape2").value;
    const carat  = parseFloat(document.getElementById("carat").value) || 0;

    const result = lookupMPrice(shape2, carat);
    const mPrice = result.price;
    const mValue = Math.round(mPrice * carat);

    const newEntry = {
        idNo,
        idChar,
        idNum,
        shape1,
        color,
        purity,
        mm,
        shape2,
        carat,
        mPrice,
        mValue,
        createdAt: new Date().toISOString()
    };

    try {
        boxMakingList.push(newEntry);
        await saveBoxOnServer(newEntry);
        // Redirect only when server confirms save
        window.location.href = "index.html";
    } catch (e) {
        // Keep local list aligned with server persistence on failure
        boxMakingList = boxMakingList.filter(item => item.idNo !== newEntry.idNo);
        alert("Could not save this box making entry.\n\n" + e.message);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// INITIALISATION
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    loadBoxMakingData();
    setNextIdNumber();
    calculateBoxValues();
    updatePreviewBar();
    setupBoxValidation();
});
