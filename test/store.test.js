import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../src/store.js';

test('save devolve { code, url, createdAt } com código de 6 chars', () => {
  const store = createStore();

  const record = store.save('https://example.com');

  assert.match(record.code, /^[a-zA-Z0-9]{6}$/);
  assert.equal(record.url, 'https://example.com');
  assert.equal(typeof record.createdAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(record.createdAt)));
});

test('get devolve o mesmo registro salvo', () => {
  const store = createStore();

  const record = store.save('https://example.com/abc');
  assert.deepEqual(store.get(record.code), record);
});

test('get de código inexistente devolve undefined', () => {
  const store = createStore();

  assert.equal(store.get('nao3x'), undefined);
});

test('link novo começa com clicks: 0', () => {
  const store = createStore();

  const record = store.save('https://example.com');

  assert.equal(record.clicks, 0);
});

test('increment acumula cliques no registro', () => {
  const store = createStore();

  const record = store.save('https://example.com');

  store.increment(record.code);
  store.increment(record.code);
  const updated = store.increment(record.code);

  assert.equal(updated.clicks, 3);
  assert.equal(store.get(record.code).clicks, 3);
});

test('increment de código inexistente devolve undefined', () => {
  const store = createStore();

  assert.equal(store.increment('nao3x'), undefined);
});

test('1000 inserções geram códigos únicos', () => {
  const store = createStore();
  const codes = new Set();

  for (let i = 0; i < 1000; i += 1) {
    const { code } = store.save(`https://example.com/${i}`);
    assert.match(code, /^[a-zA-Z0-9]{6}$/);
    codes.add(code);
  }

  assert.equal(codes.size, 1000);
});

test('list devolve todos os registros salvos', () => {
  const store = createStore();

  const first = store.save('https://example.com/1');
  const second = store.save('https://example.com/2');

  assert.deepEqual(store.list(), [first, second]);
});

test('list de store vazio devolve array vazio', () => {
  const store = createStore();

  assert.deepEqual(store.list(), []);
});

test('remove apaga um registro existente e devolve true', () => {
  const store = createStore();
  const record = store.save('https://example.com/remover');

  assert.equal(store.remove(record.code), true);
  assert.equal(store.get(record.code), undefined);
});

test('remove de código inexistente devolve false', () => {
  const store = createStore();

  assert.equal(store.remove('nao3x'), false);
});
