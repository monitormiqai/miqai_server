const { createSupabaseClientFromEnv } = require('../db/supabaseClient');
const { createDeviceCredentialRepository } = require('../repositories/deviceCredentialRepository');
const { createDeviceRepository } = require('../repositories/deviceRepository');
const { createEnvironmentRepository } = require('../repositories/environmentRepository');
const { createReadingRepository } = require('../repositories/readingRepository');
const { mapTelemetryToReading } = require('../mappers/readingMapper');
const authBoundary = require('../auth/authBoundary');
const coreAdapterDefault = require('./coreAdapter');
const { createCoreResultRepository } = require('../repositories/coreResultRepository');
const { mapReadingToCoreInput } = require('../mappers/coreInputMapper');

// Factory to build repositories with optional Supabase client
function buildRepositories(client) {
  const devCredRepo = createDeviceCredentialRepository(client);
  const deviceRepo = createDeviceRepository(client);
  const envRepo = createEnvironmentRepository(client);
  const readingRepo = createReadingRepository(client);
  return { devCredRepo, deviceRepo, envRepo, readingRepo };
}

// ingest accepts an optional `client` for testing; if not provided it will be created from env
async function ingest({ apiKey, telemetry, client: injectedClient, coreAdapter: injectedCoreAdapter } = {}) {
  // Authentication boundary
  const auth = await authBoundary.authenticate(apiKey);
  if (!auth.ok) {
    const err = new Error('authentication_blocked');
    err.reason = auth.reason || 'auth_failed';
    err.detail = auth.message || null;
    throw err;
  }

  // Create DB client from env or use injected client for tests
  const client = injectedClient || createSupabaseClientFromEnv();
  if (!client) {
    const err = new Error('db_not_configured');
    throw err;
  }

  const { devCredRepo, deviceRepo, envRepo, readingRepo } = buildRepositories(client);
  const coreResultRepo = createCoreResultRepository(client);
  const coreAdapter = injectedCoreAdapter || coreAdapterDefault;

  // MVP auth path: do not attempt to compare apiKey with key_hash; resolve device by configured id
  if (auth.mode === 'mvp') {
    const logicalDeviceId = auth.deviceId;
    const device = await deviceRepo.findByDeviceId(logicalDeviceId);
    if (!device) {
      const err = new Error('device_not_found');
      err.reason = 'not_found';
      throw err;
    }

    // Ensure telemetry.deviceId (if present) matches resolved device.device_id — do not accept mismatch
    if (Object.prototype.hasOwnProperty.call(telemetry, 'deviceId')) {
      if (telemetry.deviceId !== device.device_id) {
        const err = new Error('credential_device_mismatch');
        err.reason = 'unauthorized';
        throw err;
      }
    }

    if (!device.environment_id) {
      const err = new Error('context_unresolved');
      err.reason = 'no_environment';
      throw err;
    }

    const environment = await envRepo.findById(device.environment_id);
    if (!environment) {
      const err = new Error('context_unresolved');
      err.reason = 'environment_not_found';
      throw err;
    }

    // Map telemetry to reading using resolved device.uuid
    const reading = mapTelemetryToReading(telemetry, device.id);
    // Persist reading (must always happen before CORE)
    const inserted = await readingRepo.insert(reading);

    // Prepare CORE input from persisted reading
    const coreReading = mapReadingToCoreInput(inserted);
    const coreEnvironment = environment.domain;

    // Call CORE public API if adapter available. Must not rollback reading on failure.
    try {
      if (coreAdapter && coreAdapter.available && typeof coreAdapter.AnalisarQualidadeAmbiental === 'function') {
        // Call CORE -> returns CORE Response (internal)
        const coreResponse = await coreAdapter.AnalisarQualidadeAmbiental({ reading: coreReading, environment: coreEnvironment });

        // Adapt to Public Response using adapter
        if (coreAdapter && typeof coreAdapter.adaptPublicResponse === 'function') {
          const publicResponse = coreAdapter.adaptPublicResponse(coreResponse);

          // Persist core_result per DB contract
          const coreResultRecord = {
            reading_id: inserted.id,
            tenant_id: environment.tenant_id,
            environment_id: environment.id,
            device_id: device.id,
            domain: coreEnvironment,
            public_response: publicResponse,
          };
          await coreResultRepo.insert(coreResultRecord);
        } else {
          console.warn('CORE adapter missing adaptPublicResponse; skipping core_result persistence');
        }
      } else {
        console.info('CORE adapter not available; skipping core_result persistence');
      }
    } catch (coreErr) {
      // Per spec: reading preserved, core_result not created, log and continue
      console.error('CORE invocation failed; reading persisted. Error:', coreErr && (coreErr.stack || coreErr.message || coreErr));
    }

    return { reading: inserted, device, environment };
  }

  // Non-MVP path: use device credential flow (blocked by methodology if not implemented)
  // Resolve credential -> device (implementation depends on key_hash algorithm; placeholder)
  const credential = await devCredRepo.findByApiKey(apiKey);
  if (!credential) {
    const err = new Error('credential_not_found');
    err.reason = 'unauthorized';
    throw err;
  }

  // Resolve device by id in telemetry (deviceId) mapping to device registry
  const device = await deviceRepo.findByDeviceId(telemetry.deviceId);
  if (!device) {
    const err = new Error('device_not_found');
    err.reason = 'not_found';
    throw err;
  }

  // Resolve environment if device.environment_id exists
  let environment = null;
  if (device.environment_id) {
    environment = await envRepo.findById(device.environment_id);
  }

  // Map telemetry to reading
  const reading = mapTelemetryToReading(telemetry, device.id);

  // Persist reading
  const inserted = await readingRepo.insert(reading);
  return { reading: inserted, device, environment };
}

module.exports = { ingest };
