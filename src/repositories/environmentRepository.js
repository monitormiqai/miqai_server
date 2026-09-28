function createEnvironmentRepository(supabaseClient) {
  return {
    async findById(environmentId) {
      if (!supabaseClient) throw new Error('db_client_not_configured');
      try {
        const { data, error } = await supabaseClient
          .from('environment')
          .select('*')
          .eq('id', environmentId)
          .limit(1)
          .single();
        if (error) {
          if (error.code === 'PGRST116' || /0 rows/.test(String(error.message || ''))) return null;
          throw error;
        }
        return data;
      } catch (err) {
        if (err && (err.code === 'PGRST116' || /0 rows/.test(String(err.message || '')))) return null;
        throw err;
      }
    },
  };
}

module.exports = { createEnvironmentRepository };
