import 'server-only';
import { filterRail } from './filter';
import { logTmdbError } from './tmdb/errors';
import {
  getByGenre,
  getGenres,
  getNowPlaying,
  getPopular,
  getTrending,
  getWatchProviders,
} from './tmdb/service';
import type { Movie, RailItem } from './tmdb/types';

export type RailKey = 'trending' | 'popular' | 'now_playing' | `genre-${number}`;
export type HomeRail = { key: RailKey; title: string; movies: Movie[] };

export class HomeUnavailableError extends Error {
  constructor() {
    super('Nenhum trilho da home pôde ser carregado');
    this.name = 'HomeUnavailableError';
  }
}

const FIXED_RAILS = [
  { key: 'trending', title: 'Em alta', load: getTrending },
  { key: 'popular', title: 'Populares', load: getPopular },
  { key: 'now_playing', title: 'Lançamentos', load: getNowPlaying },
] as const;

const GENRE_KEY = /^genre-([1-9]\d*)$/;
const POSITIVE_INT = /^[1-9]\d*$/;

export function parseRailKey(s: string): RailKey | null {
  if (FIXED_RAILS.some((r) => r.key === s)) return s as RailKey;
  return GENRE_KEY.test(s) ? (s as RailKey) : null;
}

export function parseProviderIds(s: string | null): number[] {
  const ids = (s ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => POSITIVE_INT.test(part))
    .map(Number);
  return [...new Set(ids)];
}

export function parseMovieId(s: string): number | null {
  return POSITIVE_INT.test(s) ? Number(s) : null;
}

export function fetchRailMovies(key: RailKey, providerIds: number[] = []): Promise<Movie[]> {
  const genre = GENRE_KEY.exec(key);
  if (genre) return getByGenre(Number(genre[1]), providerIds);
  return FIXED_RAILS.find((r) => r.key === key)!.load();
}

export async function fetchRailItems(key: RailKey, providerIds: number[]): Promise<RailItem[]> {
  const movies = await fetchRailMovies(key, providerIds);
  return filterRail(movies, providerIds, getWatchProviders);
}

async function settle(rails: { key: RailKey; title: string; load: () => Promise<Movie[]> }[]) {
  const results = await Promise.allSettled(rails.map((r) => r.load()));
  return results.map((result, i) => {
    if (result.status === 'rejected') logTmdbError(result.reason, { rail: rails[i].key });
    return result.status === 'fulfilled'
      ? { key: rails[i].key, title: rails[i].title, movies: result.value }
      : null;
  });
}

export async function loadHomeRails(): Promise<HomeRail[]> {
  const genreRails = getGenres().then((genres) =>
    genres.map((g) => ({
      key: `genre-${g.id}` as RailKey,
      title: g.name,
      load: () => getByGenre(g.id),
    })),
  );

  const [fixed, genres] = await Promise.all([
    settle(FIXED_RAILS.map((r) => ({ ...r }))),
    genreRails.then(settle, (err) => {
      logTmdbError(err, { rail: 'genres' });
      return null;
    }),
  ]);

  const attempted = [...fixed, ...(genres ?? [])];
  if (attempted.every((r) => r === null)) throw new HomeUnavailableError();

  return attempted.filter((r): r is HomeRail => r !== null && r.movies.length > 0);
}
