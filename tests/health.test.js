const { test } = require('node:test');
const assert = require('node:assert');
const { createServer } = require('../src/server');

test('GET /health returns status ok', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const res = await new Promise((resolve, reject) => {
    const http = require('http');
    http.get({ hostname: '127.0.0.1', port, path: '/health' }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });

  assert.strictEqual(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.strictEqual(body.status, 'ok');

  await new Promise((resolve) => server.close(resolve));
});
