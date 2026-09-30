import { randomInt } from 'node:crypto';

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function createStore() {
  const links = new Map();

  function save(url) {
    let code = generateCode();
    while (links.has(code)) {
      code = generateCode();
    }

    const record = { code, url, createdAt: new Date().toISOString() };
    links.set(code, record);
    return record;
  }

  function get(code) {
    return links.get(code);
  }

  return { save, get };
}
