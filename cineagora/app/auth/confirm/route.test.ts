import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(), set: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { verifyOtp: h.verifyOtp, exchangeCodeForSession: h.exchangeCodeForSession } }),
}));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: h.set }) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { GET } from './route';

function req(qs: string) {
  return new Request(`http://localhost/auth/confirm?${qs}`);
}

beforeEach(() => vi.clearAllMocks());

describe('GET /auth/confirm', () => {
  it('recovery ok grava cookie e vai para next', async () => {
    h.verifyOtp.mockResolvedValue({ error: null });
    await expect(
      GET(req('token_hash=abc&type=recovery&next=/conta/nova-senha')),
    ).rejects.toThrow('REDIRECT:/conta/nova-senha');
    expect(h.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' });
    expect(h.set).toHaveBeenCalledWith(
      'cineagora_recovery',
      '1',
      expect.objectContaining({ httpOnly: true, maxAge: 600 }),
    );
  });
  it('signup ok não grava cookie de recuperação', async () => {
    h.verifyOtp.mockResolvedValue({ error: null });
    await expect(GET(req('token_hash=abc&type=signup&next=/'))).rejects.toThrow('REDIRECT:/');
    expect(h.set).not.toHaveBeenCalled();
  });
  it('link expirado em recovery vai para recuperar com erro', async () => {
    h.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } });
    await expect(GET(req('token_hash=abc&type=recovery'))).rejects.toThrow(
      'REDIRECT:/entrar/recuperar?erro=link-expirado',
    );
    expect(h.set).not.toHaveBeenCalled();
  });
  it('link expirado em signup vai para entrar com erro', async () => {
    h.verifyOtp.mockResolvedValue({ error: { code: 'otp_expired' } });
    await expect(GET(req('token_hash=abc&type=signup'))).rejects.toThrow(
      'REDIRECT:/entrar?erro=link-expirado',
    );
  });
  it('next externo cai em /', async () => {
    h.verifyOtp.mockResolvedValue({ error: null });
    await expect(GET(req('token_hash=abc&type=signup&next=//evil.com'))).rejects.toThrow('REDIRECT:/');
  });
  it('type desconhecido é falha', async () => {
    await expect(GET(req('token_hash=abc&type=magiclink'))).rejects.toThrow(
      'REDIRECT:/entrar?erro=link-expirado',
    );
    expect(h.verifyOtp).not.toHaveBeenCalled();
  });
  it('recovery com code (modelo padrão do Supabase) troca o code e grava cookie', async () => {
    h.exchangeCodeForSession.mockResolvedValue({ error: null });
    await expect(GET(req('code=xyz&type=recovery&next=/conta/nova-senha'))).rejects.toThrow(
      'REDIRECT:/conta/nova-senha',
    );
    expect(h.exchangeCodeForSession).toHaveBeenCalledWith('xyz');
    expect(h.verifyOtp).not.toHaveBeenCalled();
    expect(h.set).toHaveBeenCalledWith('cineagora_recovery', '1', expect.anything());
  });
  it('code inválido em recovery vai para recuperar com erro', async () => {
    h.exchangeCodeForSession.mockResolvedValue({ error: { code: 'bad_code_verifier' } });
    await expect(GET(req('code=xyz&type=recovery'))).rejects.toThrow(
      'REDIRECT:/entrar/recuperar?erro=link-expirado',
    );
    expect(h.set).not.toHaveBeenCalled();
  });
  it('sem token_hash nem code é falha', async () => {
    await expect(GET(req('type=signup'))).rejects.toThrow('REDIRECT:/entrar?erro=link-expirado');
    expect(h.verifyOtp).not.toHaveBeenCalled();
  });
});
