import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import detailsFixture from '@/lib/tmdb/__fixtures__/movie-details.json';
import { TmdbError } from '@/lib/tmdb/errors';
import { mapMovieDetails } from '@/lib/tmdb/mappers';
import { EMPTY_PROVIDERS } from '@/lib/tmdb/providers-mapper';
import type { RawMovieDetails } from '@/lib/tmdb/raw';
import * as service from '@/lib/tmdb/service';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { createLocalFavoritesStore } from '@/lib/store/local-favorites';
import { createLocalPreferencesStore } from '@/lib/store/local-preferences';
import Page from './page';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/lib/tmdb/service', () => ({
  getMovieDetails: vi.fn(),
  getWatchProviders: vi.fn(),
  // usados só no carregamento de @/lib/rails (parseMovieId)
  getTrending: vi.fn(),
  getPopular: vi.fn(),
  getNowPlaying: vi.fn(),
  getByGenre: vi.fn(),
  getGenres: vi.fn(),
}));
vi.mock('@/lib/tmdb/errors', async (orig) => ({
  ...(await orig<typeof import('@/lib/tmdb/errors')>()),
  logTmdbError: vi.fn(),
}));

const s = vi.mocked(service);
const details = mapMovieDetails(detailsFixture as RawMovieDetails);

function renderPage(id: string) {
  return Page({ params: Promise.resolve({ id }) } as Parameters<typeof Page>[0]).then((ui) =>
    render(
      <PreferencesProvider
        store={createLocalPreferencesStore(null)}
        favoritesStore={createLocalFavoritesStore(null)}
      >
        {ui}
      </PreferencesProvider>,
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  s.getMovieDetails.mockResolvedValue(details);
  s.getWatchProviders.mockResolvedValue({
    ...EMPTY_PROVIDERS,
    subscription: [{ id: 8, name: 'Netflix', logoUrl: 'https://x/n.jpg' }],
  });
});

describe('/filme/[id]', () => {
  it('mostra detalhe, onde assistir, trailer, elenco e parecidos', async () => {
    await renderPage('550');
    expect(screen.getByRole('heading', { level: 1, name: 'Clube da Luta' })).toBeInTheDocument();
    expect(screen.getByText('2h 19min')).toBeInTheDocument();
    expect(screen.getByText('★ 8,4')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Onde assistir no Brasil' })).toBeInTheDocument();
    expect(screen.getByTitle('Trailer de Clube da Luta')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/pt-key',
    );
    expect(screen.getByText('Ator 0')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Filmes parecidos' })).toBeInTheDocument();
    expect(s.getMovieDetails).toHaveBeenCalledWith(550);
    expect(screen.getByRole('button', { name: 'Adicionar à minha lista' })).toBeInTheDocument();
  });

  it.each(['abc', '0', '-3', '1.5'])('id inválido (%s) vira 404 sem chamar a TMDB', async (id) => {
    await expect(renderPage(id)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(s.getMovieDetails).not.toHaveBeenCalled();
  });

  it('filme inexistente na TMDB vira 404', async () => {
    s.getMovieDetails.mockRejectedValue(new TmdbError('not_found', '/movie/9', 'x', 404));
    await expect(renderPage('9')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('outros erros sobem para a página de erro', async () => {
    const err = new TmdbError('server', '/movie/9', 'x', 500);
    s.getMovieDetails.mockRejectedValue(err);
    await expect(renderPage('9')).rejects.toBe(err);
  });

  it('falha em onde assistir não derruba a página', async () => {
    s.getWatchProviders.mockRejectedValue(new TmdbError('server', '/x', 'x', 500));
    await renderPage('550');
    expect(
      screen.getByText('Sem informação de onde assistir no Brasil no momento.'),
    ).toBeInTheDocument();
  });

  it('sem sinopse, trailer ou parecidos', async () => {
    s.getMovieDetails.mockResolvedValue({
      ...details,
      overview: '',
      trailerYoutubeKey: null,
      similar: [],
    });
    await renderPage('550');
    expect(screen.getByText('Sinopse não disponível.')).toBeInTheDocument();
    expect(screen.queryByTitle(/Trailer/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Filmes parecidos' })).not.toBeInTheDocument();
  });
});
