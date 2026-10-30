import type { SupabaseClient } from '@supabase/supabase-js';
import type { Movie } from '../tmdb/types';
import type { MovieListError, MovieListStore, MovieStatus } from './types';

export type MovieStatusRow = {
  movie_id: number;
  status: MovieStatus;
  title: string;
  year: number | null;
  rating: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genre_ids: number[];
  updated_at?: string;
};

export type DbResult<T = null> = {
  data: T;
  error: { message: string; code?: string; status?: number } | null;
};

export interface MovieStatusTable {
  selectAll(): Promise<DbResult<MovieStatusRow[] | null>>;
  upsert(rows: MovieStatusRow[], opts?: { ignoreDuplicates?: boolean }): Promise<DbResult>;
  remove(movieId: number): Promise<DbResult>;
}

/** Wrapper fino sobre a tabela `movie_status`; a RLS garante o dono, o user_id é injetado aqui. */
export function movieStatusTable(client: SupabaseClient, userId: string): MovieStatusTable {
  const from = () => client.from('movie_status');
  return {
    async selectAll() {
      const { data, error, status } = await from()
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      return {
        data: data as MovieStatusRow[] | null,
        error: error && { message: error.message, code: error.code, status },
      };
    },
    async upsert(rows, opts) {
      const updatedAt = new Date().toISOString();
      const { error, status } = await from().upsert(
        rows.map((r) => ({ ...r, user_id: userId, updated_at: updatedAt })),
        { onConflict: 'user_id,movie_id', ignoreDuplicates: opts?.ignoreDuplicates ?? false },
      );
      return { data: null, error: error && { message: error.message, code: error.code, status } };
    },
    async remove(movieId) {
      const { error, status } = await from().delete().eq('user_id', userId).eq('movie_id', movieId);
      return { data: null, error: error && { message: error.message, code: error.code, status } };
    },
  };
}

export function toRow(movie: Movie, status: MovieStatus): MovieStatusRow {
  return {
    movie_id: movie.id,
    status,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    poster_url: movie.posterUrl,
    backdrop_url: movie.backdropUrl,
    genre_ids: movie.genreIds,
  };
}

export function fromRow(row: MovieStatusRow): { movie: Movie; status: MovieStatus } {
  return {
    movie: {
      id: row.movie_id,
      title: row.title,
      year: row.year,
      rating: row.rating,
      posterUrl: row.poster_url,
      backdropUrl: row.backdrop_url,
      genreIds: row.genre_ids ?? [],
    },
    status: row.status,
  };
}

type Entry = { movie: Movie; status: MovieStatus };
type DbError = NonNullable<DbResult['error']>;

const STATUSES: readonly MovieStatus[] = ['want', 'watched'];

function classify(error: DbError, fallback: 'load' | 'save'): MovieListError {
  return error.status === 401 || error.code === 'PGRST301' ? 'unauthenticated' : fallback;
}

/** Adapter Supabase: escrita otimista, com rollback por filme. Já dispara a primeira carga. */
export function createSupabaseMovieListStore(table: MovieStatusTable): MovieListStore {
  let entries: Entry[] = []; // mais recente primeiro
  const lists: Record<MovieStatus, Movie[]> = { want: [], watched: [] };
  const versions = new Map<number, number>();
  const listeners = new Set<() => void>();
  let ready = false;
  let error: MovieListError | null = null;

  const notify = () => listeners.forEach((listener) => listener());
  const indexOf = (id: number) => entries.findIndex((e) => e.movie.id === id);
  const statusOf = (id: number): MovieStatus | null => entries[indexOf(id)]?.status ?? null;
  const recompute = (...which: (MovieStatus | null)[]) => {
    for (const s of STATUSES) {
      if (which.includes(s)) {
        lists[s] = entries.filter((e) => e.status === s).map((e) => e.movie);
      }
    }
  };

  function report(op: string, err: DbError) {
    console.error('[movie-list]', { op, code: err.code, message: err.message });
  }

  async function run<T extends DbResult<unknown>>(call: () => Promise<T>): Promise<T | DbResult> {
    try {
      return await call();
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
  }

  // Último estado confirmado pelo servidor (snapshot aplicado ou escrita bem-sucedida), mais recente primeiro.
  let confirmed: Entry[] = [];
  // Estado otimista mais recente dos filmes com escrita em andamento (null = desmarcado).
  const optimistic = new Map<number, Entry | null>();
  let reloadGeneration = 0;
  let writeSeq = 0;
  let lastFailedSeq = 0;

  const confirm = (id: number, entry: Entry | null) => {
    confirmed = confirmed.filter((e) => e.movie.id !== id);
    if (entry) confirmed = [entry, ...confirmed];
  };

  async function reload() {
    const generation = ++reloadGeneration;
    const result = await run(() => table.selectAll());
    if (generation !== reloadGeneration) return; // uma recarga mais nova assumiu
    if (result.error) {
      report('load', result.error);
      error = classify(result.error, 'load');
    } else {
      confirmed = ((result.data as MovieStatusRow[] | null) ?? []).map(fromRow);
      entries = [...confirmed];
      // Escritas ainda pendentes prevalecem sobre o snapshot.
      for (const [id, entry] of optimistic) {
        entries = entries.filter((e) => e.movie.id !== id);
        if (entry) entries = [entry, ...entries];
      }
      recompute(...STATUSES);
      error = null;
    }
    ready = true;
    notify();
  }

  function setStatus(movie: Movie, status: MovieStatus | null) {
    const previous = entries[indexOf(movie.id)] ?? null;
    if ((previous?.status ?? null) === status) return;

    const version = (versions.get(movie.id) ?? 0) + 1;
    versions.set(movie.id, version);
    const seq = ++writeSeq;
    const next: Entry | null = status === null ? null : { movie, status };
    entries = entries.filter((e) => e.movie.id !== movie.id);
    if (next) entries = [next, ...entries];
    optimistic.set(movie.id, next);
    recompute(previous?.status ?? null, status);
    notify();

    const write = status === null ? () => table.remove(movie.id) : () => table.upsert([toRow(movie, status)]);
    void run(write).then((result) => {
      const latest = versions.get(movie.id) === version;
      if (!result.error) {
        confirm(movie.id, next);
        if (latest) optimistic.delete(movie.id);
        // Só limpa o erro se nenhuma escrita iniciada depois desta falhou.
        if (error !== null && lastFailedSeq < seq) {
          error = null;
          notify();
        }
        return;
      }
      report('save', result.error);
      lastFailedSeq = Math.max(lastFailedSeq, seq);
      if (latest) {
        optimistic.delete(movie.id);
        // Volta ao último estado confirmado pelo servidor, na posição confirmada.
        const at = confirmed.findIndex((e) => e.movie.id === movie.id);
        entries = entries.filter((e) => e.movie.id !== movie.id);
        if (at >= 0) entries.splice(Math.min(at, entries.length), 0, confirmed[at]);
        recompute(...STATUSES);
      }
      error = classify(result.error, 'save');
      notify();
    });
  }

  void reload();

  return {
    isReady: () => ready,
    list: (status) => lists[status],
    statusOf,
    setStatus,
    lastError: () => error,
    reload,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
