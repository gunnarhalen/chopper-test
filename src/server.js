import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createStore } from './store.js';

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

function handler(store) {
  return async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === 'POST' && pathname === '/links') {
      let payload;
      try {
        payload = await readJson(req);
      } catch {
        payload = {};
      }

      const record = store.save(payload.url);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: record.code, shortUrl: `http://${req.headers.host}/${record.code}` }));
      return;
    }

    const statsMatch = pathname.match(/^\/links\/([a-zA-Z0-9]+)\/stats$/);
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
