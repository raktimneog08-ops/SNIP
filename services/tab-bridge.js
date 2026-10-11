/**
 * services/tab-bridge.js
 * Robust communication bridge between Side Panel and active tab Content Scripts.
 * Handles automatic content script dynamic re-injection when extensions are reloaded.
 */

export async function sendTabMessage(tabId, message) {
  if (!tabId) {
    throw new Error('No active tab ID specified.');
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, async (response) => {
      if (chrome.runtime.lastError) {
        const errMsg = chrome.runtime.lastError.message || '';

        // If content script was disconnected or not yet injected into this tab
        if (
          errMsg.includes('Could not establish connection') ||
          errMsg.includes('Receiving end does not exist')
        ) {
          try {
            console.info('[Snip] Content script not active in tab. Auto-injecting via chrome.scripting...');

            // Dynamically inject scripts
            await chrome.scripting.executeScript({
              target: { tabId },
              files: [
                'vendor/Readability.js',
                'content/element-scanner.js',
                'content/overlay.js',
                'content/action-executor.js',
                'content/youtube.js',
                'content/content.js'
              ]
            });

            await chrome.scripting.insertCSS({
              target: { tabId },
              files: ['content/overlay.css']
            }).catch(() => {});

            // Brief pause for initialization
            await new Promise(r => setTimeout(r, 120));

            // Retry message dispatch
            chrome.tabs.sendMessage(tabId, message, (retryResponse) => {
              if (chrome.runtime.lastError) {
                resolve({
                  error: 'Connection pending. Please refresh this tab (Ctrl+R / F5) once so Snip can attach to the page.'
                });
              } else {
                resolve(retryResponse);
              }
            });
            return;
          } catch (injectErr) {
            console.warn('[Snip] Auto-inject failed:', injectErr);
            resolve({
              error: 'Please refresh this page tab (Ctrl+R / F5) once to connect Snip.'
            });
            return;
          }
        }

        resolve({ error: errMsg });
      } else {
        resolve(response);
      }
    });
  });
}
