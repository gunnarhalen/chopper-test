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

test('3 acessos a GET /:code resultam em clicks: 3', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();
  const host = `127.0.0.1:${port}`;

  const createRes = await fetch(`http://${host}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/contado' }),
  });
  const { code } = await createRes.json();

  for (let i = 0; i < 3; i += 1) {
    const res = await fetch(`http://${host}/${code}`, { redirect: 'manual' });
    assert.equal(res.status, 302);
  }

  const statsRes = await fetch(`http://${host}/links/${code}/stats`);
  assert.equal(statsRes.status, 200);
  assert.equal(
    statsRes.headers.get('content-type'),
    'application/json; charset=utf-8',
  );

  const stats = await statsRes.json();
  assert.equal(stats.url, 'https://example.com/contado');
  assert.equal(stats.clicks, 3);
  assert.equal(typeof stats.createdAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(stats.createdAt)));
});

test('GET /links/:code/stats inexistente responde 404 { error: "not_found" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/links/nao3x/stats`);

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});

test('GET /links lista os links cadastrados', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();
  const host = `127.0.0.1:${port}`;

  const empty = await fetch(`http://${host}/links`);
  assert.equal(empty.status, 200);
  assert.equal(
    empty.headers.get('content-type'),
    'application/json; charset=utf-8',
  );
  assert.deepEqual(await empty.json(), []);

  const createRes = await fetch(`http://${host}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/listado' }),
  });
  const { code } = await createRes.json();

  const res = await fetch(`http://${host}/links`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].code, code);
  assert.equal(body[0].url, 'https://example.com/listado');
  assert.equal(body[0].clicks, 0);
  assert.equal(typeof body[0].createdAt, 'string');
});

test('DELETE /links/:code remove o link e responde 204', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();
  const host = `127.0.0.1:${port}`;

  const createRes = await fetch(`http://${host}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/apagar' }),
  });
  const { code } = await createRes.json();

  const res = await fetch(`http://${host}/links/${code}`, {
    method: 'DELETE',
  });
  assert.equal(res.status, 204);

  const statsRes = await fetch(`http://${host}/links/${code}/stats`);
  assert.equal(statsRes.status, 404);
});

test('DELETE /links/:code inexistente responde 404 { error: "not_found" }', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/links/nao3x`, {
    method: 'DELETE',
  });

  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'not_found' });
});
