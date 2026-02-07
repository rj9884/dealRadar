// Utility: Get currency from symbol
function currencyFromSymbol(symbol) {
  if (!symbol) return "";
  const map = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₹": "INR",
    "¥": "JPY",
    "R$": "BRL",
    "kr": "SEK"
  };
  return map[symbol] || "";
}

// Utility: Parse price string
function parsePriceFromText(text) {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  // Regex to catch Currency Symbol + Number OR Number + Currency Code
  // Handles 1,234.56 and 1.234,56 (EU) approximation? 
  // For now stick to simple dot/comma logic from original but slightly improved.

  // Matches: $1,234.50 | 1234 INR | € 50
  const match = cleaned.match(/([₹$€£¥R]s?)?\s*([0-9][0-9,\.]*)(?:\s*([A-Z]{3}))?/);
  if (!match) return null;

  const symbol = match[1] || "";
  let rawValue = match[2];

  // Heuristic: if comma is last separator and followed by 2 digits, it's decimal (EUR/BRL style sometimes), 
  // BUT majority web is US/UK style.
  // Converting '1,234.56' -> '1234.56'.
  // Converting '1.234,56' -> '1234.56'.

  // If we have both dot and comma
  if (rawValue.includes(",") && rawValue.includes(".")) {
    if (rawValue.lastIndexOf(",") > rawValue.lastIndexOf(".")) {
      // 1.234,56 -> replace dots, replace comma with dot
      rawValue = rawValue.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> remove commas
      rawValue = rawValue.replace(/,/g, "");
    }
  } else if (rawValue.includes(",")) {
    // If just comma, assume it is thousands separator UNLESS it looks like a decimal (e.g. "12,99")
    // "1,200" -> 1200
    // "12,99" -> 12.99 (? ambiguous)
    // Safest is to remove comma if it is followed by 3 digits (thousands). 
    // If followed by 2 digits, likely decimal.
    if (rawValue.match(/,[\d]{2}$/)) {
      rawValue = rawValue.replace(",", ".");
    } else {
      rawValue = rawValue.replace(/,/g, "");
    }
  }

  const value = parseFloat(rawValue);
  if (!Number.isFinite(value)) return null;

  const currency = match[3] ? match[3].trim() : currencyFromSymbol(symbol);
  return { value, currency, hasCurrency: Boolean(match[3] || symbol) };
}

function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

// Strategy 1: JSON-LD
function extractFromJsonLd() {
  const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : [data];

      const product = items.find(item => item["@type"] === "Product");
      if (!product) continue;

      const offers = product.offers ? (Array.isArray(product.offers) ? product.offers[0] : product.offers) : null;
      if (!offers) continue;

      const price = offers.price ?? offers.priceSpecification?.price;
      const currency = offers.priceCurrency ?? offers.priceSpecification?.priceCurrency;

      if (price !== undefined && price !== null) {
        return { price: Number(price), currency: currency || "" };
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

// Strategy 2: Meta Tags
function extractFromMeta() {
  const selectors = [
    "meta[itemprop='price']",
    "meta[property='product:price:amount']",
    "meta[property='og:price:amount']",
    "meta[name='twitter:data1']", // Sometimes used for price
    "meta[name='price']"
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.content) {
      const parsed = parsePriceFromText(el.content);
      if (parsed) {
        // Try to find currency
        const curSel = document.querySelector("meta[itemprop='priceCurrency'], meta[property='product:price:currency'], meta[property='og:price:currency']");
        return { price: parsed.value, currency: curSel?.content || parsed.currency };
      }
    }
  }
  return null;
}

// Strategy 3: DOM Scanning (Heuristic)
function extractFromDom() {
  const selectors = [
    ".price", ".current-price", ".product-price", ".pdp-price",
    "[data-price]", "[itemprop='price']",
    "#priceblock_ourprice", "#priceblock_dealprice", // Amazon legacy
    ".a-price .a-offscreen", // Amazon modern
    ".price__current" // Shopify common
  ];

  const candidates = Array.from(document.querySelectorAll(selectors.join(",")));
  // Add generic search if specific selectors fail? 
  // Let's stick to candidates first.

  const scored = [];

  for (const el of candidates) {
    if (!isVisible(el)) continue;

    // Get text
    let text = el.textContent;
    // For Amazon .a-offscreen, it is hidden but contains the text.
    // Our isVisible check might fail on .a-offscreen if it has display:none, but typically it is clip-path.

    const valObj = parsePriceFromText(text);
    if (!valObj) continue;
    if (valObj.value <= 0) continue;

    let score = 0;
    const lowerClass = (el.className + " " + el.id).toLowerCase();

    if (lowerClass.includes("price")) score += 5;
    if (valObj.hasCurrency) score += 3;
    if (el.matches("h1 *, h2 *, .h1 *, .h2 *")) score += 2; // Price often near title

    // Penalize
    if (lowerClass.includes("old") || lowerClass.includes("original") || lowerClass.includes("was")) score -= 5;
    if (el.closest("del, strike, .strike")) score -= 10;

    scored.push({ ...valObj, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.length ? { price: scored[0].value, currency: scored[0].currency } : null;
}

function extractTitle() {
  const ogTitle = document.querySelector("meta[property='og:title']");
  if (ogTitle && ogTitle.content) return ogTitle.content.trim();

  const h1 = document.querySelector("h1");
  if (h1) return h1.textContent.trim();

  return document.title.trim();
}

function extractProductData() {
  // Priority: JSON-LD > Meta > DOM
  let data = extractFromJsonLd();
  if (!data) data = extractFromMeta();
  if (!data) data = extractFromDom();

  if (data) {
    return {
      title: extractTitle(),
      price: data.price,
      currency: data.currency,
      url: window.location.href
    };
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "extract_product") {
    sendResponse(extractProductData());
  }
  return true; // Keep channel open for async if needed
});
