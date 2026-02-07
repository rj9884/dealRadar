import {
  getTrackedItems,
  addOrUpdateItem,
  removeItem,
  updateAlert,
  getLastSync
} from "./storage.js";
import {
  renderList,
  renderDetail,
  showDetailView,
  showListView,
  showToast,
  showConfirmModal
} from "./ui.js";
import { fullDateLabel } from "../utils/format.js";

let currentItems = [];
let selectedUrl = null;

async function init() {
  currentItems = await getTrackedItems();
  const lastSync = await getLastSync();

  if (document.getElementById("lastSync")) {
    document.getElementById("lastSync").textContent = lastSync
      ? `Last synced: ${fullDateLabel(lastSync)}`
      : "Not synced yet";
  }

  setupEventListeners();
  renderList(currentItems, "recent", handleSelectItem);
}

function setupEventListeners() {
  document.getElementById("trackBtn").addEventListener("click", handleTrack);
  document.getElementById("backBtn").addEventListener("click", handleBack);
  document.getElementById("sortSelect").addEventListener("change", handleSort);
  document.getElementById("saveAlert").addEventListener("click", handleSaveAlert);
  document.getElementById("removeBtn").addEventListener("click", handleRemove); // Button in detail view
}

function handleSelectItem(item) {
  selectedUrl = item.url;
  renderDetail(item);
  showDetailView();
}

function handleBack() {
  selectedUrl = null;
  showListView();
}

function handleSort(e) {
  const mode = e.target.value;
  renderList(currentItems, mode, handleSelectItem);
}

async function handleTrack() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "extract_product" });
    if (!response || !response.price) {
      showToast("Could not detect a product price on this page.");
      return;
    }

    const entry = {
      url: response.url,
      title: response.title || "Untitled Product",
      currency: response.currency || "",
      lastUpdated: new Date().toISOString(),
      prices: [{
        price: response.price,
        date: new Date().toISOString()
      }]
    };

    const result = await addOrUpdateItem(entry);
    currentItems = result.items;

    // Update local validation
    document.getElementById("lastSync").textContent = `Last synced: ${fullDateLabel(result.now)}`;

    // If we are in list view, refresh list. If in detail view, maybe switch to this item?
    // Let's just refresh list and highlight success
    renderList(currentItems, document.getElementById("sortSelect").value, handleSelectItem);

    // Visual feedback
    const trackBtn = document.getElementById("trackBtn");
    const originalText = trackBtn.innerHTML;
    trackBtn.innerHTML = "<span>✓</span> Tracked";
    trackBtn.classList.add("btn-success"); // Assuming you might add this class or just leave it
    setTimeout(() => {
      trackBtn.innerHTML = originalText;
      trackBtn.classList.remove("btn-success");
    }, 2000);

  } catch (error) {
    console.error(error);
    showToast("Cannot access this page. Try a standard product page.");
  }
}

async function handleSaveAlert() {
  if (!selectedUrl) return;

  const priceVal = parseFloat(document.getElementById("targetPrice").value);
  const percentVal = parseFloat(document.getElementById("targetPercent").value);

  if (isNaN(priceVal) && isNaN(percentVal)) {
    document.getElementById("alertStatus").textContent = "Please enter a value.";
    return;
  }

  const alertConfig = {
    targetPrice: isNaN(priceVal) ? null : priceVal,
    targetPercent: isNaN(percentVal) ? null : percentVal
  };

  currentItems = await updateAlert(selectedUrl, alertConfig);
  document.getElementById("alertStatus").textContent = "Alert saved successfully.";

  // Refresh detail view
  const item = currentItems.find(i => i.url === selectedUrl);
  renderDetail(item);
}

async function handleRemove() {
  if (!selectedUrl) return;

  showConfirmModal(async () => {
    currentItems = await removeItem(selectedUrl);
    handleBack();
    renderList(currentItems, document.getElementById("sortSelect").value, handleSelectItem);
    showToast("Item removed");
  });
}

init();
