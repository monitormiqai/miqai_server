const { test } = require('node:test');
const assert = require('node:assert');
const { mapTelemetryToReading } = require('../src/mappers/readingMapper');

test('maps telemetry to reading shape with measuredAt and firmware', () => {
  const telemetry = {
    deviceId: 123,
    measuredAt: '2024-01-01T12:00:00.000Z',
    firmwareVersion: 'v1.2.3',
    pm25: 12.34,
    vocIndex: 42,
  };

  const reading = mapTelemetryToReading(telemetry, 'uuid-device-1');
  assert.strictEqual(reading.device_id, 'uuid-device-1');
  assert.strictEqual(reading.measured_at, telemetry.measuredAt);
  assert.strictEqual(reading.firmware_version, telemetry.firmwareVersion);
  assert.strictEqual(reading.pm25, telemetry.pm25);
  assert.strictEqual(reading.voc_index, telemetry.vocIndex);
  assert.ok(reading.received_at);
});

test('missing optional sensors become null', () => {
  const telemetry = { deviceId: 1, measuredAt: '2024-01-01T00:00:00Z' };
  const reading = mapTelemetryToReading(telemetry, null);
  assert.strictEqual(reading.temperature, null);
  assert.strictEqual(reading.pm25, null);
  assert.strictEqual(reading.device_id, null);
});
