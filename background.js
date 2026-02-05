const STORAGE_KEY = "trackedItems";
const LAST_SYNC_KEY = "lastSyncAt";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyPriceCheck", { periodInMinutes: 1440 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("dailyPriceCheck", { periodInMinutes: 1440 });
});

async function openTabAndExtract(url) {
  const tab = await chrome.tabs.create({ url, active: false });

  return new Promise((resolve) => {
    const listener = async (tabId, info) => {
      if (tabId !== tab.id || info.status !== "complete") {
        return;
      }
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeoutId);
      try {
        const response = await chrome.tabs.sendMessage(tabId, { type: "extract_product" });
        resolve(response);
      } catch (error) {
        resolve(null);
      } finally {
        chrome.tabs.remove(tabId);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    const timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.remove(tab.id);
      resolve(null);
    }, 20000);
  });
}

function shouldNotify(item, newPrice) {
  if (!item.alert) {
    return false;
  }
  if (item.alert.targetPrice && newPrice <= item.alert.targetPrice) {
    return true;
  }
  if (item.alert.targetPercent) {
    const values = item.prices.map((p) => p.price);
    const last = values[values.length - 1];
    const drop = ((last - newPrice) / last) * 100;
    return drop >= item.alert.targetPercent;
  }
  return false;
}

async function checkPrices() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const items = data[STORAGE_KEY] || [];
  for (const item of items) {
    const response = await openTabAndExtract(item.url);
    if (!response || !response.price) {
      continue;
    }
    item.lastUpdated = new Date().toISOString();
    item.currency = response.currency || item.currency;
    item.prices.push({ price: response.price, date: item.lastUpdated });

    if (shouldNotify(item, response.price)) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.svg",
        title: "Price dropped",
        message: `${item.title} is now ${response.price} ${item.currency || ""}`
      });
    }
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: items,
    [LAST_SYNC_KEY]: new Date().toISOString()
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyPriceCheck") {
    checkPrices();
  }
});
