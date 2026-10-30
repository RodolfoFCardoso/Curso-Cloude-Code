import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { createMemoryMovieListStore } from '@/lib/store/memory-movie-list';
import type { MovieListError, MovieListStore } from '@/lib/store/types';
import type { Movie } from '@/lib/tmdb/types';
import { MovieStatusButtons } from './MovieStatusButtons';

const h = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push, refresh: h.refresh }),
  usePathname: () => '/filme/12',
}));
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  }),
}));

const movie: Movie = {
  id: 12,
  title: 'Filme',
  year: 2020,
  rating: 7,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
};
const user = { id: 'u1', email: 'a@b.c' };

function stub(ready: boolean, error: MovieListError | null): MovieListStore {
  const empty: Movie[] = [];
  return {
    isReady: () => ready,
    list: () => empty,
    statusOf: () => null,
    setStatus: () => {},
    lastError: () => error,
    reload: async () => {},
    subscribe: () => () => {},
  };
}

async function setup(opts: {
  user?: typeof user | null;
  available?: boolean;
  store?: MovieListStore;
}) {
  const result = render(
    <AuthProvider
      user={opts.user === undefined ? user : opts.user}
      available={opts.available ?? true}
      makeStore={() => opts.store ?? createMemoryMovieListStore()}
    >
      <MovieStatusButtons movie={movie} />
    </AuthProvider>,
  );
  await act(async () => {});
  return result;
}

const want = () => screen.getByRole('button', { name: 'Quero assistir' });
const watched = () => screen.getByRole('button', { name: 'Já assisti' });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MovieStatusButtons', () => {
  it('marca, troca e desmarca', async () => {
    await setup({});
    expect(want()).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(want());
    expect(want()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(watched());
    expect(want()).toHaveAttribute('aria-pressed', 'false');
    expect(watched()).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(watched());
    expect(want()).toHaveAttribute('aria-pressed', 'false');
    expect(watched()).toHaveAttribute('aria-pressed', 'false');
  });

  it('deslogado vai para entrar com voltar', async () => {
    await setup({ user: null });
    fireEvent.click(want());
    expect(h.push).toHaveBeenCalledWith('/entrar?voltar=%2Ffilme%2F12');
  });

  it('desabilitado enquanto carrega', async () => {
    await setup({ store: stub(false, null) });
    expect(want()).toBeDisabled();
    expect(watched()).toBeDisabled();
  });

  it('mostra aviso quando salvar falha', async () => {
    await setup({ store: stub(true, 'save') });
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível salvar, tente de novo.');
  });

  it('Review Focus 3: sessão expirada leva para entrar', async () => {
    await setup({ store: stub(true, 'unauthenticated') });
    expect(h.push).toHaveBeenCalledWith('/entrar?voltar=%2Ffilme%2F12');
  });

  it('some quando o login está indisponível', async () => {
    const { container } = await setup({ available: false, user: null });
    expect(container).toBeEmptyDOMElement();
  });
});
