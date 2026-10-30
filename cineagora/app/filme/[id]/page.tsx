import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MovieStatusButtons } from '@/components/MovieStatusButtons';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
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

const sectionTitle =
  'font-display mb-4 text-[1.75rem] leading-none font-extrabold text-tela sm:text-[2rem]';

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
      <header className="px-4 pt-20 sm:px-10 sm:pt-24">
        {movie.backdropUrl ? <Screen src={movie.backdropUrl} priority /> : <div className="h-16" />}
        <div className="relative px-1 sm:px-6">
          <h1
            className={`font-display text-[clamp(3rem,7.5vw,7.25rem)] leading-[0.84] font-black tracking-[-0.01em] text-balance text-tela uppercase drop-shadow-[0_6px_24px_rgba(10,4,7,0.8)] ${
              movie.backdropUrl ? '-mt-[0.34em]' : ''
            }`}
          >
            {movie.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tela/85 tabular-nums">
              {rating && <span className="font-semibold text-projetor">★ {rating}</span>}
              {facts.map((f) => (
                <span key={String(f)}>{f}</span>
              ))}
            </p>
            <MovieStatusButtons
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
          </div>
        </div>
      </header>

      <div className="mt-14 grid grid-cols-1 gap-12 px-4 sm:px-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-md bg-poltrona shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] ring-1 ring-tela/10 sm:w-48">
              {movie.posterUrl ? (
                <Image
                  src={movie.posterUrl}
                  alt={`Pôster de ${movie.title}`}
                  fill
                  sizes="192px"
                  className="object-cover"
                />
              ) : (
                <div className="font-display flex h-full items-center justify-center p-3 text-center text-2xl leading-none font-extrabold text-tela/80">
                  {movie.title}
                </div>
              )}
            </div>
            <div>
              <h2 className={sectionTitle}>Sinopse</h2>
              <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-tela/85">
                {movie.overview || 'Sinopse não disponível.'}
              </p>
            </div>
          </div>

          {movie.trailerYoutubeKey && (
            <section aria-label="Trailer">
              <h2 className={sectionTitle}>Trailer</h2>
              <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-md bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] ring-1 ring-tela/10">
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
            <section aria-label="Elenco principal">
              <h2 className={sectionTitle}>Elenco principal</h2>
              <ul className="trilho -mx-4 flex gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {movie.cast.map((c) => (
                  <li key={c.id} className="w-24 shrink-0">
                    <div className="relative h-32 w-24 overflow-hidden rounded-md bg-poltrona ring-1 ring-tela/5">
                      {c.profileUrl && (
                        <Image
                          src={c.profileUrl}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-snug font-medium text-tela">{c.name}</p>
                    <p className="text-xs leading-snug text-penumbra">{c.character}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="order-first lg:sticky lg:top-24 lg:order-none lg:self-start">
          <WhereToWatch providers={providers} />
        </aside>
      </div>

      {movie.similar.length > 0 && (
        <div className="mt-14">
          <Row
            title="Filmes parecidos"
            items={movie.similar.map((m) => ({ movie: m, badges: [] }))}
          />
        </div>
      )}
    </article>
  );
}
