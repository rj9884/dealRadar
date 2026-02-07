const STORAGE_KEY = "trackedItems";
const LAST_SYNC_KEY = "lastSyncAt";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyPriceCheck", { periodInMinutes: 1440 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.get("dailyPriceCheck", (alarm) => {
    if (!alarm) {
      chrome.alarms.create("dailyPriceCheck", { periodInMinutes: 1440 });
    }
  });
});

async function openTabAndExtract(url) {
  // We create a tab that is not active to minimize disruption
  const tab = await chrome.tabs.create({ url, active: false });

  return new Promise((resolve) => {
    const listener = async (tabId, info) => {
      if (tabId !== tab.id || info.status !== "complete") {
        return;
      }
      // Clean up listener immediately
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeoutId);

      try {
        // Wait a moment for dynamic content
        await new Promise(r => setTimeout(r, 2000));

        const response = await chrome.tabs.sendMessage(tabId, { type: "extract_product" });
        resolve(response);
      } catch (error) {
        console.error("Extraction error:", error);
        resolve(null);
      } finally {
        // Close the background tab
        chrome.tabs.remove(tabId);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Timeout fallback
    const timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.remove(tab.id);
      resolve(null);
    }, 45000); // Increased timeout for slow sites
  });
}

function shouldNotify(item, newPrice) {
  if (!item.alert) {
    return false;
  }

  // Target Price Check
  if (item.alert.targetPrice && newPrice <= item.alert.targetPrice) {
    return true;
  }

  // Percent Drop Check
  if (item.alert.targetPercent) {
    const values = item.prices.map((p) => p.price);
    // Compare against the *previous* price or the *max* price? 
    // Usually drop alerts are from the last seen price or the price when tracked.
    // Let's stick to last seen or initial. The original logic used last seen.
    const last = values[values.length - 1]; // This includes the new price we just pushed? No, we haven't pushed it yet in the caller.
    // Wait, the caller structure:
    // item.prices.push(...) happened BEFORE calling shouldNotify in original code?
    // Let's check original... yes, it pushed relative to itself.

    // Let's be safe. We are passing 'newPrice'.
    // We should compare against the *previous* recorded price.
    if (values.length > 0) {
      const lastRecorded = values[values.length - 1];
      const drop = ((lastRecorded - newPrice) / lastRecorded) * 100;
      return drop >= item.alert.targetPercent;
    }
  }
  return false;
}

async function checkPrices() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const items = data[STORAGE_KEY] || [];
  let updates = 0;

  for (const item of items) {
    const response = await openTabAndExtract(item.url);
    if (!response || !response.price) {
      continue;
    }

    const now = new Date().toISOString();
    item.lastUpdated = now;
    item.currency = response.currency || item.currency;

    // Notify BEFORE pushing so we compare against history correctly
    if (shouldNotify(item, response.price)) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "../assets/icons/icon128.svg", // Adjusted path? Notifications usually need absolute or relative to root? 
        // Chrome extension paths in notifications: "icons/icon128.svg" from root.
        // manifest says "src/assets/icons/..."
        iconUrl: "src/assets/icons/icon128.svg",
        title: "Price Drop Alert!",
        message: `${item.title} has dropped to ${response.price} ${item.currency || ""}`
      });
    }

    item.prices.push({ price: response.price, date: now });
    updates++;
  }

  if (updates > 0) {
    await chrome.storage.local.set({
      [STORAGE_KEY]: items,
      [LAST_SYNC_KEY]: new Date().toISOString()
    });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyPriceCheck") {
    checkPrices();
  }
});
