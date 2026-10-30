import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TmdbError } from '@/lib/tmdb/errors';
import * as service from '@/lib/tmdb/service';
import type { Movie } from '@/lib/tmdb/types';
import SearchPage from './page';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/tmdb/service', () => ({ searchMovies: vi.fn() }));
vi.mock('@/lib/tmdb/errors', async (orig) => ({
  ...(await orig<typeof import('@/lib/tmdb/errors')>()),
  logTmdbError: vi.fn(),
}));

const searchMovies = vi.mocked(service.searchMovies);
const movie = (id: number): Movie => ({
  id,
  title: `Matrix ${id}`,
  year: 1999,
  rating: 8,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});

async function renderSearch(q?: string | string[]) {
  const props = { searchParams: Promise.resolve(q === undefined ? {} : { q }) };
  render(await SearchPage(props as Parameters<typeof SearchPage>[0]));
}

beforeEach(() => {
  searchMovies.mockReset();
});

describe('/busca', () => {
  it.each([undefined, '', '   '])('termo vazio (%s) pede um termo sem chamar a TMDB', async (q) => {
    await renderSearch(q);
    expect(screen.getByText('Digite o nome de um filme para buscar.')).toBeInTheDocument();
    expect(searchMovies).not.toHaveBeenCalled();
  });

  it('mostra uma grade com os resultados', async () => {
    searchMovies.mockResolvedValue([movie(1), movie(2), movie(3)]);
    await renderSearch('matrix');
    expect(screen.getAllByRole('link', { name: /Matrix/ })).toHaveLength(3);
    expect(searchMovies).toHaveBeenCalledWith('matrix');
    expect(screen.getByRole('searchbox', { name: 'Buscar filmes' })).toHaveValue('matrix');
  });

  it('sem resultados sugere outro termo', async () => {
    searchMovies.mockResolvedValue([]);
    await renderSearch('xyzqwe');
    expect(
      screen.getByText('Nenhum filme encontrado para "xyzqwe". Tente outro termo.'),
    ).toBeInTheDocument();
  });

  it('erro da TMDB mostra mensagem amigável', async () => {
    searchMovies.mockRejectedValue(new TmdbError('server', '/search/movie', 'x', 500));
    await renderSearch('matrix');
    expect(
      screen.getByText('A busca está indisponível agora. Tente novamente em instantes.'),
    ).toBeInTheDocument();
  });

  it('q repetido usa o primeiro', async () => {
    searchMovies.mockResolvedValue([]);
    await renderSearch(['a', 'b']);
    expect(searchMovies).toHaveBeenCalledWith('a');
  });
});
