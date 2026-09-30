import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from '../src/server.js';

function startServer(t) {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      t.after(() => server.close());
      resolve(server);
    });
  });
}

test('GET /health responde 200 com { ok: true }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/health`);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await res.json(), { ok: true });
});

test('rota desconhecida responde 404', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/nao-existe`);

  assert.equal(res.status, 404);
});
