'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { migrateLocalFavorites } from '../store/migrate-favorites';
import { createSupabaseMovieListStore, movieStatusTable } from '../store/supabase-movie-list';
import type { MovieListError, MovieListStore, MovieStatus } from '../store/types';
import type { Movie } from '../tmdb/types';
import type { AuthUser } from './types';

type AuthValue = {
  user: AuthUser | null;
  available: boolean;
  store: MovieListStore | null;
};

const AuthContext = createContext<AuthValue | null>(null);

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function AuthProvider({
  user,
  available,
  makeStore,
  children,
}: {
  user: AuthUser | null;
  available: boolean;
  makeStore?: (user: AuthUser) => MovieListStore;
  children: ReactNode;
}) {
  const router = useRouter();
  const userId = user?.id ?? null;

  // O store nasce só no cliente (efeito): o construtor do adapter já dispara a carga, e no
  // servidor isso seria uma consulta anônima. Antes de montar, o estado coincide com o snapshot do servidor.
  const [created, setCreated] = useState<{ userId: string; store: MovieListStore } | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- o store precisa nascer no cliente, após a montagem */
  useEffect(() => {
    if (!user) return; // sem usuário, `store` derivado abaixo já é null
    // Ao trocar de usuário, escritas/cargas em andamento do store antigo terminam contra a tabela
    // dele (presa ao id antigo): inofensivo, não precisa de dispose.
    if (makeStore) {
      setCreated({ userId: user.id, store: makeStore(user) });
      return;
    }
    const table = movieStatusTable(getSupabaseBrowserClient(), user.id);
    const store = createSupabaseMovieListStore(table);
    setCreated({ userId: user.id, store });
    const storage = browserStorage();
    if (storage) {
      migrateLocalFavorites(storage, table)
        .then((n) => (n > 0 ? store.reload() : undefined))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recria só quando o id muda
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const store = created && created.userId === userId ? created.store : null;

  useEffect(() => {
    if (!available) return;
    const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      if ((session?.user?.id ?? null) !== userId) router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [available, userId, router]);

  const value = useMemo(() => ({ user, available, store }), [user, available, store]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): { user: AuthUser | null; available: boolean } {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return { user: ctx.user, available: ctx.available };
}

const EMPTY: Movie[] = [];
const noopSubscribe = () => () => {};
const falseSnapshot = () => false;
const nullSnapshot = () => null;
const emptySnapshot = () => EMPTY;

export function useMovieList(): {
  ready: boolean;
  error: MovieListError | null;
  list(status: MovieStatus): Movie[];
  statusOf(id: number): MovieStatus | null;
  setStatus(movie: Movie, status: MovieStatus | null): void;
  reload(): Promise<void>;
} {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useMovieList precisa estar dentro de <AuthProvider>');
  const store = ctx.store;
  const subscribe = store ? store.subscribe : noopSubscribe;
  const ready = useSyncExternalStore(
    subscribe,
    store ? store.isReady : falseSnapshot,
    falseSnapshot,
  );
  const error = useSyncExternalStore(
    subscribe,
    store ? store.lastError : nullSnapshot,
    nullSnapshot,
  );
  const want = useSyncExternalStore(
    subscribe,
    store ? () => store.list('want') : emptySnapshot,
    emptySnapshot,
  );
  const watched = useSyncExternalStore(
    subscribe,
    store ? () => store.list('watched') : emptySnapshot,
    emptySnapshot,
  );
  return useMemo(
    () => ({
      ready,
      error,
      list: (status: MovieStatus) => (status === 'want' ? want : watched),
      statusOf: (id: number) => store?.statusOf(id) ?? null,
      setStatus: (movie: Movie, status: MovieStatus | null) => store?.setStatus(movie, status),
      reload: () => store?.reload() ?? Promise.resolve(),
    }),
    [store, ready, error, want, watched],
  );
}
