import Image from 'next/image';
import Link from 'next/link';
import { formatRating } from '@/lib/format';
import type { Movie, WatchProvider } from '@/lib/tmdb/types';
import { ProviderBadge } from './ProviderBadge';

export function MovieCard({
  movie,
  badges = [],
  fluid = false,
}: {
  movie: Movie;
  badges?: WatchProvider[];
  /** Ocupa a largura do container (grade) em vez da largura fixa do trilho. */
  fluid?: boolean;
}) {
  const rating = formatRating(movie.rating);
  // Card horizontal: prefere a cena do filme; sem ela, o pôster recortado pelo alto.
  const src = movie.backdropUrl ?? movie.posterUrl;
  return (
    <Link
      href={`/filme/${movie.id}`}
      className={`group block rounded-[4px] focus-visible:outline-none ${
        fluid ? 'w-full' : 'w-60 shrink-0 snap-start sm:w-72 lg:w-80'
      }`}
    >
      <div className="relative aspect-video overflow-hidden rounded-[4px] bg-poltrona ring-1 ring-tela/5 transition duration-300 ease-out group-hover:z-10 group-hover:scale-[1.04] group-hover:ring-2 group-hover:ring-folha group-focus-visible:scale-[1.04] group-focus-visible:ring-2 group-focus-visible:ring-folha motion-reduce:transform-none">
        {src ? (
          <>
            <Image
              src={src}
              alt=""
              fill
              sizes={fluid ? '(min-width: 1024px) 25vw, 50vw' : '320px'}
              className={`object-cover ${movie.backdropUrl ? '' : 'object-[50%_20%]'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <p className="font-display absolute right-3 bottom-8 left-3 line-clamp-2 text-xl leading-[0.95] font-extrabold text-tela uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {movie.title}
            </p>
          </>
        ) : (
          <div
            data-testid="poster-placeholder"
            className="font-display flex h-full items-center justify-center bg-gradient-to-br from-mata to-poltrona p-4 pb-8 text-center text-2xl leading-none font-extrabold text-tela/85 uppercase"
          >
            {movie.title}
          </div>
        )}
        <p className="absolute bottom-2.5 left-3 flex gap-2.5 text-xs text-tela/80 tabular-nums">
          {rating && <span className="font-semibold text-folha">★ {rating}</span>}
          {movie.year && <span>{movie.year}</span>}
        </p>
        {badges.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {badges.slice(0, 3).map((p) => (
              <ProviderBadge key={p.id} provider={p} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
