const { test } = require('node:test');
const assert = require('node:assert');
const { createSupabaseClientFromEnv } = require('../../src/db/supabaseClient');
const { createReadingRepository } = require('../../src/repositories/readingRepository');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_DEVICE_ID = process.env.MIQAI_TEST_DEVICE_ID; // uuid of existing device in DB

// Integration tests may use either the service role key (preferred) or anon key
if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) || !TEST_DEVICE_ID) {
  test('integration: reading insert (skipped) - SUPABASE or MIQAI_TEST_DEVICE_ID not configured', () => {}, { skip: true });
} else {
  test('integration: reading insert persists to Supabase reading table', async () => {
    const client = createSupabaseClientFromEnv();
    const repo = createReadingRepository(client);

    const reading = {
      device_id: TEST_DEVICE_ID,
      measured_at: new Date().toISOString(),
      received_at: new Date().toISOString(),
      firmware_version: 'integration-test',
    };

    const inserted = await repo.insert(reading);
    assert.ok(inserted);
    assert.strictEqual(inserted.device_id, TEST_DEVICE_ID);
    assert.ok(inserted.id || inserted.id === 0);
  });
}
