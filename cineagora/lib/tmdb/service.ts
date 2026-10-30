import 'server-only';
import { tmdbFetch } from './client';
import { mapGenres, mapMovieDetails, mapMovieList } from './mappers';
import { mapProviderList, mapWatchProviders } from './providers-mapper';
import type {
  RawGenreList,
  RawMovieDetails,
  RawMovieList,
  RawProviderList,
  RawWatchProviders,
} from './raw';
import type { Genre, Movie, MovieDetails, WatchProvider, WatchProviders } from './types';

// Único ponto do app que conhece os endpoints da TMDB.

const RAILS_TTL = 10800; // 3h
const DETAILS_TTL = 86400; // 1 dia
const STATIC_TTL = 604800; // 7 dias

const REGION = 'BR';

async function movieList(path: string, params: Record<string, string | number> = {}) {
  return mapMovieList(await tmdbFetch<RawMovieList>(path, params, RAILS_TTL));
}

export function getTrending(): Promise<Movie[]> {
  return movieList('/trending/movie/week');
}

export function getPopular(): Promise<Movie[]> {
  return movieList('/movie/popular', { region: REGION });
}

export function getNowPlaying(): Promise<Movie[]> {
  return movieList('/movie/now_playing', { region: REGION });
}

export function getByGenre(genreId: number, providerIds: number[] = []): Promise<Movie[]> {
  const params: Record<string, string | number> = {
    with_genres: genreId,
    sort_by: 'popularity.desc',
    include_adult: 'false',
  };
  if (providerIds.length > 0) {
    params.with_watch_providers = providerIds.join('|');
    params.watch_region = REGION;
    params.with_watch_monetization_types = 'flatrate|free|ads';
  }
  return movieList('/discover/movie', params);
}

export async function getGenres(): Promise<Genre[]> {
  return mapGenres(await tmdbFetch<RawGenreList>('/genre/movie/list', {}, STATIC_TTL));
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  const raw = await tmdbFetch<RawMovieDetails>(
    `/movie/${id}`,
    { append_to_response: 'videos,credits,similar', include_video_language: 'pt,en' },
    DETAILS_TTL,
  );
  return mapMovieDetails(raw);
}

export async function getWatchProviders(id: number): Promise<WatchProviders> {
  const raw = await tmdbFetch<RawWatchProviders>(`/movie/${id}/watch/providers`, {}, DETAILS_TTL);
  return mapWatchProviders(raw, REGION);
}

export async function searchMovies(query: string): Promise<Movie[]> {
  const q = query.trim();
  if (!q) return [];
  return mapMovieList(
    await tmdbFetch<RawMovieList>(
      '/search/movie',
      { query: q, include_adult: 'false', region: REGION },
      RAILS_TTL,
    ),
  );
}

export async function getAvailableProviders(): Promise<WatchProvider[]> {
  const raw = await tmdbFetch<RawProviderList>(
    '/watch/providers/movie',
    { watch_region: REGION },
    STATIC_TTL,
  );
  return mapProviderList(raw, REGION);
}
