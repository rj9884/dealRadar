# dealRadar Browser Extension

Local-first price tracking for ecommerce pages. Track a product from any tab, view price history, and get alerts when prices drop.

## Load in Chrome

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this folder.

## Features

- Manual product tracking from the active tab.
- Price history chart (canvas) with min/max stats.
- Local storage (no backend).
- Daily background price checks and notifications.
- Deal score based on current vs average price.
- Remove tracked products from the list.
- Alert rules for target price or percent drop.

## Notes

- Price detection uses JSON-LD, meta tags, and DOM heuristics.
- Some sites block automated checks; those entries may not update.
- Chrome extension pages (chrome://) and the Chrome Web Store cannot be scanned.

## Troubleshooting

- If price detection is wrong, try a standard product page and track again.
- If the chart looks empty, track the same product multiple times to create history.
- If the popup is blank, reload the extension and reopen the popup.
