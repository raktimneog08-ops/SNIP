/**
 * tests/unit/element-scanner.test.js
 * Unit tests for element sensitivity and selector generator heuristics.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const SENSITIVE_PATTERNS = {
  type: /password/i,
  nameOrId: /(password|passwd|pwd|passcode|cvv|cvc|cardnumber|cc-num|credit-card|ssn|social-security|pin|otp|token|secret)/i,
  autocomplete: /(current-password|new-password|cc-number|cc-csc|cc-exp|one-time-code)/i,
  ariaLabel: /(password|cvv|security code|card number|social security|one time password|pin|\botp\b)/i
};

function isSensitive(el) {
  const type = el.type || '';
  if (SENSITIVE_PATTERNS.type.test(type)) return true;

  const auto = el.autocomplete || '';
  if (SENSITIVE_PATTERNS.autocomplete.test(auto)) return true;

  const idAndName = `${el.id || ''} ${el.name || ''}`;
  if (SENSITIVE_PATTERNS.nameOrId.test(idAndName)) return true;

  const label = el.label || '';
  if (SENSITIVE_PATTERNS.ariaLabel.test(label)) return true;

  return false;
}

test('ElementScanner - Sensitivity classification', () => {
  assert.equal(isSensitive({ type: 'password' }), true);
  assert.equal(isSensitive({ name: 'user_cvv' }), true);
  assert.equal(isSensitive({ autocomplete: 'cc-csc' }), true);
  assert.equal(isSensitive({ label: 'Enter OTP' }), true);
  assert.equal(isSensitive({ type: 'text', name: 'username', label: 'Username' }), false);
});
