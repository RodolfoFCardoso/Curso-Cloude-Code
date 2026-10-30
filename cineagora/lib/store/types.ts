import type { Movie } from '../tmdb/types';

/** Nota mínima (TMDB) dos trilhos da home; 0 = Todas. */
export type MinRating = 0 | 6 | 7 | 8;

export const MIN_RATINGS: readonly MinRating[] = [0, 6, 7, 8];

// Interfaces da camada de dados. A UI fala só com elas; trocar localStorage por banco = novo adapter.

export interface PreferencesStore {
  /** Mesma referência enquanto não mudar (exigência do useSyncExternalStore). */
  getSelectedProviders(): number[];
  /** Normaliza: inteiros positivos únicos, em ordem crescente. */
  setSelectedProviders(ids: number[]): void;
  getMinRating(): MinRating;
  /** Valor fora de MIN_RATINGS vira 0 (Todas). */
  setMinRating(value: MinRating): void;
  subscribe(listener: () => void): () => void;
}

export interface FavoritesStore {
  /** Mais recente primeiro; mesma referência enquanto não mudar. */
  list(): Movie[];
  has(id: number): boolean;
  toggle(movie: Movie): void;
  subscribe(listener: () => void): () => void;
}
