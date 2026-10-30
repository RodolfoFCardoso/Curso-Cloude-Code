import { imageUrl } from './images';
import type { RawGenreList, RawMovie, RawMovieDetails, RawMovieList, RawVideo } from './raw';
import type { CastMember, Genre, Movie, MovieDetails } from './types';

const CAST_LIMIT = 10;
const SIMILAR_LIMIT = 12;

function parseYear(date: string | null | undefined): number | null {
  const year = Number.parseInt((date ?? '').slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function parseRating(average: number | null | undefined, count: number | null | undefined) {
  if (!count || average == null) return null;
  return Math.round(average * 10) / 10;
}

export function mapMovie(raw: RawMovie): Movie {
  return {
    id: raw.id,
    title: raw.title ?? '',
    year: parseYear(raw.release_date),
    rating: parseRating(raw.vote_average, raw.vote_count),
    posterUrl: imageUrl(raw.poster_path, 'w342'),
    backdropUrl: imageUrl(raw.backdrop_path, 'w1280'),
    genreIds: raw.genre_ids ?? [],
  };
}

export function mapMovieList(raw: RawMovieList): Movie[] {
  return (raw.results ?? []).map(mapMovie);
}

export function mapGenres(raw: RawGenreList): Genre[] {
  return (raw.genres ?? []).map(({ id, name }) => ({ id, name }));
}

function pickTrailer(videos: RawVideo[]): string | null {
  const trailers = videos.filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  return (trailers.find((v) => v.iso_639_1 === 'pt') ?? trailers[0])?.key ?? null;
}

export function mapMovieDetails(raw: RawMovieDetails): MovieDetails {
  const cast: CastMember[] = [...(raw.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, CAST_LIMIT)
    .map((c) => ({
      id: c.id,
      name: c.name ?? '',
      character: c.character ?? '',
      profileUrl: imageUrl(c.profile_path, 'w185'),
    }));

  return {
    ...mapMovie(raw),
    overview: raw.overview ?? '',
    runtimeMinutes: raw.runtime || null,
    genres: mapGenres({ genres: raw.genres }),
    trailerYoutubeKey: pickTrailer(raw.videos?.results ?? []),
    cast,
    similar: mapMovieList(raw.similar ?? {}).slice(0, SIMILAR_LIMIT),
  };
}
