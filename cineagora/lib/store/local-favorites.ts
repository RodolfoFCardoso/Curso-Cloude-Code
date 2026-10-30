import type { Movie } from '../tmdb/types';
import type { FavoritesStore } from './types';

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

export function createLocalFavoritesStore(
  storage: Storage | null = null,
  key = 'cineagora:favorites:v1',
): FavoritesStore {
  let movies = readMovies(storage, key);
  const listeners = new Set<() => void>();

  return {
    list: () => movies,
    has: (id) => movies.some((m) => m.id === id),
    toggle(movie) {
      movies = movies.some((m) => m.id === movie.id)
        ? movies.filter((m) => m.id !== movie.id)
        : [movie, ...movies];
      try {
        storage?.setItem(key, JSON.stringify({ movies }));
      } catch {
        // Modo privado / cota cheia: segue só em memória.
      }
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
