/**
 * services/safety.js
 * Comprehensive Guardrails & Security Shield for Snip.
 * Prevents automated actions on sensitive pages and credential fields.
 */

export const SafetyService = {
  // Disallowed URL schemes and domains
  RESTRICTED_URL_PATTERNS: [
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^edge:\/\//i,
    /^about:/i,
    /^view-source:/i,
    /chromewebstore\.google\.com/i,
    /chrome\.google\.com\/webstore/i
  ],

  // Sensitive banking, checkout, and auth patterns
  SENSITIVE_DOMAIN_PATTERNS: [
    /banking/i,
    /onlinebanking/i,
    /netbanking/i,
    /chase\.com/i,
    /bankofamerica\.com/i,
    /wellsfargo\.com/i,
    /citi\.com/i,
    /capitalone\.com/i,
    /paypal\.com\/(signin|cgi-bin|checkout)/i,
    /checkout\.stripe\.com/i,
    /dashboard\.stripe\.com/i,
    /razorpay\.com\/checkout/i,
    /auth0\.com/i,
    /okta\.com/i,
    /accounts\.google\.com\/(signin|v3\/signin)/i
  ],

  // Sensitive input attribute patterns (passwords, payment cards, CVVs, OTPs)
  SENSITIVE_INPUT_REGEXPS: {
    type: /password/i,
    nameOrId: /(password|passwd|pwd|passcode|cvv|cvc|cardnumber|cc-num|credit-card|ssn|social-security|pin|otp|token|secret)/i,
    autocomplete: /(current-password|new-password|cc-number|cc-csc|cc-exp|one-time-code)/i,
    ariaLabel: /(password|cvv|security code|card number|social security|one time password|pin|\botp\b)/i
  },

  /**
   * Checks whether the current URL is allowed for browser automation.
   * Returns { isAllowed: boolean, isSensitive: boolean, reason?: string }
   */
  evaluateUrl(url = '') {
    if (!url) {
      return { isAllowed: false, isSensitive: false, reason: 'No active web page detected.' };
    }

    // Check system/internal URLs (completely restricted by Chrome)
    for (const pattern of this.RESTRICTED_URL_PATTERNS) {
      if (pattern.test(url)) {
        return {
          isAllowed: false,
          isSensitive: false,
          reason: 'Chrome does not allow extensions to run on internal browser pages or the Chrome Web Store.'
        };
      }
    }

    // Check sensitive banking/auth portals
    for (const pattern of this.SENSITIVE_DOMAIN_PATTERNS) {
      if (pattern.test(url)) {
        return {
          isAllowed: true, // Read-only / summary allowed, but execution blocked
          isSensitive: true,
          reason: 'Protected sensitive page (Banking / Payment / Auth). Automation is shielded.'
        };
      }
    }

    return { isAllowed: true, isSensitive: false };
  },

  /**
   * Checks if a DOM element or element descriptor is sensitive.
   * @param {Object} el - { tag, type, name, id, autocomplete, placeholder, ariaLabel }
   */
  isElementSensitive(el = {}) {
    if (!el) return false;

    // Direct password type check
    if (el.type && this.SENSITIVE_INPUT_REGEXPS.type.test(el.type)) {
      return true;
    }

    // Autocomplete attribute check
    if (el.autocomplete && this.SENSITIVE_INPUT_REGEXPS.autocomplete.test(el.autocomplete)) {
      return true;
    }

    // Name or ID check
    const idAndName = `${el.id || ''} ${el.name || ''}`;
    if (this.SENSITIVE_INPUT_REGEXPS.nameOrId.test(idAndName)) {
      return true;
    }

    // Label or placeholder check
    const labelAndPlaceholder = `${el.label || ''} ${el.placeholder || ''} ${el.ariaLabel || ''}`;
    if (this.SENSITIVE_INPUT_REGEXPS.ariaLabel.test(labelAndPlaceholder)) {
      return true;
    }

    return false;
  },

  /**
   * Evaluates whether an automated action step is safe to execute.
   * @param {Object} action - { action: "CLICK"|"TYPE", elementId, targetElement, value }
   * @param {string} currentUrl
   */
  validateProposedAction(action, targetElement, currentUrl) {
    const urlEval = this.evaluateUrl(currentUrl);
    if (!urlEval.isAllowed) {
      return {
        safe: false,
        error: urlEval.reason || 'Actions not allowed on this page.'
      };
    }

    if (urlEval.isSensitive) {
      return {
        safe: false,
        error: 'Execution is disabled on sensitive pages (Banking/Payment/Auth) to protect your security.'
      };
    }

    if (targetElement && this.isElementSensitive(targetElement)) {
      return {
        safe: false,
        error: `Element #${targetElement.id} (${targetElement.label || targetElement.name || 'field'}) is a protected sensitive field (password, CVV, or card info). Automated interaction is blocked.`
      };
    }

    return { safe: true };
  }
};
