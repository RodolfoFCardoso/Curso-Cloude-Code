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
  getSession: vi.fn(),
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
      getSession: h.getSession,
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
    // O browser client emite SIGNED_IN ao ler a sessão (ex.: login em outra aba); o Sair é
    // server action e não emite SIGNED_OUT aqui, por isso o foco/visibilidade é testado abaixo.
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
    h.authCb!('SIGNED_IN', { user: { id: 'u2' } });
    expect(h.refresh).toHaveBeenCalledTimes(1);
    unmount();
    expect(h.unsubscribe).toHaveBeenCalled();
  });

  function renderLoggedIn() {
    return render(
      <AuthProvider
        user={{ id: 'u1', email: 'a@b.c' }}
        available
        makeStore={() => createMemoryMovieListStore()}
      >
        <Probe />
      </AuthProvider>,
    );
  }

  it('logout em outra aba: ao voltar o foco sem sessão, faz refresh', async () => {
    h.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderLoggedIn();
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(h.getSession).toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });

  it('aba volta a ficar visível com a mesma sessão: não faz refresh', async () => {
    h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    renderLoggedIn();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(h.getSession).toHaveBeenCalled();
    expect(h.refresh).not.toHaveBeenCalled();
  });

  it('visibilitychange para oculta não consulta a sessão; desmontar remove os listeners', async () => {
    h.getSession.mockResolvedValue({ data: { session: null }, error: null });
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const { unmount } = renderLoggedIn();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(h.getSession).not.toHaveBeenCalled();
    visibility.mockRestore();
    unmount();
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(h.getSession).not.toHaveBeenCalled();
  });

  it('login indisponível não escuta foco', async () => {
    render(
      <AuthProvider user={null} available={false}>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(h.getSession).not.toHaveBeenCalled();
  });
});
