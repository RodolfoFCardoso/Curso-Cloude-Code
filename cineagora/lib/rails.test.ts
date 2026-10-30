import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchRailItems,
  fetchRailMovies,
  HomeUnavailableError,
  loadHomeRails,
  parseMovieId,
  parseProviderIds,
  parseRailKey,
} from './rails';
import * as service from './tmdb/service';
import { logTmdbError } from './tmdb/errors';
import { EMPTY_PROVIDERS } from './tmdb/providers-mapper';
import type { Movie } from './tmdb/types';

vi.mock('server-only', () => ({}));
vi.mock('./tmdb/service', () => ({
  getTrending: vi.fn(),
  getPopular: vi.fn(),
  getNowPlaying: vi.fn(),
  getByGenre: vi.fn(),
  getGenres: vi.fn(),
  getWatchProviders: vi.fn(),
}));
vi.mock('./tmdb/errors', async (orig) => ({
  ...(await orig<typeof import('./tmdb/errors')>()),
  logTmdbError: vi.fn(),
}));

const s = vi.mocked(service);
const movie = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  year: null,
  rating: null,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('parseRailKey', () => {
  it.each(['trending', 'popular', 'now_playing', 'genre-28'])('aceita %s', (k) => {
    expect(parseRailKey(k)).toBe(k);
  });

  it.each(['genre-xyz', 'genre-', 'genre-0', 'genre-01', 'foo', ''])('rejeita %s', (k) => {
    expect(parseRailKey(k)).toBeNull();
  });
});

describe('parseProviderIds', () => {
  it('ignora lixo e duplicatas', () => {
    expect(parseProviderIds('8,abc,,1899,8')).toEqual([8, 1899]);
    expect(parseProviderIds('0,-3,1.5')).toEqual([]);
    expect(parseProviderIds(null)).toEqual([]);
  });
});

describe('fetchRailMovies', () => {
  it('trilho de gênero filtra na origem', async () => {
    s.getByGenre.mockResolvedValue([movie(1)]);
    expect(await fetchRailMovies('genre-28', [8])).toEqual([movie(1)]);
    expect(s.getByGenre).toHaveBeenCalledWith(28, [8]);
  });

  it('trilhos fixos ignoram provedores na origem', async () => {
    s.getTrending.mockResolvedValue([movie(1)]);
    s.getPopular.mockResolvedValue([movie(2)]);
    s.getNowPlaying.mockResolvedValue([movie(3)]);
    expect(await fetchRailMovies('trending', [8])).toEqual([movie(1)]);
    expect(await fetchRailMovies('popular')).toEqual([movie(2)]);
    expect(await fetchRailMovies('now_playing')).toEqual([movie(3)]);
    expect(s.getTrending).toHaveBeenCalledWith();
  });
});

describe('fetchRailItems', () => {
  it('aplica o filtro com os provedores de cada filme', async () => {
    s.getPopular.mockResolvedValue([movie(1), movie(2)]);
    const netflix = { id: 8, name: 'Netflix', logoUrl: null };
    s.getWatchProviders.mockImplementation(async (id) =>
      id === 1 ? { ...EMPTY_PROVIDERS, subscription: [netflix] } : EMPTY_PROVIDERS,
    );
    expect(await fetchRailItems('popular', [8])).toEqual([{ movie: movie(1), badges: [netflix] }]);
  });
});

describe('loadHomeRails', () => {
  function arrangeAll() {
    s.getTrending.mockResolvedValue([movie(1)]);
    s.getPopular.mockResolvedValue([movie(2)]);
    s.getNowPlaying.mockResolvedValue([movie(3)]);
    s.getGenres.mockResolvedValue([
      { id: 28, name: 'Ação' },
      { id: 35, name: 'Comédia' },
    ]);
    s.getByGenre.mockImplementation(async (id) => [movie(id)]);
  }

  it('ordem: Em alta, Populares, Lançamentos e gêneros na ordem da TMDB', async () => {
    arrangeAll();
    const rails = await loadHomeRails();
    expect(rails.map((r) => [r.key, r.title])).toEqual([
      ['trending', 'Em alta'],
      ['popular', 'Populares'],
      ['now_playing', 'Lançamentos'],
      ['genre-28', 'Ação'],
      ['genre-35', 'Comédia'],
    ]);
    expect(rails[3].movies).toEqual([movie(28)]);
  });

  it('um trilho com falha some e é logado; os outros aparecem', async () => {
    arrangeAll();
    s.getPopular.mockRejectedValue(new Error('fora'));
    const rails = await loadHomeRails();
    expect(rails.map((r) => r.key)).not.toContain('popular');
    expect(rails).toHaveLength(4);
    expect(logTmdbError).toHaveBeenCalled();
  });

  it('sem gêneros mostra só os trilhos fixos', async () => {
    arrangeAll();
    s.getGenres.mockRejectedValue(new Error('fora'));
    expect((await loadHomeRails()).map((r) => r.key)).toEqual([
      'trending',
      'popular',
      'now_playing',
    ]);
  });

  it('trilho vazio é omitido', async () => {
    arrangeAll();
    s.getNowPlaying.mockResolvedValue([]);
    expect((await loadHomeRails()).map((r) => r.key)).not.toContain('now_playing');
  });

  it('tudo falhando lança HomeUnavailableError', async () => {
    const boom = new Error('fora');
    s.getTrending.mockRejectedValue(boom);
    s.getPopular.mockRejectedValue(boom);
    s.getNowPlaying.mockRejectedValue(boom);
    s.getGenres.mockRejectedValue(boom);
    await expect(loadHomeRails()).rejects.toBeInstanceOf(HomeUnavailableError);
  });
});

describe('parseMovieId', () => {
  it('aceita inteiros positivos', () => {
    expect(parseMovieId('550')).toBe(550);
  });

  it.each(['abc', '0', '-3', '1.5', '', '550abc'])('rejeita %s', (s) => {
    expect(parseMovieId(s)).toBeNull();
  });
});
