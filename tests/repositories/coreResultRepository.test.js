const { test } = require('node:test');
const assert = require('node:assert');
const { createCoreResultRepository } = require('../../src/repositories/coreResultRepository');

test('coreResultRepository generates UUID id when missing and preserves fields', async () => {
  // Fake supabase-like client capturing inserts
  const fakeClient = {
    _table: null,
    _lastInsert: null,
    from(table) { this._table = table; return this; },
    insert(payload) {
      this._lastInsert = { table: this._table, payload };
      return this;
    },
    select() { return this; },
    async single() {
      // Return the inserted row as the DB would
      const arr = this._lastInsert.payload;
      const item = Array.isArray(arr) ? arr[0] : arr;
      return { data: item, error: null };
    },
  };

  const repo = createCoreResultRepository(fakeClient);

  const payload = {
    reading_id: 'r-123',
    tenant_id: 't-1',
    environment_id: 'e-1',
    device_id: 'd-1',
    domain: 'corporate',
    public_response: { version: '1.0', status: 'ok' },
  };

  const inserted = await repo.insert(payload);

  // id must exist and be a UUID
  assert.ok(inserted.id, 'id generated');
  assert.match(inserted.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'id is valid UUID');

  // Other fields preserved
  assert.strictEqual(inserted.reading_id, payload.reading_id);
  assert.strictEqual(inserted.tenant_id, payload.tenant_id);
  assert.strictEqual(inserted.environment_id, payload.environment_id);
  assert.strictEqual(inserted.device_id, payload.device_id);
  assert.strictEqual(inserted.domain, payload.domain);
  assert.deepStrictEqual(inserted.public_response, payload.public_response);
});
