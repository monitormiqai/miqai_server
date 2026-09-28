const { test } = require('node:test');
const assert = require('node:assert');

const ingestion = require('../src/services/ingestionService');

function makeMockClient({ deviceRecord = null, environmentRecord = null, insertSucceeds = true } = {}) {
  return {
    from(table) {
      return {
        select() { return this; },
        eq(field, value) { return this; },
        limit() { return this; },
        single: async () => {
          if (table === 'device') {
            if (!deviceRecord) return { data: null, error: null };
            return { data: deviceRecord, error: null };
          }
          if (table === 'environment') {
            if (!environmentRecord) return { data: null, error: null };
            return { data: environmentRecord, error: null };
          }
          if (table === 'reading') {
            if (!insertSucceeds) return { data: null, error: new Error('insert fail') };
            return { data: insertSucceeds, error: null };
          }
          return { data: null, error: null };
        },
        insert(arr) { return { select: () => ({ single: async () => ({ data: arr[0], error: null }) }) }; },
      };
    },
  };
}

test('ingestion MVP success resolves device and environment and persists reading', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '22';

  const device = { id: 'dev-uuid', device_id: 22, environment_id: 'env-uuid' };
  const environment = { id: 'env-uuid', tenant_id: 'tenant-uuid', domain: 'corporate' };

  const mockClient = makeMockClient({ deviceRecord: device, environmentRecord: environment });

  const telemetry = { deviceId: 22, measuredAt: '2026-09-22T11:00:00Z', firmwareVersion: 'v' };

  const res = await ingestion.ingest({ apiKey: 'secret', telemetry, client: mockClient });
  assert.ok(res.reading);
  // reading.device_id should be the device.id (UUID)
  assert.strictEqual(res.reading.device_id, device.id);
  // apiKey must not be present in persisted reading
  assert.strictEqual(Object.prototype.hasOwnProperty.call(res.reading, 'apiKey'), false);
  assert.deepStrictEqual(res.device, device);
  assert.deepStrictEqual(res.environment, environment);
});

test('ingestion MVP device not found throws device_not_found', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '99';

  const mockClient = makeMockClient({ deviceRecord: null, environmentRecord: null });
  let threw = false;
  try {
    await ingestion.ingest({ apiKey: 'secret', telemetry: { deviceId: 99 }, client: mockClient });
  } catch (err) {
    threw = true;
    assert.strictEqual(err.message, 'device_not_found');
  }
  assert.strictEqual(threw, true);
});

test('ingestion MVP device without environment_id throws context_unresolved', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '33';

  const device = { id: 'dev-uuid', device_id: 33, environment_id: null };
  const mockClient = makeMockClient({ deviceRecord: device, environmentRecord: null });
  let threw = false;
  try {
    await ingestion.ingest({ apiKey: 'secret', telemetry: { deviceId: 33 }, client: mockClient });
  } catch (err) {
    threw = true;
    assert.strictEqual(err.message, 'context_unresolved');
    assert.strictEqual(err.reason, 'no_environment');
  }
  assert.strictEqual(threw, true);
});

test('ingestion MVP environment not found throws context_unresolved with environment_not_found', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'secret';
  process.env.MIQAI_MVP_DEVICE_ID = '44';

  const device = { id: 'dev-uuid', device_id: 44, environment_id: 'env-uuid' };
  const mockClient = makeMockClient({ deviceRecord: device, environmentRecord: null });
  let threw = false;
  try {
    await ingestion.ingest({ apiKey: 'secret', telemetry: { deviceId: 44 }, client: mockClient });
  } catch (err) {
    threw = true;
    assert.strictEqual(err.message, 'context_unresolved');
    assert.strictEqual(err.reason, 'environment_not_found');
  }
  assert.strictEqual(threw, true);
});
