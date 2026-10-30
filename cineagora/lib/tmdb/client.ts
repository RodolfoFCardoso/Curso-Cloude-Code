import 'server-only';
import pLimit from 'p-limit';
import { TmdbError, type TmdbErrorKind } from './errors';

export const TMDB_BASE = 'https://api.themoviedb.org/3';

const TIMEOUT_MS = 8000;
// Evita estourar o limite da TMDB quando ~22 trilhos carregam juntos.
const limit = pLimit(8);

function kindForStatus(status: number): TmdbErrorKind {
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  if (status === 401 || status === 403) return 'auth';
  return 'server';
}

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams({ language: 'pt-BR' });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return `${TMDB_BASE}${path}?${search}`;
}

export function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  revalidateSeconds: number,
): Promise<T> {
  const token = process.env.TMDB_API_KEY;
  if (!token) return Promise.reject(new TmdbError('auth', path, 'TMDB_API_KEY ausente'));

  return limit(async () => {
    let res: Response;
    try {
      res = await fetch(buildUrl(path, params), {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        cache: 'force-cache',
        next: { revalidate: revalidateSeconds },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      throw isTimeout
        ? new TmdbError('timeout', path, `TMDB não respondeu em ${TIMEOUT_MS}ms`)
        : new TmdbError('network', path, 'Falha de rede ao acessar a TMDB');
    }

    if (!res.ok) {
      throw new TmdbError(
        kindForStatus(res.status),
        path,
        `TMDB respondeu ${res.status}`,
        res.status,
      );
    }

    try {
      return (await res.json()) as T;
    } catch {
      throw new TmdbError('server', path, 'Resposta inválida da TMDB', res.status);
    }
  });
}
