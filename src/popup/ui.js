import { priceLabel, dateLabel, getDomain } from "../utils/format.js";
import { renderChart } from "./chart.js";

function getElements() {
    return {
        listView: document.getElementById("listView"),
        detailView: document.getElementById("detailView"),
        itemsList: document.getElementById("itemsList"),
        trackBtn: document.getElementById("trackBtn"),
        sortSelect: document.getElementById("sortSelect"),

        // Detail elements
        detailTitle: document.querySelector(".detail-title"),
        dealScore: document.getElementById("dealScore"),
        dealHint: document.getElementById("dealHint"),
        priceNow: document.getElementById("priceNow"),
        lastUpdated: document.getElementById("lastUpdated"),
        statsMin: document.getElementById("statsMin"),
        statsMax: document.getElementById("statsMax"),
        targetPrice: document.getElementById("targetPrice"),
        targetPercent: document.getElementById("targetPercent"),
        alertToggle: document.getElementById("alertToggle"),
        saveAlert: document.getElementById("saveAlert"),
        alertStatus: document.getElementById("alertStatus"),
        removeBtn: document.getElementById("removeBtn"),
        backBtn: document.getElementById("backBtn"),
    };
}

export function showDetailView() {
    const els = getElements();
    els.listView.classList.add("hidden");
    els.detailView.classList.remove("hidden");
    // Animation/transition logic can go here
}

export function showListView() {
    const els = getElements();
    els.detailView.classList.add("hidden");
    els.listView.classList.remove("hidden");
}

export function showToast(message, duration = 3000) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");

    // Clear any existing timeout (simple logic)
    if (toast.timeoutId) clearTimeout(toast.timeoutId);

    toast.timeoutId = setTimeout(() => {
        toast.classList.add("hidden");
    }, duration);
}

export function showConfirmModal(onConfirm) {
    const modal = document.getElementById("confirmModal");
    const confirmBtn = document.getElementById("confirmRemove");
    const cancelBtn = document.getElementById("cancelRemove");

    if (!modal || !confirmBtn || !cancelBtn) return;

    // Show modal
    modal.classList.remove("hidden");

    // Handlers
    const close = () => {
        modal.classList.add("hidden");
        cleanup();
    };

    const handleConfirm = () => {
        onConfirm();
        close();
    };

    const handleCancel = () => {
        close();
    };

    // Attach listeners
    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);

    // Cleanup listeners to avoid dupes if called multiple times (though simple app)
    function cleanup() {
        confirmBtn.removeEventListener("click", handleConfirm);
        cancelBtn.removeEventListener("click", handleCancel);
    }
}

export function renderList(items, sortMode, onSelect, onRemove) {
    const els = getElements();
    const sorted = sortItems(items, sortMode);

    els.itemsList.innerHTML = "";

    if (!sorted.length) {
        els.itemsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <h3>No tracked items</h3>
                <p>Visit a product page and click "Track" to get started.</p>
            </div>
        `;
        return;
    }

    sorted.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        // Price diff logic
        const currentPrice = item.prices[item.prices.length - 1]?.price;
        const previousPrice = item.prices[item.prices.length - 2]?.price;
        let badgeHtml = '<span class="badge badge-neutral">New</span>';

        if (previousPrice !== undefined && currentPrice !== undefined) {
            const diff = currentPrice - previousPrice;
            if (diff > 0) {
                badgeHtml = `<span class="badge badge-up">+${diff.toFixed(2)}</span>`;
            } else if (diff < 0) {
                badgeHtml = `<span class="badge badge-down">${diff.toFixed(2)}</span>`;
            } else {
                badgeHtml = `<span class="badge badge-neutral">--</span>`;
            }
        }

        card.innerHTML = `
            <div class="item-top">
                <div class="item-title">${item.title || "Untitled Product"}</div>
                <div class="item-price">${priceLabel(currentPrice, item.currency)}</div>
            </div>
            <div class="item-domain">${getDomain(item.url)}</div>
            <div class="item-bottom">
                <span>${dateLabel(item.lastUpdated)}</span>
                ${badgeHtml}
            </div>
        `;

        card.addEventListener("click", () => onSelect(item));
        els.itemsList.appendChild(card);
    });
}

export function renderDetail(item) {
    const els = getElements();
    if (!item) return;

    els.detailTitle.textContent = item.title || "Product Details";

    // Stats
    const prices = item.prices || [];
    const values = prices.map(p => p.price);
    const current = values.length ? values[values.length - 1] : 0;
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;

    els.priceNow.textContent = priceLabel(current, item.currency);
    els.statsMin.textContent = priceLabel(min, item.currency);
    els.statsMax.textContent = priceLabel(max, item.currency);
    els.lastUpdated.textContent = `Updated: ${dateLabel(item.lastUpdated)}`;

    // Score
    const score = computeDealScore(prices);
    els.dealScore.textContent = score.score;
    els.dealHint.textContent = score.hint;

    // Alerts
    els.targetPrice.value = item.alert?.targetPrice ?? "";
    els.targetPercent.value = item.alert?.targetPercent ?? "";
    els.alertToggle.checked = !!item.alert; // Simple toggle vis logic if we had one
    els.alertStatus.textContent = "";

    // Chart
    // Delay slightly to ensure layout is done if transition happening
    requestAnimationFrame(() => {
        renderChart(prices);
    });
}

function computeDealScore(prices) {
    if (!prices || prices.length < 2) {
        return { score: "--", hint: "Collect more data to get a deal score." };
    }
    const values = prices.map(p => p.price);
    const current = values[values.length - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const delta = ((avg - current) / avg) * 100;

    if (delta > 15) return { score: "Great", hint: "Significantly cheaper than average." };
    if (delta > 5) return { score: "Good", hint: "Below average price." };
    if (delta > -5) return { score: "Fair", hint: "Around average price." };
    return { score: "High", hint: "Price is above average." };
}

function sortItems(items, mode) {
    const sorted = [...items];
    switch (mode) {
        case "drop":
            sorted.sort((a, b) => {
                const valA = getDropValue(a);
                const valB = getDropValue(b);
                return valB - valA;
            });
            break;
        case "high":
            sorted.sort((a, b) => getMaxPrice(b) - getMaxPrice(a));
            break;
        default: // recent
            sorted.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
    }
    return sorted;
}

function getDropValue(item) {
    const p = item.prices;
    if (!p || p.length < 2) return 0;
    // Simple drop calculation: prev - current
    return p[p.length - 2].price - p[p.length - 1].price;
}

function getMaxPrice(item) {
    if (!item.prices || !item.prices.length) return 0;
    return Math.max(...item.prices.map(p => p.price));
}
