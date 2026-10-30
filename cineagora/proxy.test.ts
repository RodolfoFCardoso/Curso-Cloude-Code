import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/proxy', () => ({ updateSession: vi.fn() }));

import { config } from './proxy';

describe('proxy config', () => {
  it('matcher mantém o ponto escapado antes da extensão', () => {
    expect(config.matcher[0]).toBe(
      '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    );
    expect(config.matcher[0]).toContain('\\.(?:svg');
  });
});
