chrome.action.onClicked.addListener(async (tab) => {
  console.log("Käynnistetään kaappaus...");
  const target = { tabId: tab.id };

  try {
    // 1. Yritetään kiinnittää debugger
    await chrome.debugger.attach(target, "1.3");
    console.log("Debugger kiinnitetty!");

    // 2. Haetaan mitat
    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      if (!metrics) {
        console.error("Mittausten haku epäonnistui.");
        chrome.debugger.detach(target);
        return;
      }

      const { contentSize } = metrics;
      console.log("Mitat saatu:", contentSize.width, "x", contentSize.height);

      // 3. Otetaan kuvakaappaus
      chrome.debugger.sendCommand(target, "Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: Math.floor(contentSize.width), height: Math.floor(contentSize.height), scale: 1 }
      }, (result) => {
        if (result && result.data) {
          console.log("Kuva valmis, tallennetaan...");
          chrome.downloads.download({
            url: "data:image/png;base64," + result.data,
            filename: `kaappaus-${Date.now()}.png`
          });
        }
        chrome.debugger.detach(target);
        console.log("Valmis!");
      });
    });
  } catch (err) {
    console.error("Virhe prosessissa:", err.message);
    chrome.debugger.detach(target).catch(() => {});
  }
});
