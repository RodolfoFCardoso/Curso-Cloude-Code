import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithPassword: h.signInWithPassword, signUp: h.signUp, signOut: h.signOut },
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { signIn, signOut, signUp } from './actions';

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}
const idle = { status: 'idle' } as const;

beforeEach(() => vi.clearAllMocks());

describe('signIn', () => {
  it('ok redireciona para voltar', async () => {
    h.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      signIn(idle, form({ email: 'a@b.c', password: '123456', voltar: '/filme/12' })),
    ).rejects.toThrow('REDIRECT:/filme/12');
  });
  it('voltar externo vai para /', async () => {
    h.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      signIn(idle, form({ email: 'a@b.c', password: '123456', voltar: 'https://evil.com' })),
    ).rejects.toThrow('REDIRECT:/');
  });
  it('credenciais erradas', async () => {
    h.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } });
    await expect(signIn(idle, form({ email: 'a@b.c', password: 'x' }))).resolves.toEqual({
      status: 'error',
      message: 'E-mail ou senha incorretos.',
    });
  });
  it('campos vazios', async () => {
    await expect(signIn(idle, form({ email: '', password: '123' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe e-mail e senha.',
    });
    await expect(signIn(idle, form({ email: 'a@b.c', password: '' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe e-mail e senha.',
    });
    expect(h.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('signUp', () => {
  const ok = { email: 'a@b.c', password: '123456', voltar: '/filme/12' };
  it('senha curta', async () => {
    await expect(signUp(idle, form({ ...ok, password: '12345' }))).resolves.toEqual({
      status: 'error',
      message: 'A senha precisa ter pelo menos 6 caracteres.',
    });
    expect(h.signUp).not.toHaveBeenCalled();
  });
  it('campos vazios', async () => {
    await expect(signUp(idle, form({ ...ok, email: '' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe e-mail e senha.',
    });
  });
  it('sem sessão pede confirmação', async () => {
    h.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    await expect(signUp(idle, form(ok))).resolves.toEqual({
      status: 'check-email',
      message: 'Enviamos um link para seu e-mail. Abra-o para ativar a conta.',
    });
  });
  it('e-mail existente com confirmação ligada', async () => {
    h.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    await expect(signUp(idle, form(ok))).resolves.toEqual({
      status: 'error',
      message: 'Este e-mail já tem conta.',
    });
  });
  it('com sessão redireciona', async () => {
    h.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: { access_token: 't' } },
      error: null,
    });
    await expect(signUp(idle, form(ok))).rejects.toThrow('REDIRECT:/filme/12');
  });
  it('erro do Supabase vira mensagem', async () => {
    h.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { code: 'weak_password' } });
    await expect(signUp(idle, form(ok))).resolves.toEqual({
      status: 'error',
      message: 'Senha fraca. Use letras, números e símbolos.',
    });
  });
});

describe('signOut', () => {
  it('sai e volta para a home', async () => {
    h.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow('REDIRECT:/');
    expect(h.signOut).toHaveBeenCalled();
  });
});
