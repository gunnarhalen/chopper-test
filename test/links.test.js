import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

async function startServer() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test('POST /links cria um link e retorna code e shortUrl', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  });

  assert.equal(res.status, 201);
  assert.match(res.headers.get('content-type'), /application\/json/);

  const body = await res.json();
  assert.match(body.code, /^[a-zA-Z0-9]{6}$/);
  assert.equal(body.shortUrl, `${baseUrl}/${body.code}`);
});

test('GET /:code redireciona para a URL original', async () => {
  const { baseUrl } = await startServer();

  const created = await fetch(`${baseUrl}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/destino' }),
  });
  const { code } = await created.json();

  const res = await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });

  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://example.com/destino');
});

test('GET /:code inexistente responde 404 com { error: "not_found" }', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/naoexiste`);

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});

test('GET /links/:code/stats conta os acessos ao link', async () => {
  const { baseUrl } = await startServer();

  const created = await fetch(`${baseUrl}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/contado' }),
  });
  const { code } = await created.json();

  for (let i = 0; i < 3; i += 1) {
    const redirect = await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });
    assert.equal(redirect.status, 302);
  }

  const res = await fetch(`${baseUrl}/links/${code}/stats`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const body = await res.json();
  assert.equal(body.url, 'https://example.com/contado');
  assert.equal(body.clicks, 3);
  assert.equal(typeof body.createdAt, 'string');
});

test('GET /links/:code/stats de código inexistente responde 404', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/links/naoexiste/stats`);

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});
