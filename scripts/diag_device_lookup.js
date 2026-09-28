#!/usr/bin/env node
// Safe Supabase diagnostic using the same client as the server.
// Prints only counts and selected device fields; never prints secrets.

// Load .env before creating the Supabase client so local credentials are available
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { createSupabaseClientFromEnv } = require('../src/db/supabaseClient');

const deviceId = process.env.DIAG_DEVICE_ID || process.env.MIQAI_MVP_DEVICE_ID;

(async () => {
  if (!deviceId) {
    console.error('DIAG: missing device id. Set DIAG_DEVICE_ID or MIQAI_MVP_DEVICE_ID');
    process.exit(2);
  }

  const client = createSupabaseClientFromEnv();
  if (!client) {
    console.error('DIAG: Supabase client not configured. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set');
    process.exit(2);
  }

  try {
    // Use the same table/column that the server uses: from('device').eq('device_id', <value>)
    const { data, error } = await client
      .from('device')
      .select('id,device_id,environment_id')
      .eq('device_id', deviceId)
      .limit(10);

    if (error) {
      console.log(JSON.stringify({ rows: 0, supabase_error: { code: error.code || null, message: error.message || null } }));
      process.exit(0);
    }

    const rows = Array.isArray(data) ? data.map((r) => ({ id: r.id, device_id: r.device_id, environment_id: r.environment_id })) : [];
    console.log(JSON.stringify({ rows: rows.length, devices: rows }));
  } catch (err) {
    console.log(JSON.stringify({ rows: 0, exception: String(err) }));
  }
})();
