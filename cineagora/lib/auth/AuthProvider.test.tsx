import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Movie } from '../tmdb/types';
import { createMemoryMovieListStore } from '../store/memory-movie-list';
import { AuthProvider, useAuth, useMovieList } from './AuthProvider';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
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

afterEach(cleanup);

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
    await act(async () => {
      fireEvent.click(screen.getByText('marcar'));
    });
    expect(screen.getByTestId('want').textContent).toBe('1');
    rerender(
      <AuthProvider user={{ id: 'u2', email: 'x@b.c' }} available makeStore={makeStore}>
        <Probe />
      </AuthProvider>,
    );
    expect(makeStore).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('want').textContent).toBe('0');
  });

  it('useMovieList fora do provider lança erro claro', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('precisa estar dentro de <AuthProvider>');
    spy.mockRestore();
  });
});
