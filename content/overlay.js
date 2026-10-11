/**
 * content/overlay.js
 * Injects and manages the visual numbered badge overlay.
 */

(function(global) {
  'use strict';

  class ActionOverlay {
    constructor() {
      this.root = null;
      this.elements = [];
      this._scrollHandler = this._debounce(() => this.reposition(), 100);
    }

    _ensureRoot() {
      if (!this.root || !document.body.contains(this.root)) {
        this.root = document.createElement('div');
        this.root.id = 'snip-action-overlay-root';
        document.body.appendChild(this.root);
      }
      return this.root;
    }

    render(elements = []) {
      this.clear();
      this.elements = elements;
      const root = this._ensureRoot();

      elements.forEach(item => {
        const domEl = global.SnipElementScanner ? global.SnipElementScanner.findElementById(item.id) : null;
        if (!domEl) return;

        const rect = domEl.getBoundingClientRect();
        const badge = document.createElement('span');
        badge.className = 'snip-badge' + (item.isSensitive ? ' snip-badge-sensitive' : '');
        badge.id = `snip-badge-${item.id}`;
        badge.textContent = item.id;
        badge.title = `${item.label || item.tag} (#${item.id})`;

        const pageX = window.scrollX + rect.left;
        const pageY = window.scrollY + rect.top;

        badge.style.left = `${pageX}px`;
        badge.style.top = `${pageY}px`;

        root.appendChild(badge);
      });

      window.addEventListener('scroll', this._scrollHandler, { passive: true });
      window.addEventListener('resize', this._scrollHandler, { passive: true });
    }

    highlightBadge(elementId) {
      document.querySelectorAll('.snip-badge-highlight').forEach(b => b.classList.remove('snip-badge-highlight'));
      const badge = document.getElementById(`snip-badge-${elementId}`);
      if (badge) {
        badge.classList.add('snip-badge-highlight');
      }
    }

    reposition() {
      if (!this.root) return;

      this.elements.forEach(item => {
        const badge = document.getElementById(`snip-badge-${item.id}`);
        const domEl = global.SnipElementScanner ? global.SnipElementScanner.findElementById(item.id) : null;
        if (badge && domEl) {
          const rect = domEl.getBoundingClientRect();
          const pageX = window.scrollX + rect.left;
          const pageY = window.scrollY + rect.top;
          badge.style.left = `${pageX}px`;
          badge.style.top = `${pageY}px`;
        }
      });
    }

    clear() {
      if (this.root && this.root.parentElement) {
        this.root.parentElement.removeChild(this.root);
      }
      this.root = null;
      this.elements = [];
      window.removeEventListener('scroll', this._scrollHandler);
      window.removeEventListener('resize', this._scrollHandler);
    }

    _debounce(fn, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
      };
    }
  }

  global.SnipActionOverlay = new ActionOverlay();
})(typeof window !== 'undefined' ? window : globalThis);
