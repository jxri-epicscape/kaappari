chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };

  try {
    await chrome.debugger.attach(target, "1.3");

    chrome.debugger.sendCommand(target, "Page.getLayoutMetrics", {}, (metrics) => {
      if (chrome.runtime.lastError || !metrics) {
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

      chrome.debugger.sendCommand(target, "Page.captureScreenshot", screenshotParams, (result) => {
        if (!chrome.runtime.lastError && result && result.data) {
          const extension = format === "png" ? "png" : "jpg";
          const dataUrl = `data:image/${format};base64,${result.data}`;
          
          // Luodaan kaunis aikaleima: vvvv-kk-pp_tt-mm
          const nyt = new Date();
          const aikaleima = nyt.toISOString().split('T')[0] + "_" + 
                           nyt.getHours().toString().padStart(2, '0') + "-" + 
                           nyt.getMinutes().toString().padStart(2, '0');
          
          chrome.downloads.download({
            url: dataUrl,
            filename: `kaappaus_${aikaleima}.${extension}`,
            saveAs: true // Avaa "Tallenna nimellä" -ikkunan
          });
        }
        
        chrome.debugger.detach(target);
      });
    });
  } catch (err) {
    chrome.debugger.detach(target).catch(() => {});
  }
});
