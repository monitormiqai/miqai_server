const { randomUUID } = require('crypto');

function createCoreResultRepository(supabaseClient) {
  return {
    async insert(coreResult) {
      if (!supabaseClient) {
        throw new Error('db_client_not_configured');
      }

      // Ensure id exists: generate a UUID in the application layer when missing.
      // This keeps DB schema/contracts unchanged while preventing NOT NULL violations.
      const toInsert = Object.assign({}, coreResult);
      if (!toInsert.id) {
        toInsert.id = randomUUID();
      }

      const { data, error } = await supabaseClient
        .from('core_result')
        .insert([toInsert])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
  };
}

module.exports = {
  createCoreResultRepository,
};