import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as rails from '@/lib/rails';
import { GET } from './route';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/rails', async (orig) => ({
  ...(await orig<typeof import('@/lib/rails')>()),
  fetchRailItems: vi.fn(),
}));
vi.mock('@/lib/tmdb/errors', async (orig) => ({
  ...(await orig<typeof import('@/lib/tmdb/errors')>()),
  logTmdbError: vi.fn(),
}));

const fetchRailItems = vi.mocked(rails.fetchRailItems);

function call(key: string, query = '') {
  return GET(new Request(`http://localhost/api/rail/${key}${query}`), {
    params: Promise.resolve({ key }),
  });
}

beforeEach(() => {
  fetchRailItems.mockReset();
});

describe('GET /api/rail/[key]', () => {
  it('chave inválida dá 404', async () => {
    const res = await call('genre-xyz');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
    expect(fetchRailItems).not.toHaveBeenCalled();
  });

  it('sucesso devolve itens com cache público', async () => {
    fetchRailItems.mockResolvedValue({ items: [], failures: 0 });
    const res = await call('popular', '?providers=8,abc,,1899');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(fetchRailItems).toHaveBeenCalledWith('popular', [8, 1899]);
    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=10800, stale-while-revalidate=86400',
    );
  });

  it('resultado parcial (alguma consulta falhou) não vai para o cache', async () => {
    fetchRailItems.mockResolvedValue({ items: [], failures: 3 });
    const res = await call('popular', '?providers=8');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('falha da TMDB vira 502 sem detalhes', async () => {
    fetchRailItems.mockRejectedValue(new Error('detalhe interno'));
    const res = await call('trending', '?providers=8');
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ error: 'unavailable' });
  });
});
