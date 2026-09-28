function createReadingRepository(supabaseClient) {
  return {
    async insert(reading) {
      if (!supabaseClient) throw new Error('db_client_not_configured');
      const { data, error } = await supabaseClient
        .from('reading')
        .insert([reading])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  };
}

module.exports = { createReadingRepository };
