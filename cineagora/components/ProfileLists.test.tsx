import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { createMemoryMovieListStore } from '@/lib/store/memory-movie-list';
import type { Movie } from '@/lib/tmdb/types';
import { MyListRow } from './MyListRow';
import { ProfileLists } from './ProfileLists';

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

async function setup(ui: React.ReactNode, filled = true) {
  const store = createMemoryMovieListStore();
  if (filled) {
    store.setStatus(mk(1), 'want');
    store.setStatus(mk(2), 'want');
    store.setStatus(mk(3), 'watched');
  }
  render(
    <AuthProvider user={user} available makeStore={() => store}>
      {ui}
    </AuthProvider>,
  );
  await act(async () => {});
}

afterEach(cleanup);

describe('ProfileLists', () => {
  it('marca a lista ativa, mostra contagens e a grade dela', async () => {
    await setup(<ProfileLists active="ja-assisti" />);
    const nav = screen.getByRole('navigation', { name: 'Suas listas' });
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Já assisti1');
    expect(screen.getByRole('link', { name: /^Quero assistir\s*2$/ })).toHaveAttribute(
      'href',
      '/perfil?lista=quero-assistir',
    );
    expect(screen.getByRole('link', { name: /Filme 3/ })).toHaveAttribute('href', '/filme/3');
    expect(screen.queryByRole('link', { name: /Filme 1/ })).not.toBeInTheDocument();
  });
});

describe('MyListRow', () => {
  it('mostra o Quero assistir como trilho com link para a lista completa', async () => {
    await setup(<MyListRow />);
    expect(screen.getByRole('region', { name: 'Quero assistir' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver lista completa' })).toHaveAttribute(
      'href',
      '/perfil?lista=quero-assistir',
    );
  });

  it('lista vazia não mostra o trilho', async () => {
    await setup(<MyListRow />, false);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
