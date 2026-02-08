# 🎯 dealRadar: Smart Price Tracking Extension


[![Install on Firefox](https://img.shields.io/badge/Firefox-Install%20Addon-FF7139?style=for-the-badge&logo=firefox-browser)](https://addons.mozilla.org/addon/dealradar/)

**dealRadar** is a powerful, local-first Chrome extension designed to help you track product prices across any e-commerce website. With a modern, Apple-inspired interface, it provides instant price history visualization, smart deal scoring, and customizable price drop alerts—all without needing a user account or external backend.

---

## ✨ Key Features

### 🚀 Smart Tracking
- **Universal Compatibility**: Works on almost any product page (Amazon, Flipkart, etc.) using intelligent heuristics to detect price, currency, and product details.
- **One-Click Add**: Simply click "Track" on any product page to start monitoring.

### 📊 Visual Price History
- **Interactive Charts**: Hover over the beautiful gradient chart to see exact price points and dates.
- **Instant Stats**: Automatically calculates Min, Max, and Current prices.
- **Deal Score**: Analyzes the current price against the average to tell you if it's a "Great", "Good", or "High" price.

### 🔔 robust Alerts
- **Custom Targets**: Set a specific target price or a percentage drop (e.g., "Notify me if it drops by 10%").
- **Smart Notifications**: Get instant browser notifications when a price drop is detected.
- **Background Monitoring**: The extension quietly checks prices in the background periodically.

---

## 🛠️ Installation

### 🦊 Firefox
[**Click here to install from Add-ons for Firefox**](https://addons.mozilla.org/addon/dealradar/)

### ⚪ Chrome (Manual Install)

1.  **Clone or Download** this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in the top right).
4.  Click **Load unpacked**.
5.  Select the **`dealRadar`** folder (the root directory containing `manifest.json`).

---

## 📂 Project Structure

The project is organized for modularity and maintainability:

```text
dealRadar/
├── manifest.json        # Extension configuration
├── README.md            # Documentation
└── src/
    ├── background/      # Service worker for background tasks
    │   └── service-worker.js
    ├── content/         # Content scripts for price extraction
    │   └── content.js
    ├── popup/           # Popup UI and Logic
    │   ├── popup.html
    │   ├── popup.css    # Modern CSS variables & styles
    │   ├── popup.js     # Main entry point
    │   ├── ui.js        # UI rendering & interaction logic
    │   ├── chart.js     # Canvas chart rendering
    │   └── storage.js   # Local storage management
    └── utils/           # Shared utilities
        └── format.js
```

---

## 💻 Tech Stack

-   **Core**: HTML5, CSS3 (Variables, Flexbox/Grid), Vanilla JavaScript (ES Modules).
-   **Storage**: `chrome.storage.local` for persisting tracked items.
-   **Background Tasks**: `chrome.alarms` for scheduling price checks.
-   **Visuals**: HTML5 Canvas for charts.

---


## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
