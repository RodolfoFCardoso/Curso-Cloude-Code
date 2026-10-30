import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tmdbFetch } from './client';
import { logTmdbError, TmdbError } from './errors';

vi.mock('server-only', () => ({}));

const TOKEN = 'secret-token';
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function captureError(promise: Promise<unknown>): Promise<TmdbError> {
  try {
    await promise;
  } catch (err) {
    return err as TmdbError;
  }
  throw new Error('esperava um erro');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('TMDB_API_KEY', TOKEN);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('tmdbFetch', () => {
  it('monta a URL com pt-BR, omite params undefined e autentica pelo header', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const data = await tmdbFetch('/movie/popular', { region: 'BR', page: undefined }, 10800);

    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.themoviedb.org/3/movie/popular?language=pt-BR&region=BR');
    expect(url).not.toContain(TOKEN);
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.next).toEqual({ revalidate: 10800 });
    expect(init.cache).toBe('force-cache');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [404, 'not_found'],
    [429, 'rate_limit'],
    [401, 'auth'],
    [500, 'server'],
    [503, 'server'],
  ])('status %i vira TmdbError %s', async (status, kind) => {
    fetchMock.mockResolvedValue(jsonResponse({ status_message: 'x' }, status));

    const err = await captureError(tmdbFetch('/movie/1', {}, 60));

    expect(err).toBeInstanceOf(TmdbError);
    expect(err.kind).toBe(kind);
    expect(err.status).toBe(status);
    expect(err.path).toBe('/movie/1');
  });

  it('falha de rede vira network', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect((await captureError(tmdbFetch('/x', {}, 60))).kind).toBe('network');
  });

  it('timeout vira timeout', async () => {
    fetchMock.mockRejectedValue(new DOMException('demorou', 'TimeoutError'));
    expect((await captureError(tmdbFetch('/x', {}, 60))).kind).toBe('timeout');
  });

  it('JSON inválido vira server', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));
    expect((await captureError(tmdbFetch('/x', {}, 60))).kind).toBe('server');
  });

  it('sem TMDB_API_KEY falha com auth sem chamar a rede', async () => {
    vi.stubEnv('TMDB_API_KEY', '');

    const err = await captureError(tmdbFetch('/x', {}, 60));

    expect(err.kind).toBe('auth');
    expect(err.message).toBe('TMDB_API_KEY ausente');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('nenhum erro carrega o token', async () => {
    const failures = [
      () => fetchMock.mockResolvedValue(jsonResponse({}, 401)),
      () => fetchMock.mockResolvedValue(jsonResponse({}, 500)),
      () => fetchMock.mockRejectedValue(new TypeError(`falhou ${TOKEN}`)),
    ];
    for (const arrange of failures) {
      arrange();
      const err = await captureError(tmdbFetch('/x', {}, 60));
      expect(err.message).not.toContain(TOKEN);
      expect(JSON.stringify(err)).not.toContain(TOKEN);
      expect(String(err.stack)).not.toContain(TOKEN);
    }
  });
});

describe('logTmdbError', () => {
  it('registra caminho e contexto, sem o token', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new TmdbError('server', '/movie/550', 'TMDB respondeu 500', 500);

    logTmdbError(err, { movieId: 550 });

    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).toContain('/movie/550');
    expect(logged).toContain('550');
    expect(logged).not.toContain(TOKEN);
    spy.mockRestore();
  });
});

describe('codificação da busca', () => {
  it('caracteres especiais vão codificados na URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    await tmdbFetch('/search/movie', { query: 'Amélie & #1' }, 60);
    expect(fetchMock.mock.calls[0][0]).toContain('query=Am%C3%A9lie+%26+%231');
  });
});
