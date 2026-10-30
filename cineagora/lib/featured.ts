import 'server-only';
import { logTmdbError } from './tmdb/errors';
import { getMovieDetails, getTrending, getWatchProviders } from './tmdb/service';
import type { Movie, WatchProvider } from './tmdb/types';

export type FeaturedMovie = {
  movie: Movie;
  overview: string;
  runtimeMinutes: number | null;
  genres: string[];
  /** Assinatura ou grátis; se não houver, alugar/comprar. */
  providers: WatchProvider[];
  providersKind: 'stream' | 'rent' | 'none';
};

const FEATURED_COUNT = 5;

function uniqueById(list: WatchProvider[]): WatchProvider[] {
  return [...new Map(list.map((p) => [p.id, p])).values()];
}

/** Filmes em alta com backdrop, para o destaque da home. Falha → lista vazia (home segue). */
export async function loadFeatured(): Promise<FeaturedMovie[]> {
  let trending: Movie[];
  try {
    trending = await getTrending();
  } catch (err) {
    logTmdbError(err, { parte: 'destaque' });
    return [];
  }

  const picks = trending.filter((m) => m.backdropUrl).slice(0, FEATURED_COUNT);
  const results = await Promise.allSettled(
    picks.map(async (movie): Promise<FeaturedMovie> => {
      const [details, providers] = await Promise.all([
        getMovieDetails(movie.id),
        getWatchProviders(movie.id).catch(() => null),
      ]);
      const stream = uniqueById([...(providers?.subscription ?? []), ...(providers?.free ?? [])]);
      const rent = uniqueById([...(providers?.rent ?? []), ...(providers?.buy ?? [])]);
      return {
        movie,
        overview: details.overview,
        runtimeMinutes: details.runtimeMinutes,
        genres: details.genres.map((g) => g.name),
        providers: stream.length > 0 ? stream : rent,
        providersKind: stream.length > 0 ? 'stream' : rent.length > 0 ? 'rent' : 'none',
      };
    }),
  );

  return results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return [r.value];
    logTmdbError(r.reason, { parte: 'destaque', movieId: picks[i].id });
    return [];
  });
}
