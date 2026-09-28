// Factory for device credential repository. Accepts a Supabase client or null.
function createDeviceCredentialRepository(supabaseClient) {
  return {
    // Attempting to compare apiKey directly with key_hash is blocked by methodology.
    async findByApiKey(/* apiKey */) {
      // Explicitly block any attempt to authenticate until key_hash algorithm is specified.
      const err = new Error('auth_blocked_methodology');
      err.reason = 'auth_blocked';
      err.message = 'Authentication blocked: device_credential.key_hash algorithm/format not specified in contract';
      throw err;
    },
  };
}

module.exports = { createDeviceCredentialRepository };
