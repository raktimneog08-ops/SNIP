/**
 * tests/unit/youtube-parser.test.js
 * Unit tests for YouTube timestamp parsing and video identification.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

test('YouTube Parser - Timestamp to seconds calculation', () => {
  assert.equal(parseTimeToSeconds('00:00'), 0);
  assert.equal(parseTimeToSeconds('00:45'), 45);
  assert.equal(parseTimeToSeconds('02:15'), 135);
  assert.equal(parseTimeToSeconds('10:00'), 600);
  assert.equal(parseTimeToSeconds('01:05:20'), 3920);
  assert.equal(parseTimeToSeconds('02:00:00'), 7200);
});

test('YouTube Parser - Video ID Extraction regex', () => {
  function extractId(url) {
    const match = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  assert.equal(extractId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractId('https://www.youtube.com/watch?v=abc12345678&t=10s'), 'abc12345678');
  assert.equal(extractId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractId('https://example.com/not-youtube'), null);
});
