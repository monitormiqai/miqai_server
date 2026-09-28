const { test } = require('node:test');
const assert = require('node:assert');
const child_process = require('child_process');
const http = require('http');

test('entrypoint server exposes POST /api/v1/telemetria (not 404)', async () => {
  // Find an available port and start the real entrypoint using that port
  const net = require('net');
  const serverTemp = net.createServer();
  await new Promise((resolve, reject) => serverTemp.listen(0, resolve));
  const port = serverTemp.address().port;
  await new Promise((resolve) => serverTemp.close(resolve));

  const env = Object.assign({}, process.env, { PORT: String(port) });
  const child = child_process.spawn(process.execPath, ['src/index.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

  // Wait for the server to accept connections by polling
  const start = Date.now();
  const deadline = start + 5000;
  let lastErr = null;
  try {
    while (Date.now() < deadline) {
      try {
        // Try a small request to see if server responds (may return 401/403 but not 404)
        const probe = await new Promise((resolve, reject) => {
          const req = http.request({ hostname: '127.0.0.1', port, path: '/health', method: 'GET', timeout: 1000 }, (r) => {
            r.resume();
            resolve(r.statusCode);
          });
          req.on('error', (e) => reject(e));
          req.end();
        });
        if (typeof probe === 'number') break;
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
    }

    // After server is accepting, send a POST without API key — we expect NOT 404
    const res = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: '/api/v1/telemetria', method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 2000 }, (r) => {
        let d = '';
        r.on('data', (c) => (d += c.toString()));
        r.on('end', () => resolve({ statusCode: r.statusCode, body: d }));
      });
      req.on('error', reject);
      req.write('{}');
      req.end();
    });

    assert.notStrictEqual(res.statusCode, 404);
  } finally {
    // Cleanup child process
    try { child.kill(); } catch (e) {}
  }
});
