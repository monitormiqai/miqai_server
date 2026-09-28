function createSupabaseClientFromEnv() {
  const url = process.env.SUPABASE_URL;
  // Prefer service role key for server-side operations; fall back to anon key if not present
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const key = serviceRole || anonKey;
  if (!url || !key) return null;

  // Require lazily only when credentials are present to avoid failing tests/environments
  // where @supabase/supabase-js is not installed.
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
}

module.exports = { createSupabaseClientFromEnv };
