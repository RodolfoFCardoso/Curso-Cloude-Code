'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { migrateLocalFavorites } from '../store/migrate-favorites';
import {
  createSupabaseMovieListStore,
  movieStatusTable,
} from '../store/supabase-movie-list';
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

  // Um store (e uma tabela, para a migração) por usuário.
  const created = useMemo(() => {
    const current = user;
    if (!current) return null;
    if (makeStore) return { store: makeStore(current), table: null };
    const table = movieStatusTable(getSupabaseBrowserClient(), current.id);
    return { store: createSupabaseMovieListStore(table), table };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recria só quando o id muda
  }, [userId]);
  const store = created?.store ?? null;

  const migratedFor = useRef<unknown>(null);
  useEffect(() => {
    if (!created?.table || migratedFor.current === created) return;
    migratedFor.current = created;
    const { store: s, table } = created;
    const storage = browserStorage();
    if (!storage) return;
    migrateLocalFavorites(storage, table)
      .then((n) => (n > 0 ? s.reload() : undefined))
      .catch(() => {});
  }, [created]);

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
  return {
    ready,
    error,
    list: (status) => (status === 'want' ? want : watched),
    statusOf: (id) => store?.statusOf(id) ?? null,
    setStatus: (movie, status) => store?.setStatus(movie, status),
    reload: () => store?.reload() ?? Promise.resolve(),
  };
}
