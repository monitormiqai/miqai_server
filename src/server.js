const http = require('http');
const url = require('url');
const config = require('./config');
const telemetryController = require('./controllers/telemetryController');

function createServer() {
  const handler = (req, res) => {
    const parsed = url.parse(req.url, true);

    // Normalize pathname to ignore trailing slash
    const pathname = (parsed.pathname || '').replace(/\/+$|^$/g, (m) => (m === '' ? '/' : ''));

    // Health check
    if (req.method === 'GET' && pathname === '/health') {
      const body = JSON.stringify({ status: 'ok', uptime: process.uptime() });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }

    // Telemetry ingestion route
    if (pathname === '/api/v1/telemetria') {
      if (req.method === 'POST') {
        telemetryController.handleTelemetry(req, res);
        return;
      }

      // Method not allowed for this route
      res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'POST' });
      res.end(JSON.stringify({ error: 'method_not_allowed' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  };

  const server = http.createServer(handler);

  server.on('error', (err) => {
    console.error('Server error', err);
  });

  return server;
}

module.exports = { createServer };
