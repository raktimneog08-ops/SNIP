/**
 * background/context-menus.js
 * Chrome Context Menus setup and click handling.
 */

export const ContextMenusManager = {
  init() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
          id: 'snip-parent',
          title: 'Snip AI',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'snip-explain',
          parentId: 'snip-parent',
          title: 'Explain this selection',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'snip-translate',
          parentId: 'snip-parent',
          title: 'Translate (Hindi / Hinglish)',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'snip-reply',
          parentId: 'snip-parent',
          title: 'Draft a reply',
          contexts: ['selection']
        });
      });
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (!tab || !tab.id) return;

      const selectedText = info.selectionText || '';
      let actionType = 'explain';

      if (info.menuItemId === 'snip-translate') actionType = 'translate';
      if (info.menuItemId === 'snip-reply') actionType = 'reply';

      // Open side panel in the active tab/window
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
      } catch (err) {
        console.warn('[Snip] sidePanel.open failed:', err);
      }

      // Store pending context action in chrome.storage.local so sidepanel picks it up immediately
      chrome.storage.local.set({
        pendingContextAction: {
          timestamp: Date.now(),
          actionType,
          selectedText,
          pageTitle: tab.title || '',
          pageUrl: tab.url || ''
        }
      });
    });
  }
};
