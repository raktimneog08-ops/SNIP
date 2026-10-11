/**
 * content/content.js
 * Central Content Script Message Router & DOM Bridge for Snip.
 */

(function() {
  'use strict';

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handleAsync = async () => {
      try {
        switch (request.type) {
          case 'PING':
            return {
              status: 'ok',
              url: window.location.href,
              title: document.title
            };

          case 'EXTRACT_ARTICLE': {
            let article = null;
            if (typeof window.Readability !== 'undefined') {
              const reader = new window.Readability(document);
              article = reader.parse();
            }

            if (!article) {
              const textContent = (document.body ? document.body.innerText : '').slice(0, 30000);
              article = {
                title: document.title,
                byline: '',
                content: `<div>${textContent}</div>`,
                textContent: textContent,
                length: textContent.length,
                excerpt: textContent.slice(0, 200)
              };
            }

            article.url = window.location.href;
            return { success: true, article };
          }

          case 'GET_YOUTUBE_DATA': {
            if (window.SnipYouTube) {
              return window.SnipYouTube.getVideoData();
            }
            return { isYouTube: false };
          }

          case 'SEEK_YOUTUBE': {
            if (window.SnipYouTube) {
              return window.SnipYouTube.seekTo(request.seconds);
            }
            throw new Error('YouTube controller not available');
          }

          case 'GET_SELECTED_TEXT': {
            const selection = window.getSelection();
            const text = selection ? selection.toString().trim() : '';
            return { selectedText: text };
          }

          case 'SCAN_ELEMENTS': {
            if (!window.SnipElementScanner) {
              throw new Error('Element scanner module not initialized.');
            }
            const elements = window.SnipElementScanner.scan();
            return { success: true, elements, count: elements.length };
          }

          case 'TOGGLE_OVERLAY': {
            if (!window.SnipActionOverlay) {
              throw new Error('Overlay module not initialized.');
            }
            if (request.visible && request.elements) {
              window.SnipActionOverlay.render(request.elements);
            } else {
              window.SnipActionOverlay.clear();
            }
            return { success: true };
          }

          case 'HIGHLIGHT_BADGE': {
            if (window.SnipActionOverlay && request.elementId) {
              window.SnipActionOverlay.highlightBadge(request.elementId);
            }
            return { success: true };
          }

          case 'EXECUTE_ACTION': {
            if (!window.SnipActionExecutor) {
              throw new Error('Action executor module not initialized.');
            }
            const result = await window.SnipActionExecutor.execute(request.action);
            return result;
          }

          default:
            return { error: `Unknown message type: ${request.type}` };
        }
      } catch (err) {
        console.error('[Snip ContentScript Error]', err);
        return { error: err.message };
      }
    };

    handleAsync().then(sendResponse);
    return true; // Keep message channel open for async response
  });
})();
