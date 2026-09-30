import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';

test('gera 1000 códigos únicos de 6 caracteres', () => {
  const store = createStore();
  const codes = new Set();

  for (let i = 0; i < 1000; i += 1) {
    const record = store.save(`https://example.com/${i}`);
    assert.match(record.code, /^[a-zA-Z0-9]{6}$/);
    codes.add(record.code);
  }

  assert.equal(codes.size, 1000);
});

test('get de código existente retorna o registro', () => {
  const store = createStore();
  const saved = store.save('https://example.com/a');

  const found = store.get(saved.code);

  assert.deepEqual(found, saved);
});

test('get de código inexistente retorna undefined', () => {
  const store = createStore();

  assert.equal(store.get('naoexiste'), undefined);
});

test('incrementClicks incrementa o contador do registro', () => {
  const store = createStore();
  const saved = store.save('https://example.com/a');

  assert.equal(saved.clicks, 0);

  store.incrementClicks(saved.code);
  store.incrementClicks(saved.code);

  assert.equal(store.get(saved.code).clicks, 2);
});

test('incrementClicks de código inexistente retorna undefined', () => {
  const store = createStore();

  assert.equal(store.incrementClicks('naoexiste'), undefined);
});

test('list retorna todos os registros criados', () => {
  const store = createStore();
  assert.deepEqual(store.list(), []);

  const a = store.save('https://example.com/a');
  const b = store.save('https://example.com/b');

  assert.deepEqual(store.list(), [a, b]);
});

test('remove apaga o registro e retorna o removido', () => {
  const store = createStore();
  const saved = store.save('https://example.com/a');

  const removed = store.remove(saved.code);

  assert.deepEqual(removed, saved);
  assert.equal(store.get(saved.code), undefined);
  assert.deepEqual(store.list(), []);
});

test('remove de código inexistente retorna undefined', () => {
  const store = createStore();

  assert.equal(store.remove('naoexiste'), undefined);
});
