chrome.action.onClicked.addListener((tab) => {
  const target = { tabId: tab.id };

  // 1. Kiinnitetään debuggeri välilehteen
  chrome.debugger.attach(target, "1.3", () => {
    
    // 2. Pyydetään sivun mitat
    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      const { contentSize } = metrics;

      // 3. Otetaan kuvakaappaus käyttäen sivun todellisia mittoja
      const screenshotParams = {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: contentSize.width,
          height: contentSize.height,
          scale: 1
        }
      };

      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        // 4. Tallennetaan kuva
        const url = "data:image/png;base64," + result.data;
        chrome.downloads.download({
          url: url,
          filename: "koko-sivu.png"
        });

        // 5. Irrotetaan debuggeri
        chrome.debugger.detach(target);
      });
    });
  });
});