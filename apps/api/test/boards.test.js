import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
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
});
