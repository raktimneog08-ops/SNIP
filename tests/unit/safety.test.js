/**
 * tests/unit/safety.test.js
 * Unit tests for safety shield, domain blacklist, and sensitive input protection.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SafetyService } from '../../services/safety.js';

test('SafetyService - Restricted Chrome URLs evaluation', () => {
  const chromeUrl = SafetyService.evaluateUrl('chrome://settings/');
  assert.equal(chromeUrl.isAllowed, false);
  assert.ok(chromeUrl.reason.includes('internal browser pages'));

  const extensionUrl = SafetyService.evaluateUrl('chrome-extension://abcdefg/popup.html');
  assert.equal(extensionUrl.isAllowed, false);

  const webstoreUrl = SafetyService.evaluateUrl('https://chromewebstore.google.com/detail/xyz');
  assert.equal(webstoreUrl.isAllowed, false);
});

test('SafetyService - Sensitive Banking & Checkout URLs evaluation', () => {
  const chaseUrl = SafetyService.evaluateUrl('https://onlinebanking.chase.com/login');
  assert.equal(chaseUrl.isAllowed, true);
  assert.equal(chaseUrl.isSensitive, true);

  const stripeUrl = SafetyService.evaluateUrl('https://checkout.stripe.com/pay/cs_live_123');
  assert.equal(stripeUrl.isAllowed, true);
  assert.equal(stripeUrl.isSensitive, true);

  const regularUrl = SafetyService.evaluateUrl('https://en.wikipedia.org/wiki/Artificial_intelligence');
  assert.equal(regularUrl.isAllowed, true);
  assert.equal(regularUrl.isSensitive, false);
});

test('SafetyService - Sensitive Form Element detection', () => {
  // Password inputs
  assert.equal(SafetyService.isElementSensitive({ type: 'password' }), true);

  // Credit card autocomplete
  assert.equal(SafetyService.isElementSensitive({ autocomplete: 'cc-number' }), true);
  assert.equal(SafetyService.isElementSensitive({ autocomplete: 'cc-csc' }), true);

  // CVV / CVC names
  assert.equal(SafetyService.isElementSensitive({ name: 'card_cvv' }), true);
  assert.equal(SafetyService.isElementSensitive({ id: 'security-pin' }), true);
  assert.equal(SafetyService.isElementSensitive({ label: 'Enter OTP sent to phone' }), true);

  // Regular input fields
  assert.equal(SafetyService.isElementSensitive({ type: 'text', name: 'user_first_name' }), false);
  assert.equal(SafetyService.isElementSensitive({ type: 'email', name: 'customer_email' }), false);
});

test('SafetyService - Action Validation Guard', () => {
  const regularAction = { action: 'TYPE', elementId: 1, value: 'John' };
  const safeElement = { id: 1, type: 'text', name: 'first_name' };
  const check1 = SafetyService.validateProposedAction(regularAction, safeElement, 'https://example.com/form');
  assert.equal(check1.safe, true);

  // Attempting to type into password element
  const sensitiveElement = { id: 2, type: 'password', name: 'passwd' };
  const check2 = SafetyService.validateProposedAction(regularAction, sensitiveElement, 'https://example.com/form');
  assert.equal(check2.safe, false);
  assert.ok(check2.error.includes('protected sensitive field'));

  // Attempting action on sensitive banking URL
  const check3 = SafetyService.validateProposedAction(regularAction, safeElement, 'https://onlinebanking.chase.com/');
  assert.equal(check3.safe, false);
  assert.ok(check3.error.includes('sensitive pages'));
});
