const { test } = require('node:test');
const assert = require('node:assert');
const { mapReadingToCoreInput } = require('../../src/mappers/coreInputMapper');

test('coreInput mapper preserves allowed fields and excludes operational fields', () => {
  const reading = {
    device_id: 'uuid-1',
    created_at: '2026-09-22T00:00:00Z',

    temperature: 23,
    humidity: 50,

    co2: 700,

    voc_index: 90,
    nox_index: 1,

    pm1_0: 1.1,
    pm25: 6,
    pm4_0: 4.2,
    pm10: 12,

    nc0_5: 12.4,
    nc1_0: 18.1,
    nc2_5: 21.7,
    nc4_0: 23.5,
    nc10_0: 24.2,

    typical_size: 0.58,
    signal_strength: -60,

    // operational fields that MUST NOT be forwarded
    tenant_id: 't1',
    environment_id: 'e1',
    environmentId: 'e1',
    domain: 'corporate',
    apiKey: 'secret',
    key_hash: 'hash',
    firmware_version: '1.0.0',
    measured_at: '2026-09-22T00:00:00Z',
    received_at: '2026-09-22T00:00:01Z',
  };

  const coreIn = mapReadingToCoreInput(reading);

  // allowed fields (name mapping verified)
  assert.strictEqual(coreIn.device_id, 'uuid-1');
  assert.strictEqual(coreIn.created_at, '2026-09-22T00:00:00Z');
  assert.strictEqual(coreIn.temperature, 23);
  assert.strictEqual(coreIn.humidity, 50);
  assert.strictEqual(coreIn.co2, 700);
  assert.strictEqual(coreIn.vocIndex, 90);
  assert.strictEqual(coreIn.noxIndex, 1);
  assert.strictEqual(coreIn.pm1_0, 1.1);
  assert.strictEqual(coreIn.pm25, 6);
  assert.strictEqual(coreIn.pm4_0, 4.2);
  assert.strictEqual(coreIn.pm10, 12);
  assert.strictEqual(coreIn.nc0_5, 12.4);
  assert.strictEqual(coreIn.nc1_0, 18.1);
  assert.strictEqual(coreIn.nc2_5, 21.7);
  assert.strictEqual(coreIn.nc4_0, 23.5);
  assert.strictEqual(coreIn.nc10_0, 24.2);
  assert.strictEqual(coreIn.typicalSize, 0.58);
  assert.strictEqual(coreIn.signalStrength, -60);

  // forbidden fields must not be present in the core input
  const forbidden = [
    'tenant_id',
    'environment_id',
    'environmentId',
    'domain',
    'apiKey',
    'key_hash',
    'firmware_version',
    'measured_at',
    'received_at',
  ];
  forbidden.forEach((k) => assert.strictEqual(coreIn[k], undefined, `field ${k} must not be sent to CORE`));
});
