import type { Movie } from '../tmdb/types';
import { toRow, type MovieStatusTable } from './supabase-movie-list';

const KEY = 'cineagora:favorites:v1';

const orNull = <T>(v: unknown, type: string): T | null => (typeof v === type ? (v as T) : null);

// Aceita só registros minimamente válidos; o resto do snapshot ganha defaults.
function toMovie(v: unknown): Movie | null {
  const r = v as Partial<Movie> | null;
  if (!r || !Number.isInteger(r.id) || (r.id as number) <= 0 || typeof r.title !== 'string') {
    return null;
  }
  return {
    id: r.id as number,
    title: r.title,
    year: orNull<number>(r.year, 'number'),
    rating: orNull<number>(r.rating, 'number'),
    posterUrl: orNull<string>(r.posterUrl, 'string'),
    backdropUrl: orNull<string>(r.backdropUrl, 'string'),
    genreIds: Array.isArray(r.genreIds) ? r.genreIds.filter(Number.isInteger) : [],
  };
}

function readMovies(storage: Storage | null, key: string): Movie[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? 'null');
    const movies = (parsed as { movies?: unknown } | null)?.movies;
    if (!Array.isArray(movies)) return [];
    const valid = movies.map(toMovie).filter((m): m is Movie => m !== null);
    return valid.filter((m, i) => valid.findIndex((o) => o.id === m.id) === i);
  } catch {
    return [];
  }
}

/**
 * Leva os favoritos locais para a conta como "Quero assistir". Não sobrescreve
 * status existentes (ignoreDuplicates) e só apaga a chave local após sucesso.
 * Devolve quantos foram enviados (0 se não havia nada ou se a gravação falhou).
 */
export async function migrateLocalFavorites(
  storage: Storage | null,
  table: MovieStatusTable,
): Promise<number> {
  const movies = readMovies(storage, KEY);
  if (movies.length === 0) return 0;
  try {
    const { error } = await table.upsert(
      movies.map((m) => toRow(m, 'want')),
      { ignoreDuplicates: true },
    );
    if (error) {
      console.error('[movie-list]', { op: 'migrate', code: error.code, message: error.message });
      return 0;
    }
  } catch (e) {
    console.error('[movie-list]', { op: 'migrate', message: e instanceof Error ? e.message : String(e) });
    return 0;
  }
  try {
    storage?.removeItem(KEY);
  } catch {
    // Sem acesso ao storage: a migração é idempotente, roda de novo sem estragar nada.
  }
  return movies.length;
}
