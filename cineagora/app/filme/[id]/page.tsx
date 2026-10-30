import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FavoriteButton } from '@/components/FavoriteButton';
import { Row } from '@/components/Row';
import { WhereToWatch } from '@/components/WhereToWatch';
import { formatRating, formatRuntime } from '@/lib/format';
import { parseMovieId } from '@/lib/rails';
import { logTmdbError, TmdbError } from '@/lib/tmdb/errors';
import { EMPTY_PROVIDERS } from '@/lib/tmdb/providers-mapper';
import { getMovieDetails, getWatchProviders } from '@/lib/tmdb/service';
import type { MovieDetails } from '@/lib/tmdb/types';

type Props = PageProps<'/filme/[id]'>;

async function loadDetails(id: number): Promise<MovieDetails> {
  try {
    return await getMovieDetails(id);
  } catch (err) {
    if (err instanceof TmdbError && err.kind === 'not_found') notFound();
    logTmdbError(err, { movieId: id });
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseMovieId((await params).id);
  if (!id) return {};
  try {
    const movie = await getMovieDetails(id);
    return {
      title: movie.title,
      description: movie.overview || undefined,
      openGraph: movie.posterUrl ? { images: [movie.posterUrl] } : undefined,
    };
  } catch {
    return {};
  }
}

export default async function MoviePage({ params }: Props) {
  const id = parseMovieId((await params).id);
  if (!id) notFound();

  const [movie, providers] = await Promise.all([
    loadDetails(id),
    getWatchProviders(id).catch((err) => {
      logTmdbError(err, { movieId: id, parte: 'watch-providers' });
      return EMPTY_PROVIDERS;
    }),
  ]);

  const rating = formatRating(movie.rating);
  const runtime = formatRuntime(movie.runtimeMinutes);
  const facts = [movie.year, runtime, movie.genres.map((g) => g.name).join(', ')].filter(Boolean);

  return (
    <article>
      <div className="relative h-56 w-full overflow-hidden sm:h-80">
        {movie.backdropUrl && (
          <Image src={movie.backdropUrl} alt="" fill priority className="object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      <div className="relative -mt-28 flex flex-col gap-6 px-4 sm:-mt-40 sm:flex-row sm:px-8">
        <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl bg-zinc-800 shadow-2xl ring-1 ring-white/10 sm:w-56">
          {movie.posterUrl ? (
            <Image
              src={movie.posterUrl}
              alt={`Pôster de ${movie.title}`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-zinc-400">
              {movie.title}
            </div>
          )}
        </div>

        <div className="flex max-w-3xl flex-col gap-4 sm:pt-24">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{movie.title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            {rating && <span className="font-semibold text-amber-400">★ {rating}</span>}
            {facts.map((f) => (
              <span key={String(f)}>{f}</span>
            ))}
          </p>
          <p className="leading-relaxed text-zinc-300">
            {movie.overview || 'Sinopse não disponível.'}
          </p>
          <FavoriteButton
            movie={{
              id: movie.id,
              title: movie.title,
              year: movie.year,
              rating: movie.rating,
              posterUrl: movie.posterUrl,
              backdropUrl: movie.backdropUrl,
              genreIds: movie.genreIds,
            }}
          />
          <WhereToWatch providers={providers} />
        </div>
      </div>

      {movie.trailerYoutubeKey && (
        <section aria-label="Trailer" className="mt-10 px-4 sm:px-8">
          <h2 className="mb-3 text-lg font-semibold">Trailer</h2>
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeKey}`}
              title={`Trailer de ${movie.title}`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {movie.cast.length > 0 && (
        <section aria-label="Elenco principal" className="mt-10 px-4 sm:px-8">
          <h2 className="mb-3 text-lg font-semibold">Elenco principal</h2>
          <ul className="flex gap-4 overflow-x-auto pb-2">
            {movie.cast.map((c) => (
              <li key={c.id} className="w-24 shrink-0 text-center">
                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full bg-zinc-800">
                  {c.profileUrl && (
                    <Image src={c.profileUrl} alt="" fill sizes="96px" className="object-cover" />
                  )}
                </div>
                <p className="mt-2 text-xs font-medium text-zinc-100">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.character}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {movie.similar.length > 0 && (
        <div className="mt-6">
          <Row
            title="Filmes parecidos"
            items={movie.similar.map((m) => ({ movie: m, badges: [] }))}
          />
        </div>
      )}
    </article>
  );
}
