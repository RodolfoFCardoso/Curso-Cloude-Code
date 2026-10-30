import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  getCurrentUser: vi.fn(),
  cookieGet: vi.fn(),
  cookieDelete: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithPassword: h.signInWithPassword, updateUser: h.updateUser },
  }),
  getCurrentUser: h.getCurrentUser,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: h.cookieGet, delete: h.cookieDelete }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { changePassword, resetPassword } from './actions';

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
const idle = { status: 'idle' } as const;
const user = { id: 'u1', email: 'a@b.c' };

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentUser.mockResolvedValue(user);
});

describe('changePassword', () => {
  const ok = { current: 'antiga1', next: 'nova123', confirm: 'nova123' };
  it('sem usuário vai para entrar', async () => {
    h.getCurrentUser.mockResolvedValue(null);
    await expect(changePassword(idle, form(ok))).rejects.toThrow(
      'REDIRECT:/entrar?voltar=/conta/senha',
    );
  });
  it('com senha atual errada', async () => {
    h.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });
    await expect(changePassword(idle, form(ok))).resolves.toEqual({
      status: 'error',
      message: 'Senha atual incorreta.',
    });
    expect(h.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'antiga1' });
    expect(h.updateUser).not.toHaveBeenCalled();
  });
  it('valida antes de chamar o Supabase', async () => {
    await expect(changePassword(idle, form({ ...ok, next: '123', confirm: '123' }))).resolves.toEqual({
      status: 'error',
      message: 'A nova senha precisa ter pelo menos 6 caracteres.',
    });
    expect(h.signInWithPassword).not.toHaveBeenCalled();
    expect(h.updateUser).not.toHaveBeenCalled();
  });
  it('erro no updateUser vira mensagem', async () => {
    h.signInWithPassword.mockResolvedValue({ error: null });
    h.updateUser.mockResolvedValue({ error: { code: 'weak_password' } });
    await expect(changePassword(idle, form(ok))).resolves.toEqual({
      status: 'error',
      message: 'Senha fraca. Use letras, números e símbolos.',
    });
  });
  it('ok', async () => {
    h.signInWithPassword.mockResolvedValue({ error: null });
    h.updateUser.mockResolvedValue({ error: null });
    await expect(changePassword(idle, form(ok))).resolves.toEqual({
      status: 'success',
      message: 'Senha alterada.',
    });
    expect(h.updateUser).toHaveBeenCalledWith({ password: 'nova123' });
  });
});

describe('resetPassword', () => {
  const ok = { next: 'nova123', confirm: 'nova123' };
  it('sem cookie volta para /conta/senha', async () => {
    h.cookieGet.mockReturnValue(undefined);
    await expect(resetPassword(idle, form(ok))).rejects.toThrow('REDIRECT:/conta/senha');
    expect(h.updateUser).not.toHaveBeenCalled();
  });
  it('sem usuário volta para /conta/senha', async () => {
    h.getCurrentUser.mockResolvedValue(null);
    h.cookieGet.mockReturnValue({ value: '1' });
    await expect(resetPassword(idle, form(ok))).rejects.toThrow('REDIRECT:/conta/senha');
    expect(h.updateUser).not.toHaveBeenCalled();
  });
  it('senhas diferentes', async () => {
    h.cookieGet.mockReturnValue({ value: '1' });
    await expect(resetPassword(idle, form({ next: 'nova123', confirm: 'outra12' }))).resolves.toEqual({
      status: 'error',
      message: 'As senhas não conferem.',
    });
    expect(h.updateUser).not.toHaveBeenCalled();
  });
  it('ok apaga cookie e redireciona com aviso', async () => {
    h.cookieGet.mockReturnValue({ value: '1' });
    h.updateUser.mockResolvedValue({ error: null });
    await expect(resetPassword(idle, form(ok))).rejects.toThrow('REDIRECT:/?aviso=senha-redefinida');
    expect(h.cookieGet).toHaveBeenCalledWith('cineagora_recovery');
    expect(h.cookieDelete).toHaveBeenCalledWith('cineagora_recovery');
  });
});
