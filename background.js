/**
 * PROJECT: Native Full-Page Capture Engine
 * PURPOSE: Chrome DevTools Protocol (CDP) full-page screenshot.
 * Uses Page.captureScreenshot with captureBeyondViewport: true
 * to avoid scroll-and-stitch artifacts. Requires debugger permission.
 */

const updateUI = (tabId, text, color = "#4688F1") => {
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
};

const send = (target, method, params = {}) =>
  chrome.debugger.sendCommand(target, method, params);

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.startsWith("chrome://")) {
    updateUI(tab.id, "ERR", "#000000");
    return;
  }

  const target = { tabId: tab.id };
  const MAX_HEIGHT = 12000;
  updateUI(tab.id, "...");

  try {
    await chrome.debugger.attach(target, "1.3");
    updateUI(tab.id, "REC", "#EA4335");

    const metrics = await send(target, "Page.getLayoutMetrics");
    const { contentSize, visualViewport } = metrics;
    const width = Math.floor(visualViewport.clientWidth);
    const fullHeight = Math.floor(contentSize.height);
    const finalHeight = Math.min(fullHeight, MAX_HEIGHT);
    const isClipped = fullHeight > MAX_HEIGHT;

    // Set override always so browser renders content beyond viewport
    await send(target, "Emulation.setDeviceMetricsOverride", {
      width,
      height: finalHeight,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise(r => setTimeout(r, 300));

    const format = finalHeight > 8000 ? "jpeg" : "png";
    const result = await send(target, "Page.captureScreenshot", {
      format,
      quality: format === "jpeg" ? 85 : 100,
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: finalHeight, scale: 1 },
    });

    console.log(`Screenshot: ${Math.round(result.data.length * 0.75 / 1024)} KB, korkeus: ${finalHeight}px`);

    const ext = format === "jpeg" ? "jpg" : "png";
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;

    await chrome.downloads.download({
      url: `data:image/${format};base64,${result.data}`,
      filename: `capture_${ts}.${ext}`,
      saveAs: true,
    });

    updateUI(tab.id, "");

    if (isClipped) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "kaappari128.png",
        title: "Capture Successful",
        message: "Rajattu 12 000 px:iin vakauden vuoksi.",
      });
    }

  } catch (err) {
    console.error("Capture failed:", err);
    updateUI(tab.id, "ERR", "#000000");
    setTimeout(() => updateUI(tab.id, ""), 3000);
  } finally {
    await send(target, "Emulation.clearDeviceMetricsOverride").catch(() => {});
    await chrome.debugger.detach(target).catch(() => {});
  }
});
