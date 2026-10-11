/**
 * tests/unit/profile-autofill.test.js
 * Unit tests for user profile form matching heuristics and autofill planner.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ProfileService } from '../../services/profile.js';

test('ProfileService - Heuristic Element Matching', () => {
  const profile = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-0199',
    addressLine1: '456 Innovation Way',
    city: 'Seattle',
    zipCode: '98101'
  };

  // Match full name
  const nameEl = { tag: 'INPUT', type: 'text', name: 'user_full_name', placeholder: 'Enter name' };
  const match1 = ProfileService.matchElementToProfile(nameEl, profile);
  assert.equal(match1.key, 'fullName');
  assert.equal(match1.value, 'Jane Doe');

  // Match email via input type
  const emailEl = { tag: 'INPUT', type: 'email', name: 'contact' };
  const match2 = ProfileService.matchElementToProfile(emailEl, profile);
  assert.equal(match2.key, 'email');
  assert.equal(match2.value, 'jane@example.com');

  // Match phone
  const phoneEl = { tag: 'INPUT', type: 'tel', name: 'mobile_num' };
  const match3 = ProfileService.matchElementToProfile(phoneEl, profile);
  assert.equal(match3.key, 'phone');
  assert.equal(match3.value, '+1 555-0199');

  // Match zip code
  const zipEl = { tag: 'INPUT', type: 'text', name: 'postal_code', label: 'Zip Code' };
  const match4 = ProfileService.matchElementToProfile(zipEl, profile);
  assert.equal(match4.key, 'zipCode');
  assert.equal(match4.value, '98101');

  // Reject password input
  const pwdEl = { tag: 'INPUT', type: 'password', name: 'password' };
  const match5 = ProfileService.matchElementToProfile(pwdEl, profile);
  assert.equal(match5, null);
});

test('ProfileService - Batch Autofill Proposal Generation', () => {
  const profile = {
    fullName: 'Robert Paulson',
    email: 'bob@fightclub.org',
    city: 'Wilmington'
  };

  const elements = [
    { id: 1, tag: 'INPUT', type: 'text', name: 'customer_name', label: 'Full Name' },
    { id: 2, tag: 'INPUT', type: 'email', name: 'email_address', label: 'Email' },
    { id: 3, tag: 'INPUT', type: 'text', name: 'city_name', label: 'City' },
    { id: 4, tag: 'BUTTON', type: 'submit', label: 'Submit Form' }
  ];

  const plan = ProfileService.proposeAutofillPlan(elements, profile);
  assert.equal(plan.length, 3);
  assert.equal(plan[0].elementId, 1);
  assert.equal(plan[0].value, 'Robert Paulson');
  assert.equal(plan[1].elementId, 2);
  assert.equal(plan[1].value, 'bob@fightclub.org');
  assert.equal(plan[2].elementId, 3);
  assert.equal(plan[2].value, 'Wilmington');
});
