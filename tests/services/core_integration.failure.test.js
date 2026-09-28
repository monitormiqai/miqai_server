const { test } = require('node:test');
const assert = require('node:assert');

test('ingest preserves reading when CORE errors and does not insert core_result', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'MIQAI-LAB-DEVICE-11-2026';
  process.env.MIQAI_MVP_DEVICE_ID = '11';
  const fakeClient = {
    _table: null,
    _inserts: {},
    from(table) { this._table = table; return this; },
    select() { return this; },
    eq() { return this; },
    limit() { return this; },
    insert(payload) {
      this._inserts[this._table] = this._inserts[this._table] || [];
      this._inserts[this._table].push(JSON.parse(JSON.stringify(payload)));
      this._lastInsert = { table: this._table, payload: payload };
      return this;
    },
    async single() {
      if (this._table === 'device') {
        return { data: { id: 'dev-uuid', device_id: 11, environment_id: 'env-uuid' }, error: null };
      }
      if (this._table === 'environment') {
        return { data: { id: 'env-uuid', tenant_id: 'tenant-uuid', domain: 'corporate' }, error: null };
      }
      if (this._lastInsert && this._lastInsert.table === this._table) {
        const arr = this._lastInsert.payload;
        const item = Array.isArray(arr) ? arr[0] : arr;
        return { data: item, error: null };
      }
      return { data: null, error: null };
    },
  };

  const failingCoreAdapter = {
    available: true,
    async AnalisarQualidadeAmbiental() {
      throw new Error('CORE internal error: timeout');
    },
    adaptPublicResponse() { throw new Error('should not be called'); },
  };

  const ingestion = require('../../src/services/ingestionService');

  const result = await ingestion.ingest({
    apiKey: 'MIQAI-LAB-DEVICE-11-2026',
    telemetry: { deviceId: 11 },
    client: fakeClient,
    coreAdapter: failingCoreAdapter,
  });

  // reading must still be present
  assert.ok(result.reading, 'reading still returned');
  // core_result must not be inserted
  const coreInserts = fakeClient._inserts['core_result'] || [];
  assert.strictEqual(coreInserts.length, 0, 'no core_result persisted when CORE errors');
});
