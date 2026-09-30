import http from 'node:http';
import { pathToFileURL } from 'node:url';

import { createStore } from './store.js';

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function methodNotAllowed(res, allow) {
  const body = JSON.stringify({ error: 'method_not_allowed' });
  res.writeHead(405, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    Allow: allow,
  });
  res.end(body);
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.length === 0) {
        resolve({ ok: false });
        return;
      }
      try {
        resolve({ ok: true, body: JSON.parse(raw) });
      } catch {
        resolve({ ok: false });
      }
    });
    req.on('error', reject);
  });
}

function createHandler(store) {
  return async function handler(req, res) {
    const host = req.headers.host ?? 'localhost';
    const url = new URL(req.url, `http://${host}`);

    if (url.pathname === '/health') {
      if (req.method !== 'GET') {
        methodNotAllowed(res, 'GET');
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/links') {
      if (req.method !== 'POST') {
        methodNotAllowed(res, 'POST');
        return;
      }
      const { ok, body } = await readJsonBody(req);
      if (!ok) {
        sendJson(res, 400, { error: 'invalid_json' });
        return;
      }
      if (!isValidHttpUrl(body?.url)) {
        sendJson(res, 400, { error: 'invalid_url' });
        return;
      }
      const record = store.save(body.url);
      sendJson(res, 201, {
        code: record.code,
        shortUrl: `http://${host}/${record.code}`,
      });
      return;
    }

    const statsMatch = url.pathname.match(/^\/links\/([A-Za-z0-9]+)\/stats$/);
    if (statsMatch) {
      if (req.method !== 'GET') {
        methodNotAllowed(res, 'GET');
        return;
      }
      const record = store.get(statsMatch[1]);
      if (record) {
        sendJson(res, 200, {
          url: record.url,
          clicks: record.clicks,
          createdAt: record.createdAt,
        });
        return;
      }
      sendJson(res, 404, { error: 'not_found' });
      return;
    }

    const code = url.pathname.slice(1);
    if (code.length > 0 && !code.includes('/')) {
      if (req.method !== 'GET') {
        methodNotAllowed(res, 'GET');
        return;
      }
      const record = store.increment(code);
      if (record) {
        res.writeHead(302, { Location: record.url });
        res.end();
        return;
      }
      sendJson(res, 404, { error: 'not_found' });
      return;
    }

    sendJson(res, 404, { error: 'not_found' });
  };
}

export function createServer() {
  return http.createServer(createHandler(createStore()));
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => {
    console.log(`Servidor ouvindo em http://localhost:${port}`);
  });
}
