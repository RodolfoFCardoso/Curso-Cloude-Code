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

export type MovieStatus = 'want' | 'watched';

export type MovieListError = 'load' | 'save' | 'unauthenticated';

export interface MovieListStore {
  /** false até a primeira carga terminar. */
  isReady(): boolean;
  /** Mais recente primeiro; mesma referência enquanto não mudar. */
  list(status: MovieStatus): Movie[];
  statusOf(id: number): MovieStatus | null;
  /** null = desmarcar. Otimista: atualiza na hora, desfaz se o banco falhar. */
  setStatus(movie: Movie, status: MovieStatus | null): void;
  /** Último erro; null depois de uma operação bem-sucedida. */
  lastError(): MovieListError | null;
  reload(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
