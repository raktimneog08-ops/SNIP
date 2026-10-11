/**
 * tests/unit/agent-planner.test.js
 * Unit tests for AI Action Planner JSON parser and action validation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentPlanner } from '../../services/agent-planner.js';

test('AgentPlanner - parseActionJson with raw JSON', () => {
  const planner = new AgentPlanner(null);
  const raw = '{"action": "CLICK", "elementId": 4, "rationale": "Clicking the submit button", "isFinalStep": false}';

  const res = planner.parseActionJson(raw);
  assert.equal(res.action, 'CLICK');
  assert.equal(res.elementId, 4);
  assert.equal(res.rationale, 'Clicking the submit button');
  assert.equal(res.isFinalStep, false);
});

test('AgentPlanner - parseActionJson wrapped in markdown fences', () => {
  const planner = new AgentPlanner(null);
  const raw = '```json\n{\n  "action": "TYPE",\n  "elementId": 2,\n  "value": "hello@example.com",\n  "rationale": "Typing email address",\n  "isFinalStep": false\n}\n```';

  const res = planner.parseActionJson(raw);
  assert.equal(res.action, 'TYPE');
  assert.equal(res.elementId, 2);
  assert.equal(res.value, 'hello@example.com');
  assert.equal(res.rationale, 'Typing email address');
});

test('AgentPlanner - parseActionJson with conversational prose outside JSON', () => {
  const planner = new AgentPlanner(null);
  const raw = 'Here is the next step to achieve your goal:\n\n{"action": "SELECT", "elementId": 5, "value": "California", "rationale": "Selecting state from dropdown"}\n\nI hope this helps!';

  const res = planner.parseActionJson(raw);
  assert.equal(res.action, 'SELECT');
  assert.equal(res.elementId, 5);
  assert.equal(res.value, 'California');
});

test('AgentPlanner - parseActionJson rejects invalid actions', () => {
  const planner = new AgentPlanner(null);
  const invalid = '{"action": "DESTROY_PAGE", "elementId": 1}';

  assert.throws(() => {
    planner.parseActionJson(invalid);
  }, /Unknown action type/);
});
