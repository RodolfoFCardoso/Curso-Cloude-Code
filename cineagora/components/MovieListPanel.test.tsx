import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { createMemoryMovieListStore } from '@/lib/store/memory-movie-list';
import type { MovieListError, MovieListStore, MovieStatus } from '@/lib/store/types';
import type { Movie } from '@/lib/tmdb/types';
import { MovieListPanel } from './MovieListPanel';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => ({
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
  }),
}));

const mk = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  year: 2020,
  rating: 7,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});
const user = { id: 'u1', email: 'a@b.c' };

function stub(opts: {
  ready: boolean;
  error?: MovieListError | null;
  lists?: Partial<Record<MovieStatus, Movie[]>>;
  reload?: () => Promise<void>;
}): MovieListStore {
  const empty: Movie[] = [];
  return {
    isReady: () => opts.ready,
    list: (s) => opts.lists?.[s] ?? empty,
    statusOf: () => null,
    setStatus: () => {},
    lastError: () => opts.error ?? null,
    reload: opts.reload ?? (async () => {}),
    subscribe: () => () => {},
  };
}

async function setup(status: MovieStatus, store?: MovieListStore, u: typeof user | null = user) {
  render(
    <AuthProvider user={u} available makeStore={() => store ?? createMemoryMovieListStore()}>
      <MovieListPanel status={status} />
    </AuthProvider>,
  );
  await act(async () => {});
}

afterEach(cleanup);

describe('MovieListPanel', () => {
  it('deslogado convida para entrar com voltar da aba', async () => {
    await setup('want', undefined, null);
    expect(screen.getByText('Entre para montar suas listas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?voltar=%2F%3Faba%3Dquero-assistir',
    );
  });

  it('voltar usa a aba Já assisti', async () => {
    await setup('watched', undefined, null);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?voltar=%2F%3Faba%3Dja-assisti',
    );
  });

  it('carregando mostra skeletons', async () => {
    await setup('want', stub({ ready: false }));
    expect(screen.getAllByTestId('list-skeleton')).toHaveLength(12);
  });

  it('erro de carga com tentar de novo chama reload', async () => {
    const reload = vi.fn(async () => {});
    await setup('want', stub({ ready: true, error: 'load', reload }));
    expect(screen.getByText('Não foi possível carregar suas listas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('vazio mostra a orientação', async () => {
    await setup('want', stub({ ready: true }));
    expect(screen.getByText('Nada aqui ainda.')).toBeInTheDocument();
    expect(screen.getByText('Abra um filme e marque Quero assistir.')).toBeInTheDocument();
  });

  it('lista os filmes do status, mais recente primeiro', async () => {
    await setup(
      'want',
      stub({ ready: true, lists: { want: [mk(2), mk(1)], watched: [mk(3)] } }),
    );
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/filme/2', '/filme/1']);
  });
});
