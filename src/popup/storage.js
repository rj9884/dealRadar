const STORAGE_KEY = "trackedItems";
const LAST_SYNC_KEY = "lastSyncAt";

export async function getTrackedItems() {
    const data = await chrome.storage.local.get([STORAGE_KEY]);
    return data[STORAGE_KEY] || [];
}

export async function saveTrackedItems(items) {
    await chrome.storage.local.set({ [STORAGE_KEY]: items });
}

export async function getLastSync() {
    const data = await chrome.storage.local.get([LAST_SYNC_KEY]);
    return data[LAST_SYNC_KEY];
}

export async function setLastSync(dateStr) {
    await chrome.storage.local.set({ [LAST_SYNC_KEY]: dateStr });
}

export async function addOrUpdateItem(entry) {
    const items = await getTrackedItems();
    const existing = items.find((item) => item.url === entry.url);

    if (existing) {
        existing.title = entry.title;
        existing.currency = entry.currency;
        existing.lastUpdated = entry.lastUpdated;
        // Avoid duplicate price entries for same timestamp/price if needed, 
        // but for now we just push as per original logic, maybe check if price changed?
        // Original logic just pushes.
        existing.prices.push(entry.prices[0]);
    } else {
        items.push(entry);
    }

    const now = new Date().toISOString();
    await saveTrackedItems(items);
    await setLastSync(now);
    return { items, now };
}

export async function removeItem(url) {
    const items = await getTrackedItems();
    const filtered = items.filter((entry) => entry.url !== url);
    await saveTrackedItems(filtered);
    return filtered;
}

export async function updateAlert(url, alertConfig) {
    const items = await getTrackedItems();
    const item = items.find((entry) => entry.url === url);
    if (item) {
        item.alert = alertConfig;
        await saveTrackedItems(items);
    }
    return items;
}
