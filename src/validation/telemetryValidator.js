function isInteger(value) {
  return Number.isInteger(value);
}

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isValidIsoDate(value) {
  if (!isString(value)) return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

function validateTelemetry(body) {
  const errors = [];

  if (!Object.prototype.hasOwnProperty.call(body, 'deviceId')) {
    errors.push({ field: 'deviceId', message: 'required' });
  } else if (!isInteger(body.deviceId)) {
    errors.push({ field: 'deviceId', message: 'must_be_integer' });
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'firmwareVersion')) {
    errors.push({ field: 'firmwareVersion', message: 'required' });
  } else if (!isString(body.firmwareVersion)) {
    errors.push({ field: 'firmwareVersion', message: 'must_be_string' });
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'measuredAt')) {
    errors.push({ field: 'measuredAt', message: 'required' });
  } else if (!isValidIsoDate(body.measuredAt)) {
    errors.push({ field: 'measuredAt', message: 'must_be_iso8601' });
  }

  // Additional sensor fields may be present and are nullable; do not validate them strictly here.

  return { valid: errors.length === 0, errors };
}

module.exports = { validateTelemetry };
