import { describe, expect, it } from 'vitest';
import { afterLoginPath, safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
  it.each([
    ['/filme/12', '/filme/12'],
    ['/?aba=ja-assisti', '/?aba=ja-assisti'],
    ['/conta/nova-senha', '/conta/nova-senha'],
  ])('aceita %s', (v, out) => expect(safeRedirectPath(v)).toBe(out));

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'filme/12', '', null, undefined, 42])(
    'rejeita %s',
    (v) => expect(safeRedirectPath(v)).toBe('/'),
  );

  it('usa o fallback informado', () => {
    expect(safeRedirectPath('//x', '/conta/senha')).toBe('/conta/senha');
  });
});

describe('afterLoginPath', () => {
  it.each([
    ['/filme/12', '/filme/12'],
    ['/?aba=ja-assisti', '/?aba=ja-assisti'],
    ['/conta/senha', '/conta/senha'],
    ['/entrada', '/entrada'],
  ])('mantém %s', (v, out) => expect(afterLoginPath(v)).toBe(out));

  it.each(['/entrar', '/entrar?voltar=/entrar', '/entrar/recuperar', '/entrar#x', '//evil.com', 'https://evil.com', undefined])(
    'troca %s por /',
    (v) => expect(afterLoginPath(v)).toBe('/'),
  );
});
