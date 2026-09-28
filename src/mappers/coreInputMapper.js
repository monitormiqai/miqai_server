function mapReadingToCoreInput(reading) {
  return {
    device_id: reading.device_id || null,
    created_at: reading.created_at || null,

    temperature: reading.temperature,
    humidity: reading.humidity,

    co2: reading.co2,

    vocIndex: reading.voc_index,
    noxIndex: reading.nox_index,

    pm1_0: reading.pm1_0,
    pm25: reading.pm25,
    pm4_0: reading.pm4_0,
    pm10: reading.pm10,

    nc0_5: reading.nc0_5,
    nc1_0: reading.nc1_0,
    nc2_5: reading.nc2_5,
    nc4_0: reading.nc4_0,
    nc10_0: reading.nc10_0,

    typicalSize: reading.typical_size,

    signalStrength: reading.signal_strength,
  };
}

module.exports = {
  mapReadingToCoreInput,
};