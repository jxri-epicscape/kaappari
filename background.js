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

chrome.action.onClicked.addListener(async (tab) => {
  console.log("Klikattu! Tab:", tab.id, tab.url);

  if (!tab.url || !tab.url.startsWith("http")) {
    console.error("Ei voi kaapata tätä sivua:", tab.url);
    chrome.action.setBadgeText({ text: "!" });
    return;
  }

  const target = { tabId: tab.id };

  try {
    chrome.action.setBadgeText({ text: "..." });

    await chrome.debugger.attach(target, "1.3");
    await sendCommand(target, "Page.enable", {});

    const metrics = await sendCommand(target, "Page.getLayoutMetrics", {});
    const { width, height } = metrics.contentSize;
    console.log("Mitat:", width, "x", height);

    // Guardrail: yli 10 000px sivu -> JPEG muistin säästämiseksi
    const useJpeg = height > JPEG_THRESHOLD;
    const format = useJpeg ? "jpeg" : "png";
    const quality = useJpeg ? 85 : undefined;
    console.log(`Käytetään: ${format}${useJpeg ? " (guardrail aktivoitu, sivu yli 10 000px)" : ""}`);

    const captureParams = {
      format,
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: Math.floor(width),
        height: Math.floor(height),
        scale: 1
      }
    };
    if (quality !== undefined) captureParams.quality = quality;

    const result = await sendCommand(target, "Page.captureScreenshot", captureParams);

    const ext = useJpeg ? "jpg" : "png";
    await chrome.downloads.download({
      url: `data:image/${format};base64,` + result.data,
      filename: `kaappaus-${Date.now()}.${ext}`,
      saveAs: true  // kysyy tallennussijainnin käyttäjältä
    });

    chrome.action.setBadgeText({ text: "✓" });
    console.log("Valmis!");

  } catch (err) {
    console.error("Virhe:", err.message);
    chrome.action.setBadgeText({ text: "!" });
  } finally {
    chrome.debugger.detach(target).catch(() => {});
  }
});
