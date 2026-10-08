const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Server loads versioned CORE and receives current Public Response shape', async () => {
  const adapter = require('../src/services/coreAdapter');
  await adapter.ready;

  assert.equal(adapter.available, true);
  assert.equal(typeof adapter.AnalisarQualidadeAmbiental, 'function');
  assert.equal(typeof adapter.adaptPublicResponse, 'function');

  const coreResponse = await adapter.AnalisarQualidadeAmbiental({
    reading: {
      device_id: 'dev-uuid',
      temperature: 29,
      humidity: 70,
      co2: 1400,
      pm1_0: 5,
      pm25: 6,
      pm4_0: 8,
      pm10: 12,
      vocIndex: 90,
      noxIndex: 1,
    },
    environment: 'corporate',
  });

  const publicResponse = adapter.adaptPublicResponse(coreResponse);

  assert.equal(publicResponse.version, '1.0');
  assert.equal(publicResponse.environment.type, 'corporate');
  assert.ok(publicResponse.current);
  assert.ok(Array.isArray(publicResponse.current.readings));
  assert.deepEqual(Object.keys(publicResponse.score).sort(), ['available', 'reason', 'status']);
  assert.equal(publicResponse.score.available, true);
  assert.ok(['GOOD', 'ATTENTION', 'HIGH_ATTENTION'].includes(publicResponse.score.status));
  assert.equal(typeof publicResponse.score.reason, 'string');
  assert.ok(!Object.prototype.hasOwnProperty.call(publicResponse, 'qaiScore'));
});
