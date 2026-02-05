function currencyFromSymbol(symbol) {
  if (!symbol) {
    return "";
  }
  const map = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₹": "INR",
    "¥": "JPY"
  };
  return map[symbol] || "";
}

function parsePriceFromText(text) {
  if (!text) {
    return null;
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/([₹$€£¥])?\s*([0-9][0-9,\.]*)(?:\s*([A-Z]{3}))?/);
  if (!match) {
    return null;
  }
  const symbol = match[1] || "";
  const rawValue = match[2].replace(/,/g, "");
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return null;
  }
  const currency = match[3] ? match[3].trim() : currencyFromSymbol(symbol);
  const hasCurrency = Boolean(match[3] || symbol);
  return { value, currency, hasCurrency };
}

function isVisible(element) {
  if (!element) {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function extractFromJsonLd() {
  const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const product = Array.isArray(data) ? data.find((item) => item["@type"] === "Product") : data;
      const offers = product?.offers ? (Array.isArray(product.offers) ? product.offers[0] : product.offers) : null;
      const offerPrice = offers?.price ?? offers?.priceSpecification?.price;
      if (offers && offerPrice) {
        const price = Number(offerPrice);
        const currency = offers.priceCurrency || offers?.priceSpecification?.priceCurrency || "";
        if (Number.isFinite(price)) {
          return { price, currency };
        }
      }
    } catch (error) {
      // ignore invalid JSON-LD
    }
  }
  return null;
}

function extractFromMeta() {
  const selectors = [
    "meta[itemprop='price']",
    "meta[property='product:price:amount']",
    "meta[property='og:price:amount']"
  ];
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (node && node.content) {
      const parsed = parsePriceFromText(node.content);
      if (parsed) {
        const currencyNode = document.querySelector("meta[itemprop='priceCurrency'], meta[property='product:price:currency']");
        const currency = currencyNode?.content || parsed.currency;
        return { price: parsed.value, currency };
      }
    }
  }
  return null;
}

function extractFromDom() {
  const selectors = [
    "[itemprop='price']",
    "[data-testid*='price']",
    "[data-test*='price']",
    "[data-price]",
    ".price",
    ".product-price",
    "[class*='price']",
    "[id*='price']"
  ];
  const candidates = Array.from(document.querySelectorAll(selectors.join(",")));
  const scored = [];
  for (const el of candidates) {
    if (!isVisible(el)) {
      continue;
    }
    const raw = el.getAttribute("content") || el.getAttribute("data-price") || el.textContent;
    const parsed = parsePriceFromText(raw || "");
    if (!parsed) {
      continue;
    }
    if (parsed.value < 0.1 || parsed.value > 10000000) {
      continue;
    }
    let score = 0;
    const className = (el.className || "").toString().toLowerCase();
    const idName = (el.id || "").toLowerCase();
    const testId = (el.getAttribute("data-testid") || "").toLowerCase();
    const text = (raw || "").toLowerCase();

    if (el.hasAttribute("itemprop") || el.tagName === "META") {
      score += 6;
    }
    if (el.hasAttribute("data-price")) {
      score += 5;
    }
    if (className.includes("price") || idName.includes("price") || testId.includes("price")) {
      score += 3;
    }
    if (parsed.hasCurrency) {
      score += 3;
    }
    if (raw && raw.length < 30) {
      score += 1;
    }

    if (text.includes("sale") || text.includes("now") || text.includes("current")) {
      score += 2;
    }
    if (text.includes("mrp") || text.includes("was") || text.includes("list")) {
      score -= 2;
    }
    if (el.closest("s, del, strike")) {
      score -= 3;
    }

    scored.push({ price: parsed.value, currency: parsed.currency, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.length ? { price: scored[0].price, currency: scored[0].currency } : null;
}

function extractTitle() {
  const og = document.querySelector("meta[property='og:title']");
  if (og && og.content) {
    return og.content;
  }
  const h1 = document.querySelector("h1");
  if (h1 && h1.textContent) {
    return h1.textContent.trim();
  }
  return document.title || "";
}

function extractProductData() {
  const jsonLd = extractFromJsonLd();
  const meta = extractFromMeta();
  const dom = extractFromDom();
  const result = jsonLd || meta || dom;
  if (!result) {
    return null;
  }
  return {
    title: extractTitle(),
    price: result.price,
    currency: result.currency,
    url: window.location.href
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "extract_product") {
    sendResponse(extractProductData());
  }
});
