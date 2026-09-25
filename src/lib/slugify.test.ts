import { slugify } from './slugify';

describe('slugify', () => {
  test('texto normal', () => {
    expect(slugify('Olá Mundo')).toBe('ola-mundo');
  });

  test('acentos', () => {
    expect(slugify('ação café')).toBe('acao-cafe');
  });

  test('espaços e sublinhados', () => {
    expect(slugify('hello_world foo bar')).toBe('hello-world-foo-bar');
  });

  test('entrada vazia', () => {
    expect(slugify('')).toBe('sem-titulo');
  });

  test('corte em 60 caracteres', () => {
    const longo = 'a'.repeat(100);
    expect(slugify(longo)).toHaveLength(60);
  });
});
