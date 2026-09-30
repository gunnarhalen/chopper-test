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

test('POST /links cria link e responde 201 com { code, shortUrl }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();
  const host = `127.0.0.1:${port}`;

  const res = await fetch(`http://${host}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/pagina' }),
  });

  assert.equal(res.status, 201);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');

  const body = await res.json();
  assert.match(body.code, /^[A-Za-z0-9]{6}$/);
  assert.equal(body.shortUrl, `http://${host}/${body.code}`);
});

test('GET /:code redireciona 302 para a URL original', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();
  const host = `127.0.0.1:${port}`;

  const createRes = await fetch(`http://${host}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/destino' }),
  });
  const { code } = await createRes.json();

  const res = await fetch(`http://${host}/${code}`, { redirect: 'manual' });

  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://example.com/destino');
});

test('GET /:code inexistente responde 404 { error: "not_found" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/naoexiste`);

  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await res.json(), { error: 'not_found' });
});
