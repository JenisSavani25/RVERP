// --- DASHBOARD MODULE LOGIC ---
let pendingReceivables = [];
let pendingPayables = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    // Set Header Date display to current date
    const today = new Date();
    document.getElementById("current-date-display").textContent = formatDateToLocale(today.toISOString().split('T')[0]);
    
    // Load all databases
    loadSalesData();
    loadBuysData();
    loadPolishSalesData();
    loadPolishBuysData();
    loadBoxMakingData();
    loadBoxSellingData();
    loadConversionData();
    
    // Render the Dashboard KPIs, widgets, and Payments Management
    renderDashboard();
});

function renderDashboard() {
    // 1. Calculate KPI totals (combined Rough + Polish + Box Selling)
    let totalSales = 0;
    let totalSalesReceived = 0;
    salesList.forEach(sale => {
        totalSales += sale.finalAmount;
        totalSalesReceived += sale.payments.reduce((sum, p) => sum + p.amount, 0);
    });
    polishSalesList.forEach(sale => {
        totalSales += sale.finalAmount;
        totalSalesReceived += sale.payments.reduce((sum, p) => sum + p.amount, 0);
    });
    boxSellingList.forEach(sale => {
        totalSales += sale.finalAmount;
        totalSalesReceived += sale.payments.reduce((sum, p) => sum + p.amount, 0);
    });
    const outstandingSales = calculateOutstandingAmount(totalSales, totalSalesReceived);

    let totalBuys = 0;
    let totalBuysPaid = 0;

    buysList.forEach(buy => {
        totalBuys += buy.finalAmount;
        totalBuysPaid += buy.payments.reduce((sum, p) => sum + p.amount, 0);
    });
    polishBuysList.forEach(buy => {
        totalBuys += buy.finalAmount;
        totalBuysPaid += buy.payments.reduce((sum, p) => sum + p.amount, 0);
    });
    const outstandingBuys = calculateOutstandingAmount(totalBuys, totalBuysPaid);

    // Update KPI UI
    document.getElementById("kpi-total-sales").textContent = formatCurrency(totalSales);
    document.getElementById("kpi-total-buys").textContent = formatCurrency(totalBuys);
    document.getElementById("kpi-outstanding-sales").textContent = formatCurrency(outstandingSales);
    document.getElementById("kpi-outstanding-buys").textContent = formatCurrency(outstandingBuys);

    // 2. Render Live Stock & Recent Activities Widgets
    renderDashboardWidgets();

    // 3. Compile Pending Receivables (Outstanding Sales)
    pendingReceivables = [];
    
    // Rough sales
    salesList.forEach(s => {
        const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = calculateOutstandingAmount(s.finalAmount, totalPaid);
        if (outstanding > 0) {
            pendingReceivables.push({
                id: s.sellingNo,
                ref: `S-${s.sellingNo}`,
                type: 'sales',
                moduleLabel: 'Rough Sale',
                partyName: s.partyName,
                dalal: s.dalal,
                carat: s.carat,
                finalAmount: s.finalAmount,
                totalPaid: totalPaid,
                outstanding: outstanding,
                deadlineDate: s.deadlineDate,
                date: s.sellingDate
            });
        }
    });

    // Polish sales
    polishSalesList.forEach(s => {
        const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = calculateOutstandingAmount(s.finalAmount, totalPaid);
        if (outstanding > 0) {
            pendingReceivables.push({
                id: s.sellingNo,
                ref: `PS-${s.sellingNo}`,
                type: 'polish_sales',
                moduleLabel: 'Polish Sale',
                partyName: s.partyName,
                dalal: s.dalal,
                carat: s.carat,
                finalAmount: s.finalAmount,
                totalPaid: totalPaid,
                outstanding: outstanding,
                deadlineDate: s.deadlineDate,
                date: s.sellingDate
            });
        }
    });

    // Box selling
    boxSellingList.forEach(s => {
        const totalPaid = s.payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = calculateOutstandingAmount(s.finalAmount, totalPaid);
        if (outstanding > 0) {
            pendingReceivables.push({
                id: s.sellingNo,
                ref: `BS-${s.sellingNo}`,
                type: 'box_selling',
                moduleLabel: 'Box Sale',
                partyName: s.partyName,
                dalal: s.dalal,
                carat: s.carat,
                finalAmount: s.finalAmount,
                totalPaid: totalPaid,
                outstanding: outstanding,
                deadlineDate: s.deadlineDate,
                date: s.sellingDate
            });
        }
    });

    // 4. Compile Pending Payables (Outstanding Purchases)
    pendingPayables = [];

    // Rough buys
    buysList.forEach(b => {
        const totalPaid = b.payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = calculateOutstandingAmount(b.finalAmount, totalPaid);
        if (outstanding > 0) {
            pendingPayables.push({
                id: b.buyingNo,
                ref: `B-${b.buyingNo}`,
                type: 'buys',
                moduleLabel: 'Rough Buy',
                partyName: b.partyName,
                dalal: b.dalal,
                carat: b.carat,
                finalAmount: b.finalAmount,
                totalPaid: totalPaid,
                outstanding: outstanding,
                deadlineDate: b.deadlineDate,
                date: b.buyingDate
            });
        }
    });

    // Polish buys
    polishBuysList.forEach(b => {
        const totalPaid = b.payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = calculateOutstandingAmount(b.finalAmount, totalPaid);
        if (outstanding > 0) {
            pendingPayables.push({
                id: b.buyingNo,
                ref: `PB-${b.buyingNo}`,
                type: 'polish_buys',
                moduleLabel: 'Polish Buy',
                partyName: b.partyName,
                dalal: b.dalal,
                carat: b.carat,
                finalAmount: b.finalAmount,
                totalPaid: totalPaid,
                outstanding: outstanding,
                deadlineDate: b.deadlineDate,
                date: b.buyingDate
            });
        }
    });

    // Sort both by deadline date ascending (earliest/overdue deadlines first)
    const sortFn = (a, b) => {
        const dA = a.deadlineDate || '9999-12-31';
        const dB = b.deadlineDate || '9999-12-31';
        return dA.localeCompare(dB);
    };
    pendingReceivables.sort(sortFn);
    pendingPayables.sort(sortFn);

    // Render tables
    renderPaymentsTables();
}

function renderPaymentsTables() {
    const searchVal = document.getElementById("payments-search-input").value.toLowerCase().trim();

    // 1. RECEIVABLES RENDER
    const recBody = document.getElementById("receivables-table-body");
    recBody.innerHTML = "";
    
    const filteredRec = pendingReceivables.filter(item => {
        return item.partyName.toLowerCase().includes(searchVal) ||
               (item.dalal && item.dalal.toLowerCase().includes(searchVal)) ||
               item.ref.toLowerCase().includes(searchVal);
    });

    // Update Summary Header Badge
    const totalRecAmt = filteredRec.reduce((sum, x) => sum + x.outstanding, 0);
    document.getElementById("receivables-summary").textContent = `${formatCurrency(totalRecAmt)} (${filteredRec.length} Invoice${filteredRec.length !== 1 ? 's' : ''})`;

    if (filteredRec.length === 0) {
        document.getElementById("receivables-empty-state").classList.remove("hidden");
        document.getElementById("receivables-table").classList.add("hidden");
    } else {
        document.getElementById("receivables-empty-state").classList.add("hidden");
        document.getElementById("receivables-table").classList.remove("hidden");

        filteredRec.forEach(item => {
            const dl = getDeadlineStatusInfo(item.deadlineDate);
            const tr = document.createElement("tr");
            
            // Soft highlight row if overdue
            if (dl.badgeClass === 'badge-danger') {
                tr.style.backgroundColor = 'var(--color-danger-bg)';
            }

            // Map payment status badge
            let paymentStatus = 'Unpaid';
            let statusBadge = 'badge-danger';
            if (item.totalPaid > 0) {
                paymentStatus = 'Partial';
                statusBadge = 'badge-warning';
            }

            tr.innerHTML = `
                <td class="font-mono font-bold">${item.ref}</td>
                <td><span class="badge ${item.type === 'box_selling' ? 'badge-success' : 'badge-warning'}">${item.moduleLabel}</span></td>
                <td class="font-bold">${item.partyName}</td>
                <td>${item.dalal || '—'}</td>
                <td class="text-right font-mono">${item.carat.toFixed(3)} ct</td>
                <td class="text-right font-mono">${formatCurrency(item.finalAmount)}</td>
                <td class="text-right text-green font-mono">${formatCurrency(item.totalPaid)}</td>
                <td class="text-right text-orange font-bold font-mono">${formatCurrency(item.outstanding)}</td>
                <td><span class="badge ${dl.badgeClass}">${dl.label}</span></td>
                <td><span class="badge ${statusBadge}">${paymentStatus}</span></td>
                <td>
                    <button class="btn btn-secondary btn-compact" onclick="viewTransactionDetails(${item.id}, '${item.type}')">👁️ Manage Ledger</button>
                </td>
            `;
            recBody.appendChild(tr);
        });
    }

    // 2. PAYABLES RENDER
    const payBody = document.getElementById("payables-table-body");
    payBody.innerHTML = "";

    const filteredPay = pendingPayables.filter(item => {
        return item.partyName.toLowerCase().includes(searchVal) ||
               (item.dalal && item.dalal.toLowerCase().includes(searchVal)) ||
               item.ref.toLowerCase().includes(searchVal);
    });

    const totalPayAmt = filteredPay.reduce((sum, x) => sum + x.outstanding, 0);
    document.getElementById("payables-summary").textContent = `${formatCurrency(totalPayAmt)} (${filteredPay.length} Invoice${filteredPay.length !== 1 ? 's' : ''})`;

    if (filteredPay.length === 0) {
        document.getElementById("payables-empty-state").classList.remove("hidden");
        document.getElementById("payables-table").classList.add("hidden");
    } else {
        document.getElementById("payables-empty-state").classList.add("hidden");
        document.getElementById("payables-table").classList.remove("hidden");

        filteredPay.forEach(item => {
            const dl = getDeadlineStatusInfo(item.deadlineDate);
            const tr = document.createElement("tr");

            // Soft highlight row if overdue
            if (dl.badgeClass === 'badge-danger') {
                tr.style.backgroundColor = 'var(--color-danger-bg)';
            }

            let paymentStatus = 'Unpaid';
            let statusBadge = 'badge-danger';
            if (item.totalPaid > 0) {
                paymentStatus = 'Partial';
                statusBadge = 'badge-warning';
            }

            tr.innerHTML = `
                <td class="font-mono font-bold">${item.ref}</td>
                <td><span class="badge ${item.type === 'polish_buys' ? 'badge-success' : 'badge-warning'}">${item.moduleLabel}</span></td>
                <td class="font-bold">${item.partyName}</td>
                <td>${item.dalal || '—'}</td>
                <td class="text-right font-mono">${item.carat.toFixed(3)} ct</td>
                <td class="text-right font-mono">${formatCurrency(item.finalAmount)}</td>
                <td class="text-right text-green font-mono">${formatCurrency(item.totalPaid)}</td>
                <td class="text-right text-danger font-bold font-mono">${formatCurrency(item.outstanding)}</td>
                <td><span class="badge ${dl.badgeClass}">${dl.label}</span></td>
                <td><span class="badge ${statusBadge}">${paymentStatus}</span></td>
                <td>
                    <button class="btn btn-secondary btn-compact" onclick="viewTransactionDetails(${item.id}, '${item.type}')">👁️ Manage Ledger</button>
                </td>
            `;
            payBody.appendChild(tr);
        });
    }
}

function filterPayments() {
    renderPaymentsTables();
}

function getDeadlineStatusInfo(deadlineDate) {
    if (!deadlineDate) return { label: '—', badgeClass: 'badge-secondary' };
    try {
        const today = new Date(); today.setHours(0,0,0,0);
        const dlDate = new Date(deadlineDate + 'T00:00:00');
        const diff = Math.ceil((dlDate - today) / 86400000);
        if (diff < 0) {
            return { label: `⚠ ${Math.abs(diff)}d overdue`, badgeClass: 'badge-danger' };
        } else if (diff === 0) {
            return { label: '⚠ Due Today', badgeClass: 'badge-warning' };
        } else if (diff <= 7) {
            return { label: `Due in ${diff}d`, badgeClass: 'badge-warning' };
        } else {
            return { label: formatDateToLocale(deadlineDate), badgeClass: 'badge-success' };
        }
    } catch {
        return { label: formatDateToLocale(deadlineDate), badgeClass: 'badge-success' };
    }
}

function viewTransactionDetails(id, type) {
    window.location.href = `ledger_details.html?id=${id}&type=${type}`;
}

function renderDashboardWidgets() {
    // 1. LIVE STOCK TRACKING CALCULATIONS
    const roughIn       = buysList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughSoldOut  = salesList.reduce((s, b) => s + (parseInt(b.pieces) || 0), 0);
    const roughConvOut  = conversionList.reduce((s, c) => s + (parseInt(c.roughPieces) || 0), 0);
    const roughStock    = roughIn - roughSoldOut - roughConvOut;

    const roughInCt     = buysList.reduce((s, b) => s + (parseFloat(b.carat) || 0), 0);
    const roughSoldCt   = salesList.reduce((s, b) => s + (parseFloat(b.carat) || 0), 0);
    const roughStockCt  = roughIn > 0
        ? Math.max(0, roughInCt - roughSoldCt - (roughConvOut * roughInCt / roughIn))
        : 0;

    // Polish lot breakdowns
    const polishLots = getPolishStockDistribution();
    let pSurat = 0, pMumbai = 0, pVendor = 0;
    Object.values(polishLots).forEach(lot => {
        pSurat += lot.Surat || 0;
        pMumbai += lot.Mumbai || 0;
        pVendor += lot.Vendor || 0;
    });
    const polishStock = pSurat + pMumbai + pVendor;

    // Dabbi breakdowns
    const dabbis = getDabbiStockDistribution();
    let bSurat = 0, bMumbai = 0, bVendor = 0;
    let boxStockCt = 0;
    Object.values(dabbis).forEach(box => {
        if (box.location === "Surat" && box.status === "Available") {
            bSurat++;
            boxStockCt += box.carat;
        } else if (box.location === "Mumbai" && box.status === "Available") {
            bMumbai++;
            boxStockCt += box.carat;
        } else if (box.location === "Vendor" && box.status === "Issued") {
            bVendor++;
            boxStockCt += box.carat;
        }
    });
    const boxStock = bSurat + bMumbai + bVendor;

    // Update widget UI
    document.getElementById("widget-rough-stock").textContent = `${roughStock} pcs`;
    document.getElementById("widget-rough-ct").textContent = `${roughStockCt.toFixed(3)} ct`;
    document.getElementById("widget-polish-stock").textContent = `${polishStock} pcs`;
    document.getElementById("widget-box-stock").textContent = `${boxStock} box${boxStock !== 1 ? 'es' : ''}`;
    document.getElementById("widget-box-ct").textContent = `${boxStockCt.toFixed(3)} ct`;

    // Update locations breakdowns in UI
    document.getElementById("widget-rough-surat").textContent = roughStock;
    document.getElementById("widget-polish-surat").textContent = pSurat;
    document.getElementById("widget-polish-mumbai").textContent = pMumbai;
    document.getElementById("widget-polish-vendor").textContent = pVendor;
    document.getElementById("widget-box-surat").textContent = bSurat;
    document.getElementById("widget-box-mumbai").textContent = bMumbai;
    document.getElementById("widget-box-vendor").textContent = bVendor;

    // Color code stocks if negative
    document.getElementById("widget-rough-stock").style.color = roughStock < 0 ? "#dc2626" : "var(--color-primary-light)";
    document.getElementById("widget-polish-stock").style.color = polishStock < 0 ? "#dc2626" : "#8b5cf6";
    document.getElementById("widget-box-stock").style.color = boxStock < 0 ? "#dc2626" : "#0891b2";

    // 2. RECENT ACTIVITY COMPILING
    const activities = [];

    buysList.forEach(b => {
        activities.push({
            date: b.buyingDate,
            timestamp: b.createdAt || b.buyingDate,
            icon: "📥",
            class: "bg-rough-buy",
            title: "Rough Buy",
            ref: `B-${b.buyingNo}`,
            desc: b.partyName || "—",
            value: formatCurrency(b.finalAmount)
        });
    });

    salesList.forEach(s => {
        activities.push({
            date: s.sellingDate,
            timestamp: s.createdAt || s.sellingDate,
            icon: "📤",
            class: "bg-rough-sale",
            title: "Rough Sale",
            ref: `S-${s.sellingNo}`,
            desc: s.partyName || "—",
            value: formatCurrency(s.finalAmount)
        });
    });

    polishBuysList.forEach(b => {
        activities.push({
            date: b.buyingDate,
            timestamp: b.createdAt || b.buyingDate,
            icon: "✨",
            class: "bg-polish-buy",
            title: "Polish Buy",
            ref: `PB-${b.buyingNo}`,
            desc: b.partyName || "—",
            value: formatCurrency(b.finalAmount)
        });
    });

    polishSalesList.forEach(s => {
        activities.push({
            date: s.sellingDate,
            timestamp: s.createdAt || s.sellingDate,
            icon: "📤",
            class: "bg-polish-sale",
            title: "Polish Sale",
            ref: `PS-${s.sellingNo}`,
            desc: s.partyName || "—",
            value: formatCurrency(s.finalAmount)
        });
    });

    conversionList.forEach((c, idx) => {
        activities.push({
            date: c.conversionDate,
            timestamp: c.createdAt || c.conversionDate,
            icon: "🔄",
            class: "bg-conversion",
            title: "Conversion",
            ref: `Conv #${idx+1}`,
            desc: `−${c.roughPieces} Rough → +${c.polishPieces} Polish`,
            value: `${c.polishPieces} pcs`
        });
    });

    boxMakingList.forEach(bx => {
        activities.push({
            date: bx.createdAt ? bx.createdAt.split('T')[0] : '—',
            timestamp: bx.createdAt || '—',
            icon: "🔷",
            class: "bg-box-make",
            title: "Box Made",
            ref: bx.idNo,
            desc: `${bx.shape2} | ${parseFloat(bx.carat).toFixed(3)} ct`,
            value: formatCurrency(bx.mValue)
        });
    });

    boxSellingList.forEach(bs => {
        activities.push({
            date: bs.sellingDate,
            timestamp: bs.createdAt || bs.sellingDate,
            icon: "🏷️",
            class: "bg-box-sell",
            title: "Box Sale",
            ref: `BS-${bs.sellingNo}`,
            desc: `${bs.partyName || "—"} (Box ${bs.boxId})`,
            value: formatCurrency(bs.finalAmount)
        });
    });

    // Sort chronologically desc
    activities.sort((a, b) => {
        const tA = a.timestamp || "0000-00-00";
        const tB = b.timestamp || "0000-00-00";
        return tB.localeCompare(tA);
    });

    const recent = activities.slice(0, 5);
    const feedEl = document.getElementById("activity-feed-list");
    if (recent.length === 0) {
        feedEl.innerHTML = `<div class="empty-state">No recent activities.</div>`;
    } else {
        feedEl.innerHTML = recent.map(a => `
            <div class="activity-item">
                <div class="activity-info">
                    <div class="activity-icon-wrap ${a.class}">${a.icon}</div>
                    <div class="activity-details">
                        <div class="activity-title">${a.title} <span class="font-mono text-blue font-bold">#${a.ref}</span></div>
                        <div class="activity-meta">${a.desc} · ${formatDateToLocale(a.date)}</div>
                    </div>
                </div>
                <div class="activity-value">${a.value}</div>
            </div>
        `).join('');
    }
}
