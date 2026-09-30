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

async function postLinks(port, body) {
  return fetch(`http://127.0.0.1:${port}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

test('POST /links com URL inválida responde 400 { error: "invalid_url" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await postLinks(port, JSON.stringify({ url: 'nao-e-url' }));

  assert.equal(res.status, 400);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await res.json(), { error: 'invalid_url' });
});

test('POST /links com esquema não http/https responde 400 { error: "invalid_url" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await postLinks(port, JSON.stringify({ url: 'ftp://example.com' }));

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid_url' });
});

test('POST /links sem url responde 400 { error: "invalid_url" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await postLinks(port, JSON.stringify({}));

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid_url' });
});

test('POST /links com url não-string responde 400 { error: "invalid_url" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await postLinks(port, JSON.stringify({ url: 123 }));

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid_url' });
});

test('POST /links com corpo não-JSON responde 400 { error: "invalid_json" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await postLinks(port, 'isso nao e json');

  assert.equal(res.status, 400);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await res.json(), { error: 'invalid_json' });
});

test('POST /links com corpo vazio responde 400 { error: "invalid_json" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await postLinks(port, '');

  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'invalid_json' });
});

test('POST /links com JSON válido continua respondendo 201', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();
  const host = `127.0.0.1:${port}`;

  const res = await postLinks(
    port,
    JSON.stringify({ url: 'https://example.com/valida' }),
  );

  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.code, /^[A-Za-z0-9]{6}$/);
  assert.equal(body.shortUrl, `http://${host}/${body.code}`);
});

for (const [method, path] of [
  ['PUT', '/health'],
  ['POST', '/health'],
  ['GET', '/links'],
  ['DELETE', '/links'],
  ['POST', '/links/abc123/stats'],
  ['DELETE', '/abc123'],
]) {
  test(`${method} ${path} responde 405 { error: "method_not_allowed" }`, async (t) => {
    const server = await startServer(t);
    const { port } = server.address();

    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method });

    assert.equal(res.status, 405);
    assert.equal(
      res.headers.get('content-type'),
      'application/json; charset=utf-8',
    );
    assert.deepEqual(await res.json(), { error: 'method_not_allowed' });
  });
}

test('GET de código inexistente continua respondendo 404', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/naoexiste`);

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});
