// --- VENDOR MASTER MODULE ---
// Create / edit / list of registered vendors (backed by /all-data vendorsList).

let editingVendorNo = null;

document.addEventListener("DOMContentLoaded", async () => {
    await loadAllDataFromServer();
    loadVendorData();

    const today = new Date();
    document.getElementById("current-date-display").textContent =
        formatDateToLocale(today.toISOString().split('T')[0]);

    // Force uppercase as the user types the name
    document.getElementById("vm-name").addEventListener("input", (e) => {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
    });
    // Mobile: digits only
    document.getElementById("vm-mobile").addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, "");
    });

    setNextVendorId();
    renderVendorStats();
    renderVendorMaster("");
});

function setNextVendorId() {
    let maxNum = 0;
    vendorsList.forEach(v => {
        if (v.vendorId && v.vendorId.startsWith("V")) {
            const num = parseInt(v.vendorId.substring(1)) || 0;
            if (num > maxNum) maxNum = num;
        }
    });
    document.getElementById("vm-vendor-id").value = `V${String(maxNum + 1).padStart(3, '0')}`;
}

function renderVendorStats() {
    const total = vendorsList.length;
    const dalals = vendorsList.filter(v => (v.vendorType || "").toLowerCase() === "dalal").length;
    document.getElementById("vm-total").textContent = total;
    document.getElementById("vm-dalals").textContent = dalals;
    document.getElementById("vm-workers").textContent = total - dalals;
}

function renderVendorMaster(query) {
    const q = (query || "").trim().toLowerCase();
    const tbody = document.getElementById("vendor-master-body");
    const emptyEl = document.getElementById("vm-empty");
    tbody.innerHTML = "";

    const rows = vendorsList.filter(v => {
        if (!q) return true;
        return (v.vendorId || "").toLowerCase().includes(q) ||
               (v.name || "").toLowerCase().includes(q) ||
               (v.vendorType || "").toLowerCase().includes(q) ||
               (v.city || "").toLowerCase().includes(q) ||
               (v.mobile || "").toLowerCase().includes(q);
    });

    if (rows.length === 0) {
        emptyEl.classList.remove("hidden");
        return;
    }
    emptyEl.classList.add("hidden");

    tbody.innerHTML = rows.map(v => {
        const added = v.createdAt ? formatDateToLocale(v.createdAt.split('T')[0]) : '—';
        return `<tr style="cursor:pointer;" title="Click to edit" onclick="editVendor('${v.vendorId}')">
            <td class="font-mono font-bold">${v.vendorId || '—'}</td>
            <td class="font-bold">${v.name || '—'}</td>
            <td><span class="badge ${(v.vendorType || '').toLowerCase() === 'dalal' ? 'badge-warning' : 'badge-info'}">${v.vendorType || '—'}</span></td>
            <td>${v.city || '—'}</td>
            <td class="font-mono">${v.mobile || '—'}</td>
            <td>${added}</td>
            <td>
                <button type="button" class="btn btn-danger btn-compact" onclick="event.stopPropagation(); deleteVendorRecord('${v.vendorId}')">🗑️ Delete</button>
            </td>
        </tr>`;
    }).join('');
}

async function deleteVendorRecord(vendorId) {
    const ok = await deleteRecordWithPassword(vendorId, 'vendors', {
        confirmMessage: "Delete this vendor from master data? Vendors linked to transactions cannot be deleted.\n\nProceed?",
        onSuccess: () => {
            renderVendorStats();
            renderVendorMaster(document.getElementById("vm-search")?.value || "");
            setNextVendorId();
        }
    });
    if (ok) alert("Vendor deleted successfully.");
}

function editVendor(vendorId) {
    const v = vendorsList.find(x => x.vendorId === vendorId);
    if (!v) return;
    editingVendorNo = vendorId;

    document.getElementById("vm-vendor-id").value = v.vendorId;
    document.getElementById("vm-name").value = (v.name || "").toUpperCase();
    document.getElementById("vm-city").value = (v.city || "").toUpperCase();
    document.getElementById("vm-mobile").value = v.mobile || "";

    document.getElementById("vm-form-title").textContent = `Edit Vendor ${v.vendorId}`;
    document.getElementById("vm-submit-btn").textContent = "💾 Update Vendor";
    document.getElementById("vm-cancel-btn").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelVendorEdit() {
    editingVendorNo = null;
    document.getElementById("vendor-master-form").reset();
    setNextVendorId();
    document.getElementById("vm-form-title").textContent = "Create Vendor";
    document.getElementById("vm-submit-btn").textContent = "➕ Create Vendor";
    document.getElementById("vm-cancel-btn").classList.add("hidden");
}

async function saveVendorEntry(event) {
    event.preventDefault();

    const name = document.getElementById("vm-name").value.trim().toUpperCase();
    const city = document.getElementById("vm-city").value.trim().toUpperCase();
    const mobile = document.getElementById("vm-mobile").value.trim();

    if (!name) {
        alert("Vendor name is required.");
        return;
    }

    const payload = { name, vendorType: "Dalal", city, mobile };

    try {
        if (editingVendorNo) {
            await updateVendorOnServer(editingVendorNo, payload);
        } else {
            await saveVendorOnServer({ ...payload, createdAt: new Date().toISOString() });
        }
        // Refresh from server so IDs/uppercasing are authoritative
        isLoadedFromServer = false;
        await loadAllDataFromServer();
        loadVendorData();
        cancelVendorEdit();
        renderVendorStats();
        renderVendorMaster(document.getElementById("vm-search").value || "");
    } catch (e) {
        alert("Could not save this vendor.\n\n" + e.message);
    }
}
