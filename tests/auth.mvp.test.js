const { test } = require('node:test');
const assert = require('node:assert');

const auth = require('../src/auth/authBoundary');

test('MVP auth missing key returns missing_api_key', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '11';
  const res = await auth.authenticate(null);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'missing_api_key');
});

test('MVP auth invalid key returns invalid_api_key', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '11';
  const res = await auth.authenticate('bad');
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, 'invalid_api_key');
});

test('MVP auth valid key returns ok with deviceId', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '11';
  const res = await auth.authenticate('secret');
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.mode, 'mvp');
  assert.strictEqual(res.deviceId, 11);
});
