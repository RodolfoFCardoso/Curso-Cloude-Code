import type { Movie } from '../tmdb/types';
import type { MovieListError, MovieListStore, MovieStatus } from './types';

type Entry = { movie: Movie; status: MovieStatus };

const STATUSES: readonly MovieStatus[] = ['want', 'watched'];

/** Adapter em memória: pronto na criação; `initial` já em ordem (mais recente primeiro). */
export function createMemoryMovieListStore(initial: Entry[] = []): MovieListStore {
  let entries: Entry[] = [...initial];
  const lists: Record<MovieStatus, Movie[]> = { want: [], watched: [] };
  const listeners = new Set<() => void>();

  function compute(status: MovieStatus): Movie[] {
    return entries.filter((e) => e.status === status).map((e) => e.movie);
  }
  for (const status of STATUSES) lists[status] = compute(status);

  function statusOf(id: number): MovieStatus | null {
    return entries.find((e) => e.movie.id === id)?.status ?? null;
  }

  return {
    isReady: () => true,
    list: (status) => lists[status],
    statusOf,
    setStatus(movie, status) {
      const previous = statusOf(movie.id);
      if (previous === status) return;
      entries = entries.filter((e) => e.movie.id !== movie.id);
      if (status !== null) entries = [{ movie, status }, ...entries];
      // Só recalcula as listas dos status envolvidos; as outras mantêm a referência.
      for (const s of STATUSES) {
        if (s === previous || s === status) lists[s] = compute(s);
      }
      listeners.forEach((listener) => listener());
    },
    lastError: (): MovieListError | null => null,
    reload: () => Promise.resolve(),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
