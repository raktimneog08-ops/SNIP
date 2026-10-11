/**
 * background/service-worker.js
 * Chrome Extension Manifest V3 Background Service Worker for Snip.
 */

import { ContextMenusManager } from './context-menus.js';

// Configure side panel to open on action toolbar icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[Snip] Error setting panel behavior:', err));

// Initialize right-click context menus
ContextMenusManager.init();

// Global runtime message router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CAPTURE_SCREEN') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true; // async response
  }

  if (request.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      sendResponse({ tab: activeTab });
    });
    return true;
  }
});
