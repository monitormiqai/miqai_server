const { test } = require('node:test');
const assert = require('node:assert');
const auth = require('../src/auth/authBoundary');

test('authenticate returns missing when no apiKey', async () => {
  const res = await auth.authenticate(null);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'missing_api_key');
});

test('authenticate is blocked due to unspecified algorithm', async () => {
  const res = await auth.authenticate('some-key');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'auth_blocked');
  assert.ok(/key_hash/.test(res.message));
});
