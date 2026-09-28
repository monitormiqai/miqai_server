const { test } = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../src/server');

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const validPayload = JSON.stringify({
  deviceId: 11,
  firmwareVersion: '1.0.0',
  measuredAt: '2026-09-21T10:53:00Z',
  temperature: 24.7
});

test('POST /api/v1/telemetria valid payload returns auth_blocked (403)', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'k' } }, validPayload);
  assert.strictEqual(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.code, 'auth_blocked');

  await new Promise((r) => server.close(r));
});

test('POST /api/v1/telemetria empty body returns 400', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'k' } }, '');
  assert.strictEqual(res.statusCode, 400);

  await new Promise((r) => server.close(r));
});

test('POST /api/v1/telemetria invalid JSON returns 400', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'k' } }, '{');
  assert.strictEqual(res.statusCode, 400);

  await new Promise((r) => server.close(r));
});

test('POST /api/v1/telemetria invalid Content-Type returns 400', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-API-Key': 'k' } }, validPayload);
  assert.strictEqual(res.statusCode, 400);

  await new Promise((r) => server.close(r));
});

test('POST /api/v1/telemetria missing X-API-Key returns 401', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'application/json' } }, validPayload);
  assert.strictEqual(res.statusCode, 401);

  await new Promise((r) => server.close(r));
});

test('GET /api/v1/telemetria returns 405', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'GET' });
  assert.strictEqual(res.statusCode, 405);

  await new Promise((r) => server.close(r));
});

test('POST /api/v1/telemetria structural invalid payload returns 422', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;

  const bad = JSON.stringify({ firmwareVersion: '1.0.0' });
  const res = await request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'k' } }, bad);
  assert.strictEqual(res.statusCode, 422);

  await new Promise((r) => server.close(r));
});
