const STORAGE_KEY = "trackedItems";
const LAST_SYNC_KEY = "lastSyncAt";

let selectedUrl = null;

const trackBtn = document.getElementById("trackBtn");
const itemsList = document.getElementById("itemsList");
const sortSelect = document.getElementById("sortSelect");
const dealScore = document.getElementById("dealScore");
const dealHint = document.getElementById("dealHint");
const lastSync = document.getElementById("lastSync");
const statsMin = document.getElementById("statsMin");
const statsMax = document.getElementById("statsMax");
const lastUpdated = document.getElementById("lastUpdated");
const priceNow = document.getElementById("priceNow");
const targetPrice = document.getElementById("targetPrice");
const targetPercent = document.getElementById("targetPercent");
const saveAlert = document.getElementById("saveAlert");
const alertStatus = document.getElementById("alertStatus");

const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function setStatus(message) {
  alertStatus.textContent = message;
}

function priceLabel(price, currency) {
  if (!price && price !== 0) {
    return "--";
  }
  const suffix = currency ? ` ${currency}` : "";
  return `${fmt.format(price)}${suffix}`;
}

function dateLabel(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function fullDateLabel(value) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  return date.toLocaleString();
}

function getDomain(url) {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function computeDealScore(prices) {
  if (!prices || prices.length < 2) {
    return { score: "--", hint: "Need more data to score this deal." };
  }
  const values = prices.map((p) => p.price).filter((p) => Number.isFinite(p));
  const current = values[values.length - 1];
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const delta = ((avg - current) / avg) * 100;
  if (delta > 15) {
    return { score: "Great", hint: "Current price is well below average." };
  }
  if (delta > 5) {
    return { score: "Good", hint: "Slightly below average, nice time to buy." };
  }
  if (delta > -5) {
    return { score: "Fair", hint: "Near the average price." };
  }
  return { score: "High", hint: "Above average, maybe wait." };
}

async function loadState() {
  const data = await chrome.storage.local.get([STORAGE_KEY, LAST_SYNC_KEY]);
  const items = data[STORAGE_KEY] || [];
  renderList(items);
  const syncValue = data[LAST_SYNC_KEY];
  lastSync.textContent = syncValue ? fullDateLabel(syncValue) : "--";
  if (!selectedUrl && items.length) {
    selectedUrl = items[0].url;
  }
  renderSelection(items);
}

function sortItems(items, mode) {
  const sorted = [...items];
  if (mode === "drop") {
    sorted.sort((a, b) => dropValue(b) - dropValue(a));
  } else if (mode === "high") {
    sorted.sort((a, b) => highestPrice(b) - highestPrice(a));
  } else {
    sorted.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
  }
  return sorted;
}

function dropValue(item) {
  if (!item.prices || item.prices.length < 2) {
    return 0;
  }
  const values = item.prices.map((p) => p.price);
  return values[values.length - 2] - values[values.length - 1];
}

function highestPrice(item) {
  if (!item.prices || !item.prices.length) {
    return 0;
  }
  return Math.max(...item.prices.map((p) => p.price));
}

function renderList(items) {
  const mode = sortSelect.value;
  const sorted = sortItems(items, mode);
  itemsList.innerHTML = "";
  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-title">No tracked products yet</div>
      <div class="empty-sub">Open a product page and click track to start building history.</div>
      <button class="primary-btn empty-cta" type="button">Track this page</button>
    `;
    empty.querySelector(".empty-cta").addEventListener("click", trackCurrentTab);
    itemsList.appendChild(empty);
    return;
  }
  sorted.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item" + (item.url === selectedUrl ? " active" : "");
    card.dataset.url = item.url;
    const currentPrice = item.prices[item.prices.length - 1];
    const previousPrice = item.prices[item.prices.length - 2];
    let deltaText = "New";
    let deltaClass = "neutral";
    if (previousPrice && Number.isFinite(previousPrice.price) && Number.isFinite(currentPrice?.price)) {
      const diff = currentPrice.price - previousPrice.price;
      if (diff > 0) {
        deltaText = `${fmt.format(diff)} up`;
        deltaClass = "up";
      } else if (diff < 0) {
        deltaText = `${fmt.format(Math.abs(diff))} down`;
        deltaClass = "down";
      } else {
        deltaText = "No change";
      }
    }
    card.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div class="item-domain">${getDomain(item.url)}</div>
      <div class="item-meta">
        <span>${dateLabel(item.lastUpdated)}</span>
        <span class="item-chip ${deltaClass}">${deltaText}</span>
        <span class="item-price">${priceLabel(currentPrice?.price, item.currency)}</span>
      </div>
      <button class="remove-btn" type="button">Remove</button>
    `;
    card.addEventListener("click", () => {
      selectedUrl = item.url;
      renderList(items);
      renderSelection(items);
    });
    card.querySelector(".remove-btn").addEventListener("click", async (event) => {
      event.stopPropagation();
      await removeItem(item.url);
    });
    itemsList.appendChild(card);
  });
}

async function removeItem(url) {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const items = data[STORAGE_KEY] || [];
  const filtered = items.filter((entry) => entry.url !== url);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  if (selectedUrl === url) {
    selectedUrl = filtered.length ? filtered[0].url : null;
  }
  renderList(filtered);
  renderSelection(filtered);
  setStatus("Removed from tracking.");
}

function renderSelection(items) {
  const item = items.find((entry) => entry.url === selectedUrl);
  if (!item) {
    dealScore.textContent = "--";
    dealHint.textContent = "Select a product to see if it is a good deal.";
    statsMin.textContent = "Min: --";
    statsMax.textContent = "Max: --";
    lastUpdated.textContent = "Last updated: --";
    priceNow.textContent = "Current: --";
    targetPrice.value = "";
    targetPercent.value = "";
    setStatus("Select a product to configure alerts.");
    renderChartAfterLayout([]);
    return;
  }

  const prices = item.prices || [];
  const values = prices.map((p) => p.price);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const current = values.length ? values[values.length - 1] : null;
  const score = computeDealScore(prices);

  dealScore.textContent = score.score;
  dealHint.textContent = score.hint;
  statsMin.textContent = `Min: ${priceLabel(min, item.currency)}`;
  statsMax.textContent = `Max: ${priceLabel(max, item.currency)}`;
  lastUpdated.textContent = `Last updated: ${fullDateLabel(item.lastUpdated)}`;
  priceNow.textContent = `Current: ${priceLabel(current, item.currency)}`;

  targetPrice.value = item.alert?.targetPrice ?? "";
  targetPercent.value = item.alert?.targetPercent ?? "";
  setStatus(
    item.alert
      ? `Alert set for ${priceLabel(item.alert.targetPrice, item.currency)} or ${item.alert.targetPercent || 0}% drop.`
      : "No alert set for this product."
  );

  renderChartAfterLayout(prices);
}

function renderChart(prices) {
  const canvas = document.getElementById("priceChart");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const fallbackWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 320;
  const width = Math.max(1, Math.floor((rect.width || fallbackWidth) * ratio));
  const height = Math.max(1, Math.floor((rect.height || 160) * ratio));
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffaf7";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(29, 24, 18, 0.08)";
  ctx.lineWidth = 1 * ratio;
  ctx.beginPath();
  ctx.moveTo(8 * ratio, height - 10 * ratio);
  ctx.lineTo(width - 8 * ratio, height - 10 * ratio);
  ctx.stroke();

  if (!prices.length) {
    ctx.fillStyle = "#6c625b";
    ctx.font = `${12 * ratio}px Segoe UI, Arial, sans-serif`;
    ctx.fillText("No history yet", 12 * ratio, height / 2);
    return;
  }

  const values = prices.map((p) => p.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = 12 * ratio;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = padding + (chartWidth * index) / Math.max(1, values.length - 1);
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  ctx.strokeStyle = "rgba(255, 122, 89, 0.8)";
  ctx.lineWidth = 2 * ratio;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 122, 89, 0.2)";
  ctx.lineTo(padding + chartWidth, padding + chartHeight);
  ctx.lineTo(padding, padding + chartHeight);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff7a59";
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3 * ratio, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderChartAfterLayout(prices) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => renderChart(prices));
  });
}

async function trackCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return;
  }
  let response = null;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: "extract_product" });
  } catch (error) {
    setStatus("Can't access this page. Try a standard product page.");
    return;
  }
  if (!response || !response.price) {
    setStatus("No price found on this page.");
    return;
  }

  const entry = {
    url: response.url,
    title: response.title || "Untitled product",
    currency: response.currency || "",
    lastUpdated: new Date().toISOString(),
    prices: [
      {
        price: response.price,
        date: new Date().toISOString()
      }
    ]
  };

  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const items = data[STORAGE_KEY] || [];
  const existing = items.find((item) => item.url === entry.url);
  if (existing) {
    existing.title = entry.title;
    existing.currency = entry.currency;
    existing.lastUpdated = entry.lastUpdated;
    existing.prices.push(entry.prices[0]);
  } else {
    items.push(entry);
  }

  const now = new Date().toISOString();
  await chrome.storage.local.set({
    [STORAGE_KEY]: items,
    [LAST_SYNC_KEY]: now
  });
  selectedUrl = entry.url;
  renderList(items);
  renderSelection(items);
  setStatus("Tracked successfully.");
  lastSync.textContent = fullDateLabel(now);
}

async function saveAlertSettings() {
  const data = await chrome.storage.local.get([STORAGE_KEY]);
  const items = data[STORAGE_KEY] || [];
  const item = items.find((entry) => entry.url === selectedUrl);
  if (!item) {
    setStatus("Select a product first.");
    return;
  }
  const priceValue = targetPrice.value ? Number(targetPrice.value) : null;
  const percentValue = targetPercent.value ? Number(targetPercent.value) : null;
  if (!priceValue && !percentValue) {
    setStatus("Set a target price or percentage.");
    return;
  }
  item.alert = {
    targetPrice: priceValue,
    targetPercent: percentValue
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: items });
  setStatus("Alert saved.");
  renderSelection(items);
}

trackBtn.addEventListener("click", trackCurrentTab);
saveAlert.addEventListener("click", saveAlertSettings);
sortSelect.addEventListener("change", loadState);

loadState();
