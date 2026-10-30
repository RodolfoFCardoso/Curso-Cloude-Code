import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { signInWithPassword: h.signInWithPassword, signUp: h.signUp, signOut: h.signOut,
      resetPasswordForEmail: h.resetPasswordForEmail,
    },
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { requestPasswordReset, signIn, signOut, signUp } from './actions';

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
    await expect(signIn(idle, form({ email: ' a@b.c ', password: 'x' }))).resolves.toEqual({
      status: 'error',
      message: 'E-mail ou senha incorretos.',
      email: 'a@b.c',
    });
  });
  it('campos vazios', async () => {
    await expect(signIn(idle, form({ email: '', password: '123' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe e-mail e senha.',
      email: '',
    });
    await expect(signIn(idle, form({ email: 'a@b.c', password: '' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe e-mail e senha.',
      email: 'a@b.c',
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
      email: 'a@b.c',
    });
    expect(h.signUp).not.toHaveBeenCalled();
  });
  it('campos vazios', async () => {
    await expect(signUp(idle, form({ ...ok, email: '' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe e-mail e senha.',
      email: '',
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
      email: 'a@b.c',
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
      email: 'a@b.c',
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

describe('requestPasswordReset', () => {
  const sent = {
    status: 'sent',
    message: 'Se houver uma conta com esse e-mail, enviamos um link.',
  };
  it('responde neutro mesmo se o e-mail não existe', async () => {
    h.resetPasswordForEmail.mockResolvedValue({ error: { code: 'user_not_found' } });
    await expect(requestPasswordReset(idle, form({ email: 'x@y.z' }))).resolves.toEqual(sent);
    h.resetPasswordForEmail.mockResolvedValue({ error: null });
    await expect(requestPasswordReset(idle, form({ email: 'x@y.z' }))).resolves.toEqual(sent);
  });
  it('vazio pede e-mail', async () => {
    await expect(requestPasswordReset(idle, form({ email: '  ' }))).resolves.toEqual({
      status: 'error',
      message: 'Informe seu e-mail.',
      email: '',
    });
    expect(h.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it('rate limit vira erro', async () => {
    h.resetPasswordForEmail.mockResolvedValue({ error: { code: 'over_email_send_rate_limit' } });
    await expect(requestPasswordReset(idle, form({ email: 'x@y.z' }))).resolves.toEqual({
      status: 'error',
      message: 'Muitas tentativas. Aguarde alguns minutos.',
      email: 'x@y.z',
    });
  });
});
