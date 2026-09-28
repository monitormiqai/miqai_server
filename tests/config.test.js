const { test } = require('node:test');
const assert = require('node:assert');

test('config loads defaults', () => {
  const config = require('../src/config');
  assert.strictEqual(typeof config.port, 'number');
  assert.ok(config.port > 0);
});
