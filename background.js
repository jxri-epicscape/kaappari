// Apuohjelma palautteen antamiseen ikonin päällä (Badge)
const updateUI = (tabId, text, color = "#4688F1") => {
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
};

chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  
  // 1. Aloitetaan prosessi ja näytetään indikaattori
  updateUI(tab.id, "...");

  try {
    // Kiinnitetään debugger (CDP-protokolla)
    await chrome.debugger.attach(target, "1.3");
    updateUI(tab.id, "REC", "#EA4335");

    // 2. Haetaan sivun tarkat metriikat
    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      if (chrome.runtime.lastError || !metrics) {
        throw new Error("Mittausten haku epäonnistui.");
      }

      const { contentSize, visualViewport } = metrics;
      
      // Korjataan tyhjä tila sivuilla: käytetään visualViewportia jos mahdollista
      const realWidth = Math.floor(visualViewport.clientWidth || contentSize.width);
      const realHeight = Math.floor(contentSize.height);

      // --- SUOJAKAIDE ---
      // Jos sivu on massiivinen, vaihdetaan PNG -> JPEG vakauden vuoksi
      let format = realHeight > 10000 ? "jpeg" : "png";
      let quality = format === "jpeg" ? 80 : 100;

      const screenshotParams = {
        format: format,
        quality: quality,
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: realWidth,
          height: realHeight,
          scale: 1
        }
      };

      // 3. Suoritetaan varsinainen kaappaus
      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        if (!chrome.runtime.lastError && result?.data) {
          const extension = format === "png" ? "png" : "jpg";
          
          // Luodaan selkeä aikaleima tiedostonimeen
          const nyt = new Date();
          const pvm = nyt.toISOString().split('T')[0];
          const klo = nyt.getHours().toString().padStart(2, '0') + "-" + 
                      nyt.getMinutes().toString().padStart(2, '0');
          
          chrome.downloads.download({
            url: `data:image/${format};base64,${result.data}`,
            filename: `kaappaus_${pvm}_${klo}.${extension}`,
            saveAs: true // Käyttäjä saa valita kansion ja nimen
          }, () => {
            updateUI(tab.id, ""); // Valmis, poistetaan indikaattori
          });
        }
        
        // Irrotetaan debuggeri aina onnistumisen jälkeen
        chrome.debugger.detach(target);
      });
    });

  } catch (err) {
    console.error("Virhe:", err);
    updateUI(tab.id, "ERR", "#000000"); // Näytetään ERR-viesti
    
    // Irrotetaan debuggeri jos se jäi jumiin
    chrome.debugger.detach(target).catch(() => {});
    
    // Poistetaan virheilmoitus 3 sekunnin kuluttua
    setTimeout(() => updateUI(tab.id, ""), 3000);
  }
});
