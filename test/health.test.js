import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('GET /health responde 200 com { ok: true }', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/health`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { ok: true });
});

test('rota desconhecida responde 404', async () => {
  const server = createServer();

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/nope`);

  assert.equal(res.status, 404);
});
