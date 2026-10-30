import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { createMemoryMovieListStore } from '@/lib/store/memory-movie-list';
import type { Movie } from '@/lib/tmdb/types';
import { HomeTabs } from './HomeTabs';

const h = vi.hoisted(() => ({ search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(h.search),
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

async function setup(search: string, u: typeof user | null = user) {
  h.search = search;
  const store = createMemoryMovieListStore();
  store.setStatus(mk(1), 'want');
  store.setStatus(mk(2), 'want');
  store.setStatus(mk(3), 'watched');
  render(
    <AuthProvider user={u} available makeStore={() => store}>
      <HomeTabs>
        <p>trilhos</p>
      </HomeTabs>
    </AuthProvider>,
  );
  await act(async () => {});
}

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HomeTabs', () => {
  it('abre na aba da URL e mantém Descobrir montado porém oculto', async () => {
    await setup('?aba=ja-assisti');
    expect(screen.getByRole('tab', { name: /Já assisti/ })).toHaveAttribute('aria-selected', 'true');
    const rails = screen.getByText('trilhos');
    expect(rails.closest('[role="tabpanel"]')).toHaveAttribute('hidden');
  });

  it('clicar troca a URL sem perder outros parâmetros', async () => {
    await setup('?aviso=x');
    fireEvent.click(screen.getByRole('tab', { name: /Quero assistir/ }));
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?aviso=x&aba=quero-assistir');
  });

  it('voltar para Descobrir remove o parâmetro', async () => {
    await setup('?aviso=x&aba=ja-assisti');
    fireEvent.click(screen.getByRole('tab', { name: 'Descobrir' }));
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?aviso=x');
  });

  it('setas e Home/End navegam', async () => {
    await setup('');
    const descobrir = screen.getByRole('tab', { name: 'Descobrir' });
    descobrir.focus();
    fireEvent.keyDown(descobrir, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /Já assisti/ })).toHaveFocus();
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?aba=ja-assisti');
    fireEvent.keyDown(screen.getByRole('tab', { name: /Já assisti/ }), { key: 'Home' });
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/');
    expect(screen.getByRole('tab', { name: 'Descobrir' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Descobrir' }), { key: 'End' });
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/?aba=ja-assisti');
  });

  it('só a aba ativa tem tabIndex 0', async () => {
    await setup('?aba=quero-assistir');
    expect(screen.getByRole('tab', { name: /Quero assistir/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Descobrir' })).toHaveAttribute('tabindex', '-1');
  });

  it('mostra contagens só para logado e pronto', async () => {
    await setup('');
    expect(screen.getByRole('tab', { name: 'Quero assistir · 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Já assisti · 1' })).toBeInTheDocument();
  });

  it('deslogado não mostra contagens', async () => {
    await setup('', null);
    expect(screen.getByRole('tab', { name: 'Quero assistir' })).toBeInTheDocument();
  });
});
