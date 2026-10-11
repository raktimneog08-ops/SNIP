/**
 * content/action-executor.js
 * Executes approved single-step browser actions safely on the live page DOM.
 */

(function(global) {
  'use strict';

  class ActionExecutor {
    /**
     * Executes a single atomic browser action on a target element.
     * @param {Object} action - { action: "CLICK"|"TYPE"|"SELECT", elementId: number, value?: string }
     */
    static async execute(action) {
      const elementId = Number(action.elementId);
      const domEl = global.SnipElementScanner ? global.SnipElementScanner.findElementById(elementId) : null;

      if (!domEl) {
        throw new Error(`Target element #${elementId} could not be found on the page. It may have moved or been re-rendered.`);
      }

      // Scroll element smoothly into viewport center
      domEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      await new Promise(r => setTimeout(r, 150));

      switch (action.action) {
        case 'CLICK':
          return this._executeClick(domEl, elementId);

        case 'TYPE':
          return this._executeType(domEl, elementId, action.value || '');

        case 'SELECT':
          return this._executeSelect(domEl, elementId, action.value || '');

        default:
          throw new Error(`Unsupported action type: ${action.action}`);
      }
    }

    static _executeClick(el, elementId) {
      if (el.disabled) {
        throw new Error(`Element #${elementId} is currently disabled.`);
      }

      // Dispatch full mouse and pointer event sequence
      const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
      const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });

      el.focus();
      el.dispatchEvent(pointerDown);
      el.dispatchEvent(mouseDown);
      el.dispatchEvent(mouseUp);
      el.dispatchEvent(click);

      return {
        success: true,
        message: `Successfully clicked element #${elementId} (${el.tagName.toLowerCase()})`
      };
    }

    static _executeType(el, elementId, value) {
      if (global.SnipElementScanner && global.SnipElementScanner.isSensitive(el)) {
        throw new Error(`Security Guard: Element #${elementId} is protected. Automated typing is blocked.`);
      }

      el.focus();

      // React 15/16+ and modern frameworks override the `value` setter on HTMLInputElement.
      // To ensure reactive state updates, we invoke the native prototype setter.
      const isInput = el.tagName === 'INPUT';
      const isTextArea = el.tagName === 'TEXTAREA';

      if (isInput || isTextArea) {
        const proto = isInput ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value');

        if (nativeSetter && nativeSetter.set) {
          nativeSetter.set.call(el, value);
        } else {
          el.value = value;
        }

        // Dispatch input and change events for framework reconciliation
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      } else if (el.isContentEditable) {
        el.textContent = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }

      return {
        success: true,
        message: `Successfully typed "${value}" into element #${elementId}`
      };
    }

    static _executeSelect(el, elementId, value) {
      if (el.tagName !== 'SELECT') {
        throw new Error(`Element #${elementId} is a ${el.tagName}, not a <select> dropdown.`);
      }

      let matched = false;
      // Try matching by option value or text content
      for (let i = 0; i < el.options.length; i++) {
        const opt = el.options[i];
        if (opt.value.toLowerCase() === value.toLowerCase() || opt.text.toLowerCase().includes(value.toLowerCase())) {
          el.selectedIndex = i;
          matched = true;
          break;
        }
      }

      if (!matched && el.options.length > 0) {
        el.selectedIndex = 0;
      }

      el.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        success: true,
        message: `Selected option "${value}" on element #${elementId}`
      };
    }
  }

  global.SnipActionExecutor = ActionExecutor;
})(typeof window !== 'undefined' ? window : globalThis);
