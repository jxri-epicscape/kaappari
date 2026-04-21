const updateUI = (tabId, text, color = "#4688F1") => {
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
};

chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  updateUI(tab.id, "...");

  try {
    await chrome.debugger.attach(target, "1.3");
    updateUI(tab.id, "REC", "#EA4335");

    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, async (metrics) => {
      const { contentSize, visualViewport } = metrics;

      // Käytetään visualViewportia leveytenä, jotta vältetään tyhjät reunat Windowsilla
      const width = Math.floor(visualViewport.clientWidth);
      const height = Math.floor(contentSize.height);

      // 1. PAKOTETAAN SKAALAUS (Korjaa Mac/Retina mosaiikki-ilmiön)
      await chrome.debugger.sendCommand(target, "Emulation.setDeviceMetricsOverride", {
        width: width,
        height: height,
        deviceScaleFactor: 1,
        mobile: false
      });

      let format = height > 10000 ? "jpeg" : "png";
      let quality = format === "jpeg" ? 80 : 100;

      const screenshotParams = {
        format: format,
        quality: quality,
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: width, height: height, scale: 1 }
      };

      // 2. OTETAAN KAAPPAUS
      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, async (result) => {
        if (!chrome.runtime.lastError && result?.data) {
          const extension = format === "png" ? "png" : "jpg";
          const nyt = new Date();
          const aikaleima = `${nyt.getFullYear()}-${(nyt.getMonth()+1).toString().padStart(2,'0')}-${nyt.getDate()}_${nyt.getHours()}-${nyt.getMinutes()}`;
          
          chrome.downloads.download({
            url: `data:image/${format};base64,${result.data}`,
            filename: `kaappaus_${aikaleima}.${extension}`,
            saveAs: true
          }, () => updateUI(tab.id, ""));
        }
        
        // 3. PALAUTETAAN ASETUKSET JA IRROTETAAN
        await chrome.debugger.sendCommand(target, "Emulation.clearDeviceMetricsOverride", {});
        chrome.debugger.detach(target);
      });
    });
  } catch (err) {
    updateUI(tab.id, "ERR", "#000000");
    chrome.debugger.detach(target).catch(() => {});
    setTimeout(() => updateUI(tab.id, ""), 3000);
  }
});
