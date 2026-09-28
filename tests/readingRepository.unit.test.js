const { test } = require('node:test');
const assert = require('node:assert');
const { createReadingRepository } = require('../src/repositories/readingRepository');
const { mapTelemetryToReading } = require('../src/mappers/readingMapper');

test('readingRepository.insert calls supabase reading table with correct columns', async () => {
  let captured = null;
  const mockClient = {
    from: (table) => ({
      insert: (arr) => ({
        select: () => ({
          single: async () => {
            captured = { table, payload: arr[0] };
            return { data: arr[0], error: null };
          },
        }),
      }),
    }),
  };

  const repo = createReadingRepository(mockClient);
  const reading = {
    device_id: '11111111-1111-1111-1111-111111111111',
    measured_at: '2026-09-22T10:00:00Z',
    received_at: '2026-09-22T10:00:01Z',
    firmware_version: 'test',
    pm25: 1.23,
  };

  const inserted = await repo.insert(reading);
  assert.deepStrictEqual(inserted, reading);
  assert.strictEqual(captured.table, 'reading');
  // Ensure prohibited fields are not present in reading payload
  assert.strictEqual(Object.prototype.hasOwnProperty.call(captured.payload, 'apiKey'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(captured.payload, 'battery'), false);
  assert.strictEqual(captured.payload.device_id, reading.device_id);
  assert.strictEqual(captured.payload.measured_at, reading.measured_at);
});

test('readingRepository propagates DB errors', async () => {
  const mockClient = {
    from: (table) => ({
      insert: (arr) => ({
        select: () => ({
          single: async () => ({ data: null, error: new Error('db fail') }),
        }),
      }),
    }),
  };

  const repo = createReadingRepository(mockClient);
  let threw = false;
  try {
    await repo.insert({ device_id: 'x', measured_at: 't', received_at: 't', firmware_version: 'v' });
  } catch (err) {
    threw = true;
    assert.strictEqual(err.message, 'db fail');
  }
  assert.strictEqual(threw, true);
});

test('createReadingRepository throws when no client configured', async () => {
  const repo = createReadingRepository(null);
  let threw = false;
  try {
    await repo.insert({});
  } catch (err) {
    threw = true;
    assert.strictEqual(err.message, 'db_client_not_configured');
  }
  assert.strictEqual(threw, true);
});

test('mapper + repository integration uses mapped object', async () => {
  let captured = null;
  const mockClient = {
    from: (table) => ({
      insert: (arr) => ({
        select: () => ({
          single: async () => {
            captured = { table, payload: arr[0] };
            return { data: arr[0], error: null };
          },
        }),
      }),
    }),
  };

  const repo = createReadingRepository(mockClient);
  const telemetry = { deviceId: 22, measuredAt: '2026-09-22T11:00:00Z', firmwareVersion: 'v' };
  const mapped = mapTelemetryToReading(telemetry, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  const inserted = await repo.insert(mapped);
  assert.strictEqual(captured.table, 'reading');
  // ensure no apiKey in payload
  assert.strictEqual(Object.prototype.hasOwnProperty.call(captured.payload, 'apiKey'), false);
  assert.strictEqual(inserted.device_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
});
