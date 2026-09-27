import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { STATUSES } from '@kanban/shared';
import { createStore } from '../store.js';
import { createServer } from '../server.js';

let dir;
let file;
let server;
let base;

function rawRequest(path, method = 'GET') {
  return new Promise((resolvePromise, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: server.address().port, path, method },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolvePromise({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kanban-'));
  file = join(dir, 'board.json');
  server = createServer({ store: createStore(file) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

test('GET /api/boards retorna quadro vazio quando não existe arquivo', async () => {
  const res = await fetch(`${base}/api/boards`);
  assert.equal(res.status, 200);
  const board = await res.json();
  assert.deepEqual(board, { cards: [] });
});

test('PUT /api/boards salva e GET subsequente reflete o estado', async () => {
  const payload = {
    cards: [
      {
        id: 'c1',
        title: 'Escrever plano',
        description: 'detalhar',
        status: 'doing',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  };

  const put = await fetch(`${base}/api/boards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(put.status, 200);
  const saved = await put.json();
  assert.equal(saved.cards.length, 1);
  assert.equal(saved.cards[0].title, 'Escrever plano');
  assert.equal(saved.cards[0].status, 'doing');

  const get = await fetch(`${base}/api/boards`);
  const board = await get.json();
  assert.deepEqual(board, saved);
});

test('PUT normaliza status inválido e descarta cartões sem título', async () => {
  const put = await fetch(`${base}/api/boards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cards: [
        { id: 'a', title: 'Válido', status: 'inexistente' },
        { id: 'b', title: '   ' },
      ],
    }),
  });
  assert.equal(put.status, 200);
  const board = await put.json();
  assert.equal(board.cards.length, 1);
  assert.equal(board.cards[0].status, 'todo');
  assert.ok(STATUSES.some((s) => s.id === board.cards[0].status));
});

test('PUT /api/boards rejeita payload inválido com 400', async () => {
  const res = await fetch(`${base}/api/boards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nope: true }),
  });
  assert.equal(res.status, 400);
});

test('PUT /api/boards rejeita JSON malformado com 400', async () => {
  const res = await fetch(`${base}/api/boards`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
});

test('GET / serve o front estático', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Kanban/i);
  assert.match(html, /<dialog/);
  assert.match(html, /icons\.svg/);
});

test('GET /icons.svg serve o sprite de ícones Tabler', async () => {
  const res = await fetch(`${base}/icons.svg`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/svg+xml');
  const svg = await res.text();
  assert.match(svg, /symbol\s+id="ti-arrow-left"/);
});

test('GET /alguma-rota (deep link) serve o front via fallback SPA', async () => {
  const res = await fetch(`${base}/alguma-rota`, {
    headers: { Accept: 'text/html' },
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /Kanban/i);
});

test('requires malformado // não derruba o servidor', async () => {
  const res = await rawRequest('//');
  assert.equal(res.status, 200);

  const after = await fetch(`${base}/`);
  assert.equal(after.status, 200);
  assert.match(await after.text(), /Kanban/i);
});

test('GET /api/inexistente retorna 404 JSON (sem fallback SPA)', async () => {
  const res = await fetch(`${base}/api/inexistente`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await res.json(), { error: 'not found' });
});

test('GET de asset inexistente retorna 404', async () => {
  const res = await fetch(`${base}/nao-existe.js`);
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
});

test('GET /favicon.ico responde 204', async () => {
  const res = await fetch(`${base}/favicon.ico`);
  assert.equal(res.status, 204);
});
