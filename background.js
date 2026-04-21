// Apuohjelma palautteen antamiseen
const updateUI = (tabId, text, color = "#4688F1") => {
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
};

chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  
  // 1. Annetaan välitön palaute käyttäjälle
  updateUI(tab.id, "...");

  try {
    await chrome.debugger.attach(target, "1.3");
    updateUI(tab.id, "REC", "#EA4335"); // Punainen "REC" kun prosessi käynnissä

    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      if (chrome.runtime.lastError || !metrics) {
        throw new Error("Mittausten haku epäonnistui.");
      }

      const { contentSize } = metrics;
      let format = contentSize.height > 10000 ? "jpeg" : "png";
      let quality = format === "jpeg" ? 80 : 100;

      const screenshotParams = {
        format,
        quality,
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: 0, y: 0,
          width: Math.floor(contentSize.width),
          height: Math.floor(contentSize.height),
          scale: 1
        }
      };

      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        if (!chrome.runtime.lastError && result?.data) {
          const extension = format === "png" ? "png" : "jpg";
          const nyt = new Date();
          const aikaleima = `${nyt.getFullYear()}-${(nyt.getMonth()+1).toString().padStart(2,'0')}-${nyt.getDate()}_${nyt.getHours()}-${nyt.getMinutes()}`;
          
          chrome.downloads.download({
            url: `data:image/${format};base64,${result.data}`,
            filename: `kaappaus_${aikaleima}.${extension}`,
            saveAs: true
          }, () => {
            // Tyhjennetään badge kun valmis
            updateUI(tab.id, "");
          });
        }
        chrome.debugger.detach(target);
      });
    });

  } catch (err) {
    console.error(err);
    updateUI(tab.id, "ERR", "#000000"); // Musta ERR-teksti virheen merkiksi
    
    // Näytetään selkeä ilmoitus käyttäjälle
    chrome.notifications.create({
      type: "basic",
      iconUrl: "kaappari128.png",
      title: "Hups! Kaappaus epäonnistui",
      message: "Varmista, ettei välilehden tarkastaja (F12) ole auki ja sivu on ladattu loppuun."
    });
    
    chrome.debugger.detach(target).catch(() => {});
    setTimeout(() => updateUI(tab.id, ""), 3000); // Poistetaan ERR 3sek päästä
  }
});
