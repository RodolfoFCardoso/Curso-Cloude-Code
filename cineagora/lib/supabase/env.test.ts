import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseEnv, requireSupabaseEnv } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSupabaseEnv', () => {
  it('devolve url e key quando as duas existem', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk');
    expect(getSupabaseEnv()).toEqual({ url: 'https://x.supabase.co', key: 'pk' });
  });

  it.each([
    ['', 'pk'],
    ['https://x.supabase.co', ''],
  ])('null se faltar (%s, %s)', (url, key) => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
    expect(getSupabaseEnv()).toBeNull();
  });
});

describe('requireSupabaseEnv', () => {
  it('lança mensagem clara sem vazar valores', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'segredo');
    expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(() => requireSupabaseEnv()).not.toThrow(/segredo/);
  });
});
