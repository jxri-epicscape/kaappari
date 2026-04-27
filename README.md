# kaappari
Native Full-Page Capture Engine

A high-performance Chrome Extension designed to bypass the limitations of standard viewport capturing. Instead of the traditional "scroll-and-stitch" method, this tool interacts directly with the browser's rendering engine.

## The Core Difference

Most screenshot extensions take multiple snapshots and glue them together, which often results in misaligned elements or broken fixed-position headers repeating across segments.

This extension leverages the Chrome DevTools Protocol (CDP) via the `chrome.debugger` API. It commands the Blink rendering engine to calculate the full layout metrics and render the entire DOM into a single image buffer — the same technique used by headless Chrome tools like Puppeteer. The difference is that this runs inside the user's own browser session, with their cookies, logins, and live page state intact.

## Why `debugger` Permission?

Full-page capture without scroll-stitching requires `Page.captureScreenshot` with `captureBeyondViewport: true`. This is only accessible through the Chrome DevTools Protocol, which in turn requires the `debugger` permission.

The standard alternative — `chrome.tabs.captureVisibleTab` — is limited to the current viewport. There is no middle ground: either you stitch, or you use the debugger.

This is the same permission used by React Developer Tools, Redux DevTools, and Chrome's own Lighthouse extension.

## Key Technical Features

**Blink Engine Integration:** Uses `Page.getLayoutMetrics` to retrieve the actual content dimensions regardless of window size.

**Deep Capture:** `captureBeyondViewport: true` combined with `Emulation.setDeviceMetricsOverride` forces the browser to render the full page height before capturing. The override is always applied — not just on HiDPI displays — ensuring below-fold content is fully rendered.

**Stability Guardrails:** For pages exceeding 12,000px, the engine caps the capture height to prevent memory overflows. For pages over 8,000px it dynamically switches from lossless PNG to optimized JPEG, keeping file sizes manageable without visible quality loss.

**Consistent Async Flow:** Built entirely with `async/await` and a unified `send()` helper for all CDP commands. Cleanup (override reset, debugger detach) runs in a `finally` block regardless of success or failure.

## Tech Stack

- JavaScript (ES6+)
- Chrome Extension API (Manifest V3)
- Chrome DevTools Protocol (CDP)

## Installation (Developer Mode)

1. Clone this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.

**Remember to pin it!**

> When Chrome shows a debugger warning bar at the top of the page, you can dismiss it — it does not interrupt the capture.

## Lessons Learned

The first challenge was a hardware-software bottleneck: capturing extremely long pages caused browser process crashes (SIGTRAP) due to PNG encoding buffer limits. The solution was dynamic format switching based on layout metrics, capping at 12,000px with JPEG compression for tall pages.

The second challenge was a subtle async bug: mixing callback-style and `await`-style CDP calls meant errors inside callbacks silently escaped the `try/catch` block. Unifying all calls through a single promise-based helper fixed the issue and made the control flow predictable.

---
### Credits
Icon designed by [icon wind](https://www.flaticon.com/authors/icon-wind) from [Flaticon](https://www.flaticon.com/).
