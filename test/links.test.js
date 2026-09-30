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

test('POST /links com URL inválida responde 400 com { error: "invalid_url" }', async () => {
  const { baseUrl } = await startServer();

  for (const url of ['not-a-url', 'ftp://example.com', '', undefined]) {
    const res = await fetch(`${baseUrl}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await res.json(), { error: 'invalid_url' });
  }
});

test('POST /links com corpo que não é JSON responde 400 com { error: "invalid_json" }', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'isto não é json',
  });

  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { error: 'invalid_json' });
});

test('método não suportado em rota existente responde 405', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/links`, { method: 'PUT' });

  assert.equal(res.status, 405);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { error: 'method_not_allowed' });
});

test('GET /links lista os links criados', async () => {
  const { baseUrl } = await startServer();

  const empty = await fetch(`${baseUrl}/links`);
  assert.equal(empty.status, 200);
  assert.match(empty.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await empty.json(), { links: [] });

  const created = await fetch(`${baseUrl}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/lista' }),
  });
  const { code } = await created.json();

  const res = await fetch(`${baseUrl}/links`);
  assert.equal(res.status, 200);
  const { links } = await res.json();
  assert.equal(links.length, 1);
  assert.equal(links[0].code, code);
  assert.equal(links[0].url, 'https://example.com/lista');
  assert.equal(links[0].clicks, 0);
  assert.equal(typeof links[0].createdAt, 'string');
});

test('DELETE /links/:code remove o link e responde 204', async () => {
  const { baseUrl } = await startServer();

  const created = await fetch(`${baseUrl}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/remover' }),
  });
  const { code } = await created.json();

  const res = await fetch(`${baseUrl}/links/${code}`, { method: 'DELETE' });
  assert.equal(res.status, 204);

  const stats = await fetch(`${baseUrl}/links/${code}/stats`);
  assert.equal(stats.status, 404);

  const { links } = await (await fetch(`${baseUrl}/links`)).json();
  assert.equal(links.length, 0);
});

test('DELETE /links/:code inexistente responde 404 com { error: "not_found" }', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/links/naoexiste`, { method: 'DELETE' });

  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});

test('método não suportado em /links/:code responde 405', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/links/abc123`, { method: 'PUT' });

  assert.equal(res.status, 405);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { error: 'method_not_allowed' });
});
