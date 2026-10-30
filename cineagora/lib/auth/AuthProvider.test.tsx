import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Movie } from '../tmdb/types';
import { createMemoryMovieListStore } from '../store/memory-movie-list';
import { AuthProvider, useAuth, useMovieList } from './AuthProvider';

const h = vi.hoisted(() => ({
  EMPTY_LIST: [] as unknown[],
  refresh: vi.fn(),
  unsubscribe: vi.fn(),
  authCb: null as null | ((e: string, s: { user?: { id: string } } | null) => void),
  migrate: vi.fn(),
  reload: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }));
vi.mock('@/lib/store/migrate-favorites', () => ({ migrateLocalFavorites: h.migrate }));
vi.mock('@/lib/store/supabase-movie-list', () => ({
  movieStatusTable: () => ({}),
  createSupabaseMovieListStore: () => ({
    isReady: () => true,
    list: () => h.EMPTY_LIST,
    statusOf: () => null,
    setStatus: () => {},
    lastError: () => null,
    reload: h.reload,
    subscribe: () => () => {},
  }),
}));
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      onAuthStateChange: (cb: typeof h.authCb) => {
        h.authCb = cb;
        return { data: { subscription: { unsubscribe: h.unsubscribe } } };
      },
    },
  }),
}));

const movie = { id: 1, title: 'Filme' } as unknown as Movie;

function Probe() {
  const { user } = useAuth();
  const m = useMovieList();
  return (
    <div>
      <span data-testid="user">{user?.id ?? 'none'}</span>
      <span data-testid="ready">{String(m.ready)}</span>
      <span data-testid="status">{m.statusOf(1) ?? 'null'}</span>
      <span data-testid="want">{m.list('want').length}</span>
      <button onClick={() => m.setStatus(movie, 'want')}>marcar</button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AuthProvider', () => {
  it('sem usuário: user null, lista não pronta e vazia', () => {
    render(
      <AuthProvider user={null} available={false}>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('ready').textContent).toBe('false');
    expect(screen.getByTestId('want').textContent).toBe('0');
  });

  it('com usuário: expõe o store e reage a setStatus', async () => {
    const makeStore = () => createMemoryMovieListStore();
    render(
      <AuthProvider user={{ id: 'u1', email: 'a@b.c' }} available makeStore={makeStore}>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText('marcar');
    await act(async () => {
      fireEvent.click(screen.getByText('marcar'));
    });
    expect(screen.getByTestId('status').textContent).toBe('want');
    expect(screen.getByTestId('want').textContent).toBe('1');
  });

  it('troca de usuário recria o store', async () => {
    const makeStore = vi.fn(() => createMemoryMovieListStore());
    const { rerender } = render(
      <AuthProvider user={{ id: 'u1', email: 'a@b.c' }} available makeStore={makeStore}>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByText('marcar'));
    });
    expect(screen.getByTestId('want').textContent).toBe('1');
    rerender(
      <AuthProvider user={{ id: 'u2', email: 'x@b.c' }} available makeStore={makeStore}>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {});
    expect(makeStore).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('want').textContent).toBe('0');
  });

  it('useMovieList fora do provider lança erro claro', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('precisa estar dentro de <AuthProvider>');
    spy.mockRestore();
  });

  it('factory padrão migra favoritos e recarrega quando migrou > 0', async () => {
    h.migrate.mockResolvedValueOnce(2);
    render(
      <AuthProvider user={{ id: 'u1', email: 'a@b.c' }} available>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {});
    expect(h.migrate).toHaveBeenCalledTimes(1);
    expect(h.reload).toHaveBeenCalledTimes(1);
  });

  it('factory padrão não recarrega quando nada foi migrado', async () => {
    h.migrate.mockResolvedValueOnce(0);
    render(
      <AuthProvider user={{ id: 'u1', email: 'a@b.c' }} available>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {});
    expect(h.migrate).toHaveBeenCalledTimes(1);
    expect(h.reload).not.toHaveBeenCalled();
  });

  it('onAuthStateChange: refresh só se o id difere; desassina ao desmontar', () => {
    const { unmount } = render(
      <AuthProvider
        user={{ id: 'u1', email: 'a@b.c' }}
        available
        makeStore={() => createMemoryMovieListStore()}
      >
        <Probe />
      </AuthProvider>,
    );
    h.authCb!('SIGNED_IN', { user: { id: 'u1' } });
    expect(h.refresh).not.toHaveBeenCalled();
    h.authCb!('SIGNED_OUT', null);
    expect(h.refresh).toHaveBeenCalledTimes(1);
    h.authCb!('SIGNED_IN', { user: { id: 'u2' } });
    expect(h.refresh).toHaveBeenCalledTimes(2);
    unmount();
    expect(h.unsubscribe).toHaveBeenCalled();
  });
});
