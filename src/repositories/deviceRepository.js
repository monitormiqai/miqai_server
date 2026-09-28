function createDeviceRepository(supabaseClient) {
  return {
    async findByDeviceId(deviceId) {
      if (!supabaseClient) throw new Error('db_client_not_configured');
      try {
        const { data, error } = await supabaseClient
          .from('device')
          .select('*')
          .eq('device_id', deviceId)
          .limit(1)
          .single();
        if (error) {
          // Supabase returns PGRST116 when 0 rows; treat as not found and return null
          if (error.code === 'PGRST116' || /0 rows/.test(String(error.message || ''))) return null;
          throw error;
        }
        return data;
      } catch (err) {
        // Some clients may throw; convert PGRST116 to null, otherwise rethrow
        if (err && (err.code === 'PGRST116' || /0 rows/.test(String(err.message || '')))) return null;
        throw err;
      }
    },
  };
}

module.exports = { createDeviceRepository };
