const JPEG_THRESHOLD = 10000;

const sendCommand = (target, method, params = {}) =>
  new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, method, params, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });

const setBadge = (tabId, text, title = "Native Full-Page Capture Engine") => {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setTitle({ title, tabId });
};

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  console.log("Klikattu! Tab:", tabId, tab.url);

  if (!tab.url || !tab.url.startsWith("http")) {
    setBadge(tabId, "!", "Ei voi kaapata tätä sivua: " + tab.url);
    console.error("Ei voi kaapata:", tab.url);
    return;
  }

  const target = { tabId };

  try {
    setBadge(tabId, "...", "Kiinnitetään debuggeria...");

    await chrome.debugger.attach(target, "1.3");
    console.log("Debugger kiinnitetty");

    await sendCommand(target, "Page.enable", {});
    console.log("Page enabled");

    setBadge(tabId, "...", "Haetaan sivun mittoja...");

    const metrics = await sendCommand(target, "Page.getLayoutMetrics", {});
    console.log("Metrics raw:", JSON.stringify(metrics));

    const size =
      metrics.cssContentSize ??
      metrics.contentSize ??
      metrics.layoutViewport;

    if (!size || !size.width || !size.height) {
      throw new Error("Sivun mittoja ei saatu: " + JSON.stringify(metrics));
    }

    const width = Math.floor(size.width);
    const height = Math.floor(size.height);
    console.log("Mitat:", width, "x", height);

    const useJpeg = height > JPEG_THRESHOLD;
    const format = useJpeg ? "jpeg" : "png";
    console.log(`Format: ${format}${useJpeg ? " (guardrail, korkeus yli 10 000px)" : ""}`);

    setBadge(tabId, "...", "Kaapataan sivua...");

    const captureParams = {
      format,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 }
    };
    if (useJpeg) captureParams.quality = 85;

    const result = await sendCommand(target, "Page.captureScreenshot", captureParams);

    if (!result || !result.data) {
      throw new Error("Kuvakaappaus palautti tyhjän tuloksen");
    }

    console.log("Kuva saatu, tallennetaan...");

    const ext = useJpeg ? "jpg" : "png";
    await chrome.downloads.download({
      url: `data:image/${format};base64,` + result.data,
      filename: `kaappaus-${Date.now()}.${ext}`,
      saveAs: true
    });

    setBadge(tabId, "✓", "Kaappaus valmis!");
    console.log("Valmis!");

  } catch (err) {
    console.error("Virhe:", err.message);
    setBadge(tabId, "!", "Virhe: " + err.message);
  } finally {
    chrome.debugger.detach(target).catch(() => {});
  }
});
