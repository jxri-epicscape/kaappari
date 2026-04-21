chrome.action.onClicked.addListener(async (tab) => {
  // Estetään yritykset kaapata selaimen omia sisäisiä sivuja
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) return;

  const target = { tabId: tab.id };

  try {
    // 1. Kiinnitetään debuggeri
    await chrome.debugger.attach(target, "1.3");

    // 2. Pyydetään sivun todelliset mitat
    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      const { contentSize } = metrics;
      
      // --- SUOJAKAIDE ALKAA ---
      let format = "png";
      let quality = 100;
      
      // Jos sivu on yli 10 000 pikseliä korkea, vaihdetaan JPEG-muotoon vakauden vuoksi
      if (contentSize.height > 10000) {
        format = "jpeg";
        quality = 80; 
        console.log("Large page detected: Switching to optimized JPEG to prevent crash.");
      }
      // --- SUOJAKAIDE PÄÄTTYY ---

      // 3. Määritetään kaappausasetukset dynaamisesti
      const screenshotParams = {
        format: format,
        quality: quality,
        captureBeyondViewport: true,
        clip: {
          x: 0, y: 0,
          width: contentSize.width,
          height: contentSize.height,
          scale: 1
        }
      };

      // 4. Suoritetaan kaappaus
      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        if (result && result.data) {
          const extension = format === "png" ? "png" : "jpg";
          const url = `data:image/${format};base64,` + result.data;
          
          // 5. Tallennetaan tiedosto aikaleimalla
          chrome.downloads.download({
            url: url,
            filename: `capture-${Date.now()}.${extension}`
          });
        }
        
        // 6. Irrotetaan debuggeri aina onnistumisen jälkeen
        chrome.debugger.detach(target);
      });
    });
  } catch (err) {
    console.error("Debugger error:", err);
    // Varmistetaan irrotus virhetilanteessa, ettei palkki jää jumiin
    chrome.debugger.detach(target);
  }
});
