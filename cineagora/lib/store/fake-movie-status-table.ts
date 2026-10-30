import type { DbResult, MovieStatusRow, MovieStatusTable } from './supabase-movie-list';

type DbError = NonNullable<DbResult['error']>;

export interface Deferred {
  resolve(): void;
  reject(error: DbError): void;
}

export interface FakeMovieStatusTable extends MovieStatusTable {
  /** Linhas atuais, mais recente primeiro. */
  rows: MovieStatusRow[];
  /** A próxima chamada (qualquer uma) devolve este erro. */
  failNext(error: DbError): void;
  /** A próxima escrita só termina quando o teste chamar resolve()/reject(). */
  deferNext(): Deferred;
  upsert: MovieStatusTable['upsert'] & { calls: unknown[][] };
}

/** Tabela falsa em memória, para testar adapters sem rede. */
export function createFakeMovieStatusTable(initial: MovieStatusRow[] = []): FakeMovieStatusTable {
  let failure: DbError | null = null;
  let deferred: Promise<DbResult> | null = null;
  const table = { rows: [...initial] } as FakeMovieStatusTable;

  const takeFailure = (): DbResult | null => {
    if (!failure) return null;
    const error = failure;
    failure = null;
    return { data: null, error };
  };

  const upsert = async (rows: MovieStatusRow[], opts?: { ignoreDuplicates?: boolean }) => {
    upsert.calls.push([rows, opts]);
    const failed = takeFailure();
    if (failed) return failed;
    const apply = (): DbResult => {
      for (const row of rows) {
        const exists = table.rows.some((r) => r.movie_id === row.movie_id);
        if (exists && opts?.ignoreDuplicates) continue;
        table.rows = [row, ...table.rows.filter((r) => r.movie_id !== row.movie_id)];
      }
      return { data: null, error: null };
    };
    return wait(apply);
  };
  upsert.calls = [] as unknown[][];

  function wait(apply: () => DbResult): Promise<DbResult> | DbResult {
    if (!deferred) return apply();
    const pending = deferred;
    deferred = null;
    return pending.then((result) => (result.error ? result : apply()));
  }

  table.upsert = upsert;
  table.selectAll = async () => {
    const failed = takeFailure();
    if (failed) return failed as DbResult<MovieStatusRow[] | null>;
    return { data: [...table.rows], error: null };
  };
  table.remove = async (movieId) => {
    const failed = takeFailure();
    if (failed) return failed;
    return wait(() => {
      table.rows = table.rows.filter((r) => r.movie_id !== movieId);
      return { data: null, error: null };
    });
  };
  table.failNext = (error) => {
    failure = error;
  };
  table.deferNext = () => {
    let settle!: (result: DbResult) => void;
    deferred = new Promise<DbResult>((res) => {
      settle = res;
    });
    return {
      resolve: () => settle({ data: null, error: null }),
      reject: (error) => settle({ data: null, error }),
    };
  };
  return table;
}
