function mapTelemetryToReading(telemetry, resolvedDeviceUuid) {
  const now = new Date().toISOString();

  const reading = {
    // device_id is UUID resolved from device registry
    device_id: resolvedDeviceUuid || null,
    measured_at: telemetry.measuredAt || null,
    received_at: now,
    firmware_version: telemetry.firmwareVersion || null,
    temperature: Object.prototype.hasOwnProperty.call(telemetry, 'temperature') ? telemetry.temperature : null,
    humidity: Object.prototype.hasOwnProperty.call(telemetry, 'humidity') ? telemetry.humidity : null,
    signal_strength: Object.prototype.hasOwnProperty.call(telemetry, 'signalStrength') ? telemetry.signalStrength : null,
    co2: Object.prototype.hasOwnProperty.call(telemetry, 'co2') ? telemetry.co2 : null,
    co: Object.prototype.hasOwnProperty.call(telemetry, 'co') ? telemetry.co : null,
    pm1_0: Object.prototype.hasOwnProperty.call(telemetry, 'pm1_0') ? telemetry.pm1_0 : null,
    pm25: Object.prototype.hasOwnProperty.call(telemetry, 'pm25') ? telemetry.pm25 : null,
    pm4_0: Object.prototype.hasOwnProperty.call(telemetry, 'pm4_0') ? telemetry.pm4_0 : null,
    pm10: Object.prototype.hasOwnProperty.call(telemetry, 'pm10') ? telemetry.pm10 : null,
    nc0_5: Object.prototype.hasOwnProperty.call(telemetry, 'nc0_5') ? telemetry.nc0_5 : null,
    nc1_0: Object.prototype.hasOwnProperty.call(telemetry, 'nc1_0') ? telemetry.nc1_0 : null,
    nc2_5: Object.prototype.hasOwnProperty.call(telemetry, 'nc2_5') ? telemetry.nc2_5 : null,
    nc4_0: Object.prototype.hasOwnProperty.call(telemetry, 'nc4_0') ? telemetry.nc4_0 : null,
    nc10_0: Object.prototype.hasOwnProperty.call(telemetry, 'nc10_0') ? telemetry.nc10_0 : null,
    voc_index: Object.prototype.hasOwnProperty.call(telemetry, 'vocIndex') ? telemetry.vocIndex : null,
    nox_index: Object.prototype.hasOwnProperty.call(telemetry, 'noxIndex') ? telemetry.noxIndex : null,
    typical_size: Object.prototype.hasOwnProperty.call(telemetry, 'typicalSize') ? telemetry.typicalSize : null,
  };

  return reading;
}

module.exports = { mapTelemetryToReading };
