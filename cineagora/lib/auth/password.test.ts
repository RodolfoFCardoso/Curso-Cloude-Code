import { describe, expect, it } from 'vitest';
import { validateNewPassword } from './password';

describe('validateNewPassword', () => {
  it('exige pelo menos 6 caracteres', () => {
    expect(validateNewPassword({ next: '12345', confirm: '12345' })).toBe(
      'A nova senha precisa ter pelo menos 6 caracteres.',
    );
  });

  it('exige confirmação igual', () => {
    expect(validateNewPassword({ next: '123456', confirm: '1234567' })).toBe('As senhas não conferem.');
  });

  it('exige senha diferente da atual', () => {
    expect(validateNewPassword({ current: 'abcdef', next: 'abcdef', confirm: 'abcdef' })).toBe(
      'A nova senha precisa ser diferente da atual.',
    );
  });

  it('aceita senha válida', () => {
    expect(validateNewPassword({ current: 'abcdef', next: 'novasenha', confirm: 'novasenha' })).toBeNull();
    expect(validateNewPassword({ next: 'novasenha', confirm: 'novasenha' })).toBeNull();
  });
});
