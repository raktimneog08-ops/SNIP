/**
 * content/element-scanner.js
 * Scans page DOM for interactive elements and builds a clean numbered action map.
 */

(function(global) {
  'use strict';

  const INTERACTIVE_SELECTORS = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="combobox"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[contenteditable="true"]',
    '[tabindex="0"]'
  ];

  const SENSITIVE_PATTERNS = {
    type: /password/i,
    nameOrId: /(password|passwd|pwd|passcode|cvv|cvc|cardnumber|cc-num|credit-card|ssn|social-security|pin|otp|token|secret)/i,
    autocomplete: /(current-password|new-password|cc-number|cc-csc|cc-exp|one-time-code)/i,
    ariaLabel: /(password|cvv|security code|card number|social security|one time password|pin)/i
  };

  class ElementScanner {
    /**
     * Checks if a DOM element is currently visible to the user.
     */
    static isVisible(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return false;
      }
      return true;
    }

    /**
     * Extracts an accessible, human-readable label for an element.
     */
    static extractLabel(el) {
      // 1. Explicit aria-label or aria-labelledby
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

      const ariaLabelledBy = el.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const labelEl = document.getElementById(ariaLabelledBy);
        if (labelEl && labelEl.textContent.trim()) return labelEl.textContent.trim();
      }

      // 2. HTML label element for inputs
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (labelEl && labelEl.textContent.trim()) return labelEl.textContent.trim();
      }

      const parentLabel = el.closest('label');
      if (parentLabel && parentLabel.textContent.trim()) {
        return parentLabel.textContent.trim();
      }

      // 3. Placeholder or title
      const placeholder = el.getAttribute('placeholder');
      if (placeholder && placeholder.trim()) return placeholder.trim();

      const title = el.getAttribute('title');
      if (title && title.trim()) return title.trim();

      // 4. Input value if button
      if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button')) {
        return el.value || 'Submit';
      }

      // 5. Text content
      const text = el.innerText || el.textContent || '';
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (cleanText.length > 0 && cleanText.length < 80) {
        return cleanText;
      }

      // 6. Name or ID fallback
      return el.name || el.id || el.tagName.toLowerCase();
    }

    /**
     * Checks if the element contains sensitive information (password, credit card, etc.).
     */
    static isSensitive(el) {
      const type = el.getAttribute('type') || '';
      if (SENSITIVE_PATTERNS.type.test(type)) return true;

      const auto = el.getAttribute('autocomplete') || '';
      if (SENSITIVE_PATTERNS.autocomplete.test(auto)) return true;

      const idAndName = `${el.id || ''} ${el.name || ''}`;
      if (SENSITIVE_PATTERNS.nameOrId.test(idAndName)) return true;

      const label = this.extractLabel(el);
      if (SENSITIVE_PATTERNS.ariaLabel.test(label)) return true;

      return false;
    }

    /**
     * Generates a stable CSS selector path for an element.
     */
    static getSelector(el) {
      if (el.id) return `#${CSS.escape(el.id)}`;
      if (el.name && el.tagName === 'INPUT') return `input[name="${CSS.escape(el.name)}"]`;

      let path = [];
      let current = el;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).filter(c => !c.startsWith('snip-'));
          if (classes.length > 0) {
            selector += '.' + CSS.escape(classes[0]);
          }
        }
        let sibIndex = 1;
        let sibling = current.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === current.tagName) sibIndex++;
          sibling = sibling.previousElementSibling;
        }
        if (sibIndex > 1) {
          selector += `:nth-of-type(${sibIndex})`;
        }
        path.unshift(selector);
        current = current.parentElement;
      }
      return path.join(' > ');
    }

    /**
     * Scans the active page and returns a list of indexed ActionElements.
     */
    static scan() {
      const elements = document.querySelectorAll(INTERACTIVE_SELECTORS.join(','));
      const results = [];
      let nextId = 1;

      elements.forEach(el => {
        // Skip extension overlay elements
        if (el.closest('#snip-action-overlay-root')) return;

        if (!this.isVisible(el)) return;

        const rect = el.getBoundingClientRect();
        // Skip elements completely outside viewport if very far
        if (rect.bottom < -200 || rect.top > window.innerHeight + 1500) {
          return;
        }

        const tag = el.tagName.toUpperCase();
        const type = el.getAttribute('type') || (tag === 'INPUT' ? 'text' : '');
        const label = this.extractLabel(el);
        const sensitive = this.isSensitive(el);
        const selector = this.getSelector(el);

        // Store reference on DOM element for instant retrieval
        el._snipElementId = nextId;

        results.push({
          id: nextId,
          tag,
          type,
          label,
          name: el.name || '',
          placeholder: el.getAttribute('placeholder') || '',
          value: (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !sensitive ? el.value : '',
          selector,
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          isSensitive: sensitive,
          disabled: Boolean(el.disabled)
        });

        nextId++;
      });

      return results;
    }

    /**
     * Retrieves the DOM element corresponding to a given ActionElement ID.
     */
    static findElementById(id) {
      const all = document.querySelectorAll(INTERACTIVE_SELECTORS.join(','));
      for (const el of all) {
        if (el._snipElementId === id) return el;
      }
      return null;
    }
  }

  global.SnipElementScanner = ElementScanner;
})(typeof window !== 'undefined' ? window : globalThis);
