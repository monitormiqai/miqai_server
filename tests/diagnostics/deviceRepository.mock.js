// Simple local mock to demonstrate the repository call shape.
// Run manually: `node tests/diagnostics/deviceRepository.mock.js`

const { createDeviceRepository } = require('../../src/repositories/deviceRepository');

(async () => {
  const called = {};

  const fakeClient = {
    from(table) {
      called.table = table;
      return {
        select(sel) {
          called.select = sel;
          return {
            eq(col, val) {
              called.eq = [col, val];
              return {
                limit(n) {
                  called.limit = n;
                  return {
                    async single() {
                      // emulate Supabase successful response for one row
                      return { data: { id: 1, device_id: 11, environment_id: 1 }, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const repo = createDeviceRepository(fakeClient);
  const result = await repo.findByDeviceId(11);
  console.log(JSON.stringify({ called, result }));
})();
