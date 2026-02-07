# 🎯 dealRadar: Smart Price Tracking Extension

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

### 🎨 Premium UI/UX
- **Modern Design**: Clean, glassmorphism-inspired interface with rounded corners and smooth transitions.
- **Dark Mode Support**: Automatically adapts to your system's color scheme.
- **Non-Intrusive**: Uses toast notifications and custom modals for a seamless experience.

---

## 🛠️ Installation

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

## 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
