export type TmdbErrorKind = 'network' | 'timeout' | 'rate_limit' | 'not_found' | 'auth' | 'server';

// Erro controlado da TMDB. Nunca carrega o token nem o erro original (que poderia carregá-lo).
export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly path: string;
  readonly status?: number;

  constructor(kind: TmdbErrorKind, path: string, message: string, status?: number) {
    super(message);
    this.name = 'TmdbError';
    this.kind = kind;
    this.path = path;
    this.status = status;
  }
}

export function logTmdbError(err: unknown, context: Record<string, string | number>): void {
  if (err instanceof TmdbError) {
    console.error('[tmdb]', err.kind, err.path, err.status ?? '', err.message, context);
  } else {
    console.error('[tmdb] erro inesperado', err instanceof Error ? err.message : err, context);
  }
}
