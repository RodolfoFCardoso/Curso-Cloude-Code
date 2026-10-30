import { beforeEach, describe, expect, it, vi } from 'vitest';
import detailsFixture from './__fixtures__/movie-details.json';
import genresFixture from './__fixtures__/genres.json';
import listFixture from './__fixtures__/movie-list.json';
import providerListFixture from './__fixtures__/provider-list.json';
import watchFixture from './__fixtures__/watch-providers.json';
import { tmdbFetch } from './client';
import {
  getAvailableProviders,
  getByGenre,
  getGenres,
  getMovieDetails,
  getNowPlaying,
  getPopular,
  getTrending,
  getWatchProviders,
  searchMovies,
} from './service';

vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ tmdbFetch: vi.fn() }));

const fetchMock = vi.mocked(tmdbFetch);

beforeEach(() => {
  fetchMock.mockReset();
});

function lastCall() {
  const [path, params, revalidate] = fetchMock.mock.calls.at(-1)!;
  return { path, params, revalidate };
}

describe('listas de filmes', () => {
  beforeEach(() => fetchMock.mockResolvedValue(listFixture));

  it('getTrending usa /trending/movie/week e cache de 3h', async () => {
    const movies = await getTrending();
    expect(movies.map((m) => m.id)).toEqual([550, 1001, 1002]);
    expect(lastCall()).toEqual({ path: '/trending/movie/week', params: {}, revalidate: 10800 });
  });

  it('getPopular usa region=BR', async () => {
    await getPopular();
    expect(lastCall()).toEqual({
      path: '/movie/popular',
      params: { region: 'BR' },
      revalidate: 10800,
    });
  });

  it('getNowPlaying usa region=BR', async () => {
    await getNowPlaying();
    expect(lastCall()).toEqual({
      path: '/movie/now_playing',
      params: { region: 'BR' },
      revalidate: 10800,
    });
  });

  it('getByGenre sem provedores', async () => {
    await getByGenre(28);
    expect(lastCall()).toEqual({
      path: '/discover/movie',
      params: { with_genres: 28, sort_by: 'popularity.desc', include_adult: 'false' },
      revalidate: 10800,
    });
  });

  it('getByGenre com provedores filtra na origem', async () => {
    await getByGenre(28, [8, 1899]);
    expect(lastCall().params).toEqual({
      with_genres: 28,
      sort_by: 'popularity.desc',
      include_adult: 'false',
      with_watch_providers: '8|1899',
      watch_region: 'BR',
      with_watch_monetization_types: 'flatrate|free|ads',
    });
  });

  it('getByGenre com lista vazia de provedores não filtra', async () => {
    await getByGenre(28, []);
    expect(lastCall().params).not.toHaveProperty('with_watch_providers');
  });
});

describe('searchMovies', () => {
  it('termo vazio ou só espaços não chama a TMDB', async () => {
    expect(await searchMovies('')).toEqual([]);
    expect(await searchMovies('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('apara o termo e manda caracteres especiais intactos', async () => {
    fetchMock.mockResolvedValue(listFixture);
    await searchMovies('  Amélie & #1 ');
    expect(lastCall()).toEqual({
      path: '/search/movie',
      params: { query: 'Amélie & #1', include_adult: 'false', region: 'BR' },
      revalidate: 10800,
    });
  });
});

describe('detalhe, gêneros e provedores', () => {
  it('getMovieDetails anexa videos, credits e similar', async () => {
    fetchMock.mockResolvedValue(detailsFixture);
    const d = await getMovieDetails(550);
    expect(d.trailerYoutubeKey).toBe('pt-key');
    expect(lastCall()).toEqual({
      path: '/movie/550',
      params: { append_to_response: 'videos,credits,similar', include_video_language: 'pt,en' },
      revalidate: 86400,
    });
  });

  it('getGenres usa cache de 7 dias', async () => {
    fetchMock.mockResolvedValue(genresFixture);
    expect(await getGenres()).toHaveLength(2);
    expect(lastCall()).toEqual({ path: '/genre/movie/list', params: {}, revalidate: 604800 });
  });

  it('getWatchProviders devolve o BR mapeado', async () => {
    fetchMock.mockResolvedValue(watchFixture);
    const p = await getWatchProviders(550);
    expect(p.subscription.map((s) => s.id)).toEqual([1899, 8]);
    expect(lastCall()).toEqual({
      path: '/movie/550/watch/providers',
      params: {},
      revalidate: 86400,
    });
  });

  it('getAvailableProviders lista os provedores do BR', async () => {
    fetchMock.mockResolvedValue(providerListFixture);
    expect((await getAvailableProviders()).map((p) => p.id)).toEqual([8, 9999, 337]);
    expect(lastCall()).toEqual({
      path: '/watch/providers/movie',
      params: { watch_region: 'BR' },
      revalidate: 604800,
    });
  });

  it('erros do cliente sobem sem tradução', async () => {
    const err = new Error('boom');
    fetchMock.mockRejectedValue(err);
    await expect(getMovieDetails(1)).rejects.toBe(err);
  });
});
