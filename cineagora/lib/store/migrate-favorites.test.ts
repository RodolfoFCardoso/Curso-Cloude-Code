import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createFakeMovieStatusTable } from './fake-movie-status-table';
import { migrateLocalFavorites } from './migrate-favorites';
import { toRow } from './supabase-movie-list';

const KEY = 'cineagora:favorites:v1';
const movie = (id: number) => ({
  id,
  title: `Filme ${id}`,
  year: 2020,
  rating: 7,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as unknown as Storage;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it('migra como want, ignora duplicatas e apaga a chave', async () => {
  const storage = memoryStorage({ [KEY]: JSON.stringify({ movies: [movie(2), movie(1)] }) });
  const t = createFakeMovieStatusTable();
  expect(await migrateLocalFavorites(storage, t)).toBe(2);
  expect(t.upsert.calls).toHaveLength(1);
  const [rows, opts] = t.upsert.calls[0] as [{ status: string }[], { ignoreDuplicates: boolean }];
  expect(opts.ignoreDuplicates).toBe(true);
  expect(rows.map((r) => r.status)).toEqual(['want', 'want']);
  expect(storage.getItem(KEY)).toBeNull();
});

it('Review Focus 4: não apaga a chave se o upsert falhar e é idempotente', async () => {
  const storage = memoryStorage({ [KEY]: JSON.stringify({ movies: [movie(1)] }) });
  const t = createFakeMovieStatusTable([toRow(movie(1), 'watched')]);
  t.failNext({ message: 'x' });
  expect(await migrateLocalFavorites(storage, t)).toBe(0);
  expect(storage.getItem(KEY)).not.toBeNull();
  await migrateLocalFavorites(storage, t);
  expect(t.rows.find((r) => r.movie_id === 1)?.status).toBe('watched');
});

it('sem favoritos ou JSON corrompido não chama a tabela', async () => {
  const t = createFakeMovieStatusTable();
  expect(await migrateLocalFavorites(memoryStorage(), t)).toBe(0);
  expect(await migrateLocalFavorites(memoryStorage({ [KEY]: '{' }), t)).toBe(0);
  expect(await migrateLocalFavorites(null, t)).toBe(0);
  expect(t.upsert.calls).toHaveLength(0);
});
