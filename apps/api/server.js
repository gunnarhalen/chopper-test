import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBoard, normalizeBoard } from '@kanban/shared';
import { createStore } from './store.js';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(here, '..', 'web', 'public');
const SHARED_FILE = resolve(here, '..', '..', 'packages', 'shared', 'index.js');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveStatic(req, res, urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const target = resolve(WEB_ROOT, '.' + (rel === '/' ? '/index.html' : rel));

  if (target !== WEB_ROOT && !target.startsWith(WEB_ROOT + sep)) {
    sendJson(res, 403, { error: 'forbidden' });
    return;
  }

  try {
    const file = await readFile(target);
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(target)] || 'application/octet-stream',
      'Content-Length': file.length,
    });
    res.end(file);
  } catch {
    sendJson(res, 404, { error: 'not found' });
  }
}

export function createServer({ store = createStore() } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;

    try {
      if (pathname === '/api/boards') {
        if (req.method === 'GET') {
          const board = await store.read();
          sendJson(res, 200, normalizeBoard(board) || createBoard());
          return;
        }

        if (req.method === 'PUT') {
          let parsed;
          try {
            parsed = JSON.parse(await readBody(req));
          } catch {
            sendJson(res, 400, { error: 'invalid JSON' });
            return;
          }

          const board = normalizeBoard(parsed);
          if (!board) {
            sendJson(res, 400, { error: 'invalid board' });
            return;
          }

          await store.write(board);
          sendJson(res, 200, board);
          return;
        }

        sendJson(res, 405, { error: 'method not allowed' });
        return;
      }

      if (pathname === '/shared.js') {
        const file = await readFile(SHARED_FILE);
        res.writeHead(200, {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Content-Length': file.length,
        });
        res.end(file);
        return;
      }

      if (req.method === 'GET' || req.method === 'HEAD') {
        await serveStatic(req, res, pathname);
        return;
      }

      sendJson(res, 404, { error: 'not found' });
    } catch (err) {
      sendJson(res, 500, { error: 'internal error', detail: String(err.message) });
    }
  });
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Kanban rodando em http://localhost:${port}`);
  });
}
