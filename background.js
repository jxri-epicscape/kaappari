chrome.action.onClicked.addListener(async (tab) => {
  console.log("Nappia painettu välilehdellä:", tab.id);

  const target = { tabId: tab.id };

  try {
    // Pakotetaan irrotus ensin, jos edellinen kerta jäi jumiin
    try {
      await chrome.debugger.detach(target);
    } catch (e) {
      // Ei haittaa vaikka epäonnistuu
    }

    console.log("Kiinnitetään debuggeri...");
    await chrome.debugger.attach(target, "1.3");
    console.log("Debuggeri kiinnitetty.");

    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      console.log("Metriikat saatu:", metrics);
      
      const { contentSize } = metrics;
      
      const screenshotParams = {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: Math.floor(contentSize.width),
          height: Math.floor(contentSize.height),
          scale: 1
        }
      };

      console.log("Yritetään kaappausta...");
      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        if (chrome.runtime.lastError) {
          console.error("Kaappausvirhe:", chrome.runtime.lastError.message);
        } else if (result && result.data) {
          console.log("Kuva saatu! Tallennetaan...");
          const dataUrl = "data:image/png;base64," + result.data;
          
          chrome.downloads.download({
            url: dataUrl,
            filename: `kaappaus-${Date.now()}.png`
          }, (downloadId) => {
            console.log("Lataus aloitettu, ID:", downloadId);
          });
        }
        
        chrome.debugger.detach(target);
      });
    });
  } catch (err) {
    console.error("Kriittinen virhe:", err.message);
    chrome.debugger.detach(target).catch(() => {});
  }
});
