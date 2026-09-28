const { test } = require('node:test');
const assert = require('node:assert');
const { createDeviceCredentialRepository } = require('../src/repositories/deviceCredentialRepository');

test('deviceCredentialRepository blocks direct apiKey comparison', async () => {
  const repo = createDeviceCredentialRepository(null);
  let threw = false;
  try {
    await repo.findByApiKey('some-api-key');
  } catch (err) {
    threw = true;
    // Expect explicit methodological block
    assert.strictEqual(err.reason, 'auth_blocked');
    assert.ok(/key_hash/.test(err.message));
  }
  assert.strictEqual(threw, true);
});
