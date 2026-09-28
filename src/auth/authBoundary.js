// Authentication boundary
// Supports an MVP mode controlled by environment variables for lab/testing only.
// In all other modes, authentication remains blocked due to unspecified key_hash algorithm.

async function authenticate(apiKey) {
  const mode = process.env.MIQAI_AUTH_MODE;

  if (mode === 'mvp') {
    // MVP mode: validate API key against environment variable and return device identity
    if (!apiKey) return { ok: false, reason: 'missing_api_key' };
    const expected = process.env.MIQAI_MVP_API_KEY;
    const mvpDeviceId = process.env.MIQAI_MVP_DEVICE_ID;
    if (!expected || !mvpDeviceId) {
      return { ok: false, reason: 'mvp_not_configured', message: 'MVP auth not configured' };
    }
    if (apiKey !== expected) return { ok: false, reason: 'invalid_api_key' };

    // Successful MVP authentication — return the logical deviceId (as integer if possible)
    const deviceIdInt = Number.isNaN(Number(mvpDeviceId)) ? mvpDeviceId : Number(mvpDeviceId);
    return { ok: true, mode: 'mvp', deviceId: deviceIdInt };
  }

  // Default: blocked until key_hash algorithm/format is specified by architecture decision
  if (!apiKey) return { ok: false, reason: 'missing_api_key' };
  return {
    ok: false,
    reason: 'auth_blocked',
    message: 'Authentication blocked: device_credential.key_hash algorithm/format not specified in contract',
  };
}

module.exports = { authenticate };
