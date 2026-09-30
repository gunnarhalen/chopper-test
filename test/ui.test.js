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

test('GET / entrega o HTML da interface', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/`);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');

  const body = await res.text();
  assert.match(body, /id="root"/);
  assert.match(body, /src="\/app\.js"/);
});

test('GET /app.js entrega o bundle React sem confundir com um código', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/app.js`);

  assert.equal(res.status, 200);
  assert.equal(
    res.headers.get('content-type'),
    'text/javascript; charset=utf-8',
  );

  const body = await res.text();
  assert.match(body, /createRoot/);
});

test('GET /styles.css entrega a folha de estilos', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/styles.css`);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/css; charset=utf-8');
});
