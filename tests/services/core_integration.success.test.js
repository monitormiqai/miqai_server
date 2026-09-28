const { test } = require('node:test');
const assert = require('node:assert');

test('ingest calls CORE and persists core_result on success (unit)', async () => {
  process.env.MIQAI_AUTH_MODE = 'mvp';
  process.env.MIQAI_MVP_API_KEY = 'MIQAI-LAB-DEVICE-11-2026';
  process.env.MIQAI_MVP_DEVICE_ID = '11';
  // Arrange: fake supabase-like client that records inserts per table and returns rows for queries
  const fakeClient = {
    _table: null,
    _inserts: {},
    from(table) { this._table = table; return this; },
    select() { return this; },
    eq() { return this; },
    limit() { return this; },
    // insert receives array payload for supabase client
    insert(payload) {
      this._inserts[this._table] = this._inserts[this._table] || [];
      // store a deep clone to avoid references
      this._inserts[this._table].push(JSON.parse(JSON.stringify(payload)));
      // keep last inserted payload for single() to return
      this._lastInsert = { table: this._table, payload: payload };
      return this;
    },
    async single() {
      // Query simulation for selects (device, environment)
      if (this._table === 'device') {
        return { data: { id: 'dev-uuid', device_id: 11, environment_id: 'env-uuid' }, error: null };
      }
      if (this._table === 'environment') {
        return { data: { id: 'env-uuid', tenant_id: 'tenant-uuid', domain: 'corporate' }, error: null };
      }
      // If single() follows an insert chain, return the inserted row
      if (this._lastInsert && this._lastInsert.table === this._table) {
        const arr = this._lastInsert.payload;
        const item = Array.isArray(arr) ? arr[0] : arr;
        return { data: item, error: null };
      }
      return { data: null, error: null };
    },
  };

  // Fake adapter: produce a fake CORE Response and an explicit Public Response
  const fakeCoreResponse = { internal: true, meta: { from: 'core' } };
  const expectedPublicResponse = {
    version: '1.0',
    timestamp: '2026-09-22T00:00:00Z',
    status: 'ok',
    environment: 'corporate',
  };

  const fakeCoreAdapter = {
    available: true,
    calledAnalyze: false,
    calledAdapt: false,
    async AnalisarQualidadeAmbiental({ reading, environment }) {
      this.calledAnalyze = true;
      // return the fake internal CORE response (opaque)
      return fakeCoreResponse;
    },
    adaptPublicResponse(coreResp) {
      this.calledAdapt = true;
      // adaptPublicResponse must produce the Public Response (not the raw coreResp)
      return expectedPublicResponse;
    },
  };

  const ingestion = require('../../src/services/ingestionService');

  // Act
  const result = await ingestion.ingest({
    apiKey: 'MIQAI-LAB-DEVICE-11-2026',
    telemetry: { deviceId: 11, firmwareVersion: 'x', measuredAt: new Date().toISOString() },
    client: fakeClient,
    coreAdapter: fakeCoreAdapter,
  });

  // Assert: reading was returned/persisted
  assert.ok(result.reading, 'reading result present');
  // Assert: CORE was invoked and adaptPublicResponse was called
  assert.strictEqual(fakeCoreAdapter.calledAnalyze, true, 'CORE analyze called');
  assert.strictEqual(fakeCoreAdapter.calledAdapt, true, 'adaptPublicResponse called');

  // Assert: reading insert occurred exactly once
  const readingInserts = fakeClient._inserts['reading'] || [];
  assert.strictEqual(readingInserts.length, 1, 'reading inserted once');

  // Assert: core_result insert occurred exactly once and payload matches expectations
  const coreInserts = fakeClient._inserts['core_result'] || [];
  assert.strictEqual(coreInserts.length, 1, 'core_result inserted exactly once');

  const persisted = coreInserts[0][0] || coreInserts[0];
  // Validate metadata fields
  assert.strictEqual(persisted.reading_id, result.reading.id, 'reading_id matches inserted reading');
  assert.strictEqual(persisted.tenant_id, 'tenant-uuid', 'tenant_id persisted');
  assert.strictEqual(persisted.environment_id, 'env-uuid', 'environment_id persisted');
  assert.strictEqual(persisted.device_id, 'dev-uuid', 'device_id persisted');
  assert.strictEqual(persisted.domain, 'corporate', 'domain persisted');

  // Validate public_response stored is exactly expectedPublicResponse (not fakeCoreResponse)
  assert.deepStrictEqual(persisted.public_response, expectedPublicResponse, 'public_response is adapted Public Response, not raw CORE Response');
});
