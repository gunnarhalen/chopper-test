import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.js';
import { STATIC_ROUTES, sendStatic } from './static.js';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function isValidUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function handler(store) {
  return async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const statsMatch = pathname.match(/^\/links\/([a-zA-Z0-9]+)\/stats$/);
    const linkMatch = pathname.match(/^\/links\/([a-zA-Z0-9]+)$/);

    if (pathname === '/health' && req.method !== 'GET') {
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    if (pathname === '/links' && req.method !== 'POST' && req.method !== 'GET') {
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    if (statsMatch && req.method !== 'GET') {
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    if (linkMatch && req.method !== 'DELETE') {
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && pathname === '/links') {
      sendJson(res, 200, { links: store.list() });
      return;
    }

    if (req.method === 'POST' && pathname === '/links') {
      let payload;
      try {
        payload = await readJson(req);
      } catch {
        sendJson(res, 400, { error: 'invalid_json' });
        return;
      }

      if (!isValidUrl(payload?.url)) {
        sendJson(res, 400, { error: 'invalid_url' });
        return;
      }

      const record = store.save(payload.url);
      sendJson(res, 201, { code: record.code, shortUrl: `http://${req.headers.host}/${record.code}` });
      return;
    }

    if (req.method === 'GET' && statsMatch) {
      const record = store.get(statsMatch[1]);
      if (record) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: record.url, clicks: record.clicks, createdAt: record.createdAt }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    if (req.method === 'DELETE' && linkMatch) {
      const removed = store.remove(linkMatch[1]);
      if (removed) {
        res.writeHead(204);
        res.end();
        return;
      }
      sendJson(res, 404, { error: 'not_found' });
      return;
    }

    if (req.method === 'GET' && STATIC_ROUTES[pathname]) {
      await sendStatic(res, STATIC_ROUTES[pathname]);
      return;
    }

    if (req.method === 'GET' && pathname.length > 1) {
      const code = pathname.slice(1);
      const record = store.get(code);
      if (record) {
        store.incrementClicks(code);
        res.writeHead(302, { Location: record.url });
        res.end();
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  };
}

export function createServer(store = createStore()) {
  return http.createServer(handler(store));
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
