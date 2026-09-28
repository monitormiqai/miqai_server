const { validateTelemetry } = require('../validation/telemetryValidator');

function parseJsonBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = '';

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('payload_too_large'), { code: 'payload_too_large' }));
        req.destroy();
        return;
      }
      chunks += chunk.toString();
    });

    req.on('end', () => {
      if (!chunks) return reject(Object.assign(new Error('empty_body'), { code: 'empty_body' }));
      try {
        const json = JSON.parse(chunks);
        resolve(json);
      } catch (err) {
        reject(Object.assign(new Error('invalid_json'), { code: 'invalid_json' }));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

async function handleTelemetry(req, res) {
  // Headers
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers['X-Api-Key'];

  // Content-Type check
  if (!contentType.includes('application/json')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_content_type' }));
    return;
  }

  // API key required
  if (!apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing_api_key' }));
    return;
  }

  // Parse body
  let body;
  try {
    body = await parseJsonBody(req, 1_000_000);
  } catch (err) {
    if (err.code === 'empty_body') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'empty_body' }));
      return;
    }
    if (err.code === 'invalid_json') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_json' }));
      return;
    }
    if (err.code === 'payload_too_large') {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'payload_too_large' }));
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_request' }));
    return;
  }

  // Disallow apiKey in body
  if (Object.prototype.hasOwnProperty.call(body, 'apiKey')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'api_key_in_body_not_allowed' }));
    return;
  }

  // Structural validation
  const validation = validateTelemetry(body);
  if (!validation.valid) {
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_payload', details: validation.errors }));
    return;
  }

  // Attempt ingestion (Checkpoint 3 integration)
  const ingestionService = require('../services/ingestionService');
  try {
    await ingestionService.ingest({ apiKey, telemetry: body });
    // If ingestion succeeds, acknowledge accepted
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'accepted' }));
    return;
  } catch (ingErr) {
    // Authentication blocked by methodological constraint
    if (ingErr.message === 'authentication_blocked' || ingErr.reason === 'auth_blocked' || ingErr.message === 'auth_blocked_methodology') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'auth_blocked', message: ingErr.detail || ingErr.message || 'Authentication blocked' }));
      return;
    }

    // Database not configured
    if (ingErr.message === 'db_not_configured') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'db_not_configured' }));
      return;
    }

    // credential/device errors
    if (ingErr.message === 'credential_not_found' || ingErr.reason === 'unauthorized') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'unauthorized' }));
      return;
    }

    if (ingErr.message === 'device_not_found') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'device_not_found' }));
      return;
    }

    console.error('ingestion error', ingErr);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'internal_error' }));
    return;
  }
}

module.exports = { handleTelemetry };
