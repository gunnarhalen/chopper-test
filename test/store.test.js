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
