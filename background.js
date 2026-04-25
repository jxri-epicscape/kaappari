/**
 * PROJECT: Native Full-Page Capture Engine
 * PURPOSE: This extension uses the Chrome DevTools Protocol (CDP) to perform 
 * high-fidelity, full-page screenshots. 
 * * WHY DEBUGGER API? 
 * Standard APIs like chrome.tabs.captureVisibleTab are limited to the current viewport. 
 * To capture the entire page without "scroll-and-stitch" artifacts, we use 
 * 'Page.captureScreenshot' with 'captureBeyondViewport: true'. 
 * This requires the debugger permission to interface directly with the Blink engine.
 */

const updateUI = (tabId, text, color = "#4688F1") => {
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
};

chrome.action.onClicked.addListener(async (tab) => {
  // Prevent running on protected chrome:// pages
  if (tab.url?.startsWith("chrome://")) {
    updateUI(tab.id, "ERR", "#000000");
    return;
  }

  const target = { tabId: tab.id };
  // Safety cap to prevent GPU buffer overflow and SIGTRAP crashes
  const MAX_HEIGHT = 12000; 
  updateUI(tab.id, "...");

  try {
    await chrome.debugger.attach(target, "1.3");
    updateUI(tab.id, "REC", "#EA4335");

    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, async (metrics) => {
      if (chrome.runtime.lastError || !metrics) {
        throw new Error("Failed to get metrics");
      }

      const { contentSize, visualViewport } = metrics;
      const width = Math.floor(visualViewport.clientWidth);
      const fullHeight = Math.floor(contentSize.height);
      const viewportHeight = Math.floor(visualViewport.clientHeight);
      // Apply the hard limit (Option A)
      const finalHeight = Math.min(fullHeight, MAX_HEIGHT);
      const isClipped = fullHeight > MAX_HEIGHT;

      // Fix for Mac/Retina: Force 1:1 scale to prevent mosaic artifacts
      // We use finalHeight here to ensure the viewport matches our intended capture area
      await chrome.debugger.sendCommand(target, "Emulation.setDeviceMetricsOverride", {
        width: width,
        height: visualViewport.clientHeight,
        deviceScaleFactor: 1,
        mobile: false
      });

      // Guardrail: Switch to JPEG for long pages to manage memory usage
      let format = finalHeight > 8000 ? "jpeg" : "png";
      let quality = format === "jpeg" ? 85 : 100;

      const screenshotParams = {
        format: format,
        quality: quality,
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: width, height: finalHeight, scale: 1 }
      };

      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, async (result) => {
        if (!chrome.runtime.lastError && result?.data) {
          const extension = format === "png" ? "png" : "jpg";
          const now = new Date();
          const timestamp = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}`;
          
          chrome.downloads.download({
            url: `data:image/${format};base64,${result.data}`,
            filename: `capture_${timestamp}.${extension}`,
            saveAs: true
          }, () => {
            updateUI(tab.id, "");
            
            // Notify user if the page was clipped
            if (isClipped) {
              chrome.notifications.create({
                type: "basic",
                iconUrl: "kaappari128.png",
                title: "Capture Successful",
                message: "The image was limited to 12,000px to ensure stability."
              });
            }
          });
        }
        
        // Cleanup: Reset metrics and detach debugger
        await chrome.debugger.sendCommand(target, "Emulation.clearDeviceMetricsOverride", {});
        chrome.debugger.detach(target);
      });
    });
  } catch (err) {
    console.error("Capture failed:", err);
    updateUI(tab.id, "ERR", "#000000");
    chrome.debugger.detach(target).catch(() => {});
    setTimeout(() => updateUI(tab.id, ""), 3000);
  }
});
