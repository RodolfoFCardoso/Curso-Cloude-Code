import type { Movie } from '../tmdb/types';

// Interfaces da camada de dados. A UI fala só com elas; trocar localStorage por banco = novo adapter.

export interface PreferencesStore {
  /** Mesma referência enquanto não mudar (exigência do useSyncExternalStore). */
  getSelectedProviders(): number[];
  /** Normaliza: inteiros positivos únicos, em ordem crescente. */
  setSelectedProviders(ids: number[]): void;
  subscribe(listener: () => void): () => void;
}

export interface FavoritesStore {
  /** Mais recente primeiro; mesma referência enquanto não mudar. */
  list(): Movie[];
  has(id: number): boolean;
  toggle(movie: Movie): void;
  subscribe(listener: () => void): () => void;
}
