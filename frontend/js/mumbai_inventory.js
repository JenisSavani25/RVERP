// --- MUMBAI INVENTORY LOGIC ---

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    renderMumbaiInventory();
});

function renderMumbaiInventory() {
    const polishLots = getPolishStockDistribution();
    const dabbis = getDabbiStockDistribution();

    // 1. Render Polish Inventory
    const polishTbody = document.getElementById("mumbai-polish-body");
    const polishEmpty = document.getElementById("mumbai-polish-empty");
    polishTbody.innerHTML = "";

    let totalMumbaiPolish = 0;
    let availMumbaiPolish = 0;
    let issuedMumbaiPolish = 0;
    let polishCount = 0;

    // Sort lots by lotId
    const sortedLotIds = Object.keys(polishLots).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedLotIds.forEach(lotId => {
        const lot = polishLots[lotId];
        const inMumbai = lot.Mumbai || 0;
        const withVendor = lot.Vendor || 0;
        const total = inMumbai + withVendor;

        if (total > 0) {
            totalMumbaiPolish += total;
            availMumbaiPolish += inMumbai;
            issuedMumbaiPolish += withVendor;
            polishCount++;

            const tr = document.createElement("tr");

            const tdLot = document.createElement("td");
            tdLot.innerHTML = `<strong>Polish Diamonds</strong>`;

            const tdTotal = document.createElement("td");
            tdTotal.className = "text-right";
            tdTotal.textContent = `${total} pcs`;
            tdTotal.style.fontWeight = "600";

            const tdIssued = document.createElement("td");
            tdIssued.className = "text-right";
            tdIssued.textContent = `${withVendor} pcs`;
            tdIssued.style.color = withVendor > 0 ? "#d97706" : "#64748b";

            const tdAvail = document.createElement("td");
            tdAvail.className = "text-right";
            tdAvail.textContent = `${inMumbai} pcs`;
            tdAvail.style.color = inMumbai > 0 ? "#16a34a" : "#64748b";
            tdAvail.style.fontWeight = "600";

            const tdStatus = document.createElement("td");
            if (inMumbai > 0) {
                tdStatus.innerHTML = `<span class="status-badge available">Available</span>`;
            } else {
                tdStatus.innerHTML = `<span class="status-badge issued">Fully Issued</span>`;
            }

            tr.appendChild(tdLot);
            tr.appendChild(tdTotal);
            tr.appendChild(tdIssued);
            tr.appendChild(tdAvail);
            tr.appendChild(tdStatus);

            polishTbody.appendChild(tr);
        }
    });

    if (polishCount === 0) {
        polishEmpty.classList.remove("hidden");
    } else {
        polishEmpty.classList.add("hidden");
    }

    // 2. Render Dabbi Inventory
    const dabbiTbody = document.getElementById("mumbai-dabbi-body");
    const dabbiEmpty = document.getElementById("mumbai-dabbi-empty");
    dabbiTbody.innerHTML = "";

    let totalMumbaiDabbis = 0;
    let availMumbaiDabbis = 0;
    let issuedMumbaiDabbis = 0;
    let dabbiCount = 0;

    // Sort boxes by boxId
    const sortedDabbiIds = Object.keys(dabbis).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedDabbiIds.forEach(boxId => {
        const box = dabbis[boxId];
        
        // Show if physically in Mumbai or issued to a vendor from Mumbai
        const inMumbai = box.location === "Mumbai";
        const withVendor = box.location === "Vendor";

        if (inMumbai || withVendor) {
            totalMumbaiDabbis++;
            if (inMumbai) availMumbaiDabbis++;
            if (withVendor) issuedMumbaiDabbis++;
            dabbiCount++;

            const tr = document.createElement("tr");

            const tdId = document.createElement("td");
            tdId.innerHTML = `<strong>${box.boxId}</strong>`;

            const tdShape = document.createElement("td");
            tdShape.textContent = box.shape1 || "—";

            const tdCarat = document.createElement("td");
            tdCarat.className = "text-right";
            tdCarat.textContent = `${box.carat.toFixed(2)} ct`;

            const tdStatus = document.createElement("td");
            if (inMumbai) {
                tdStatus.innerHTML = `<span class="status-badge available">Available</span>`;
            } else {
                tdStatus.innerHTML = `<span class="status-badge issued" title="Issue: ${box.issueNo}">Issued to ${box.vendorName}</span>`;
            }

            const tdAvail = document.createElement("td");
            tdAvail.style.fontWeight = "600";
            if (inMumbai) {
                tdAvail.textContent = "Yes";
                tdAvail.style.color = "#16a34a";
            } else {
                tdAvail.textContent = "No";
                tdAvail.style.color = "#dc2626";
            }

            tr.appendChild(tdId);
            tr.appendChild(tdShape);
            tr.appendChild(tdCarat);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAvail);

            dabbiTbody.appendChild(tr);
        }
    });

    if (dabbiCount === 0) {
        dabbiEmpty.classList.remove("hidden");
    } else {
        dabbiEmpty.classList.add("hidden");
    }

    // 3. Update Summary Widgets
    document.getElementById("sum-mumbai-polish").textContent = `${totalMumbaiPolish} pcs`;
    document.getElementById("sum-mumbai-polish-detail").textContent = `${availMumbaiPolish} Available | ${issuedMumbaiPolish} Issued`;

    document.getElementById("sum-mumbai-dabbis").textContent = `${totalMumbaiDabbis} boxes`;
    document.getElementById("sum-mumbai-dabbis-detail").textContent = `${availMumbaiDabbis} Available | ${issuedMumbaiDabbis} Issued`;
}
