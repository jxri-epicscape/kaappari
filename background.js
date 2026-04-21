chrome.action.onClicked.addListener(async (tab) => {
  // 1. Turvatarkistus: Ei toimi Chromen sisäisillä sivuilla
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
    console.warn("Cannot capture system pages.");
    return;
  }

  const target = { tabId: tab.id };

  try {
    // 2. Kiinnitetään debuggeri
    await chrome.debugger.attach(target, "1.3");

    // 3. Haetaan mitat (käytetään promise-pohjaista kutsua)
    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, async (metrics) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        chrome.debugger.detach(target);
        return;
      }

      const { contentSize } = metrics;
      
      // --- SUOJAKAIDE ---
      let format = "png";
      let quality = 100;
      
      if (contentSize.height > 10000) {
        format = "jpeg";
        quality = 80;
      }

      const screenshotParams = {
        format: format,
        quality: quality,
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: Math.floor(contentSize.width),
          height: Math.floor(contentSize.height),
          scale: 1
        }
      };

      // 4. Suoritetaan kaappaus
      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        if (chrome.runtime.lastError) {
          console.error("Capture failed:", chrome.runtime.lastError);
        } else if (result && result.data) {
          const extension = format === "png" ? "png" : "jpg";
          const dataUrl = `data:image/${format};base64,${result.data}`;
          
          chrome.downloads.download({
            url: dataUrl,
            filename: `capture-${Date.now()}.${extension}`
          });
        }
        
        // 5. Irrotetaan debuggeri aina lopuksi
        chrome.debugger.detach(target);
      });
    });
  } catch (err) {
    console.error("Execution failed:", err);
    // Varmistetaan, ettei debugger jää roikkumaan virhetilanteessa
    chrome.debugger.detach(target).catch(() => {});
  }
});
