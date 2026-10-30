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
  return (
    <Link
      href={`/filme/${movie.id}`}
      className={`group block rounded-md focus-visible:outline-none ${
        fluid ? 'w-full' : 'w-36 shrink-0 snap-start sm:w-44 lg:w-48'
      }`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-poltrona shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)] ring-1 ring-tela/5 transition duration-300 ease-out group-hover:-translate-y-1.5 group-hover:ring-2 group-hover:ring-projetor group-focus-visible:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-projetor motion-reduce:transform-none">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 192px, (min-width: 640px) 176px, 144px"
            className="object-cover"
          />
        ) : (
          <div
            data-testid="poster-placeholder"
            className="font-display flex h-full items-center justify-center bg-gradient-to-b from-cortina to-poltrona p-4 text-center text-2xl leading-none font-extrabold text-tela/80"
          >
            {movie.title}
          </div>
        )}
        {badges.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6">
            {badges.slice(0, 3).map((p) => (
              <ProviderBadge key={p.id} provider={p} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2.5 line-clamp-1 text-sm font-medium text-tela/90 transition-colors group-hover:text-tela">
        {movie.title}
      </p>
      <p className="mt-0.5 flex gap-2 text-xs text-penumbra tabular-nums">
        {rating && <span className="font-semibold text-projetor">★ {rating}</span>}
        {movie.year && <span>{movie.year}</span>}
      </p>
    </Link>
  );
}
