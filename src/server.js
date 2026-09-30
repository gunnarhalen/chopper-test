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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function createHandler(store) {
  return async function handler(req, res) {
    const host = req.headers.host ?? 'localhost';
    const url = new URL(req.url, `http://${host}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/links') {
      const body = await readJsonBody(req);
      const record = store.save(body.url);
      sendJson(res, 201, {
        code: record.code,
        shortUrl: `http://${host}/${record.code}`,
      });
      return;
    }

    if (req.method === 'GET') {
      const code = url.pathname.slice(1);
      if (code.length > 0 && !code.includes('/')) {
        const record = store.get(code);
        if (record) {
          res.writeHead(302, { Location: record.url });
          res.end();
          return;
        }
        sendJson(res, 404, { error: 'not_found' });
        return;
      }
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
