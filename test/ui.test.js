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

test('GET / serve a interface HTML', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  const html = await res.text();
  assert.match(html, /Encurtador de Links/);
  assert.match(html, /id="create-form"/);
});

test('GET /app.js serve o script da interface', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/app.js`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
});

test('GET /styles.css serve o estilo da interface', async () => {
  const { baseUrl } = await startServer();

  const res = await fetch(`${baseUrl}/styles.css`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/css/);
});
