const { test, skip } = require('node:test');
const assert = require('node:assert');

test('CORE public API is loadable if dependency installed', async () => {
  const adapter = require('../src/services/coreAdapter');
  await adapter.ready;
  if (!adapter.available) {
    // Skip assertion when dependency is not installed in the environment.
    console.warn('Skipping CORE availability assertion: dependency not installed');
    return;
  }

  assert.strictEqual(typeof adapter.AnalisarQualidadeAmbiental, 'function');
  assert.strictEqual(typeof adapter.adaptPublicResponse, 'function');
});
