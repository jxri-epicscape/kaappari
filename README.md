# kaappari
Native Full-Page Capture Engine
A high-performance Chrome Extension designed to bypass the limitations of standard viewport capturing. Instead of the traditional "scroll-and-stitch" method, this tool interacts directly with the browser's rendering engine.

🚀 The Core Difference
Most screenshot extensions take multiple snapshots and glue them together, which often results in misaligned elements or broken fixed-position headers.

This extension leverages the Chrome DevTools Protocol (CDP) via the chrome.debugger API. It commands the Blink rendering engine to calculate the full layout metrics and render the entire DOM into a single image buffer.

🛠️ Key Technical Features
Blink Engine Integration: Uses Page.getLayoutMetrics to retrieve the actual content size regardless of the current window dimensions.

Deep Capture: Utilizes captureBeyondViewport: true to trigger a full-page render.

Stability Guardrails: Includes a custom memory-management logic. For extremely long pages (e.g., >10,000px), the engine dynamically switches from lossless PNG to optimized JPEG to prevent memory overflows and browser crashes (SIGTRAP).

Asynchronous Flow: Built with an async/await architecture to handle debugger attachment and command execution in the correct lifecycle order.

💻 Tech Stack
JavaScript (ES6+)

Chrome Extension API (Manifest V3)

Chrome DevTools Protocol (CDP)

📦 Installation (Developer Mode)
Clone this repository.

Open Chrome and navigate to chrome://extensions.

Enable Developer mode (top right).

Click Load unpacked and select the project folder.

Remember to pin it!

Note: When running, click "Cancel" on the debugger warning bar to keep it active, or simply ignore it during the capture.
