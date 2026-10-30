import Image from 'next/image';
import Link from 'next/link';
import { formatRating } from '@/lib/format';
import type { Movie, WatchProvider } from '@/lib/tmdb/types';
import { ProviderBadge } from './ProviderBadge';

export function MovieCard({ movie, badges = [] }: { movie: Movie; badges?: WatchProvider[] }) {
  const rating = formatRating(movie.rating);
  return (
    <Link href={`/filme/${movie.id}`} className="group block w-36 shrink-0 snap-start sm:w-40">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/5 transition group-hover:ring-amber-400/70 group-focus-visible:ring-amber-400">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt=""
            fill
            sizes="160px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            data-testid="poster-placeholder"
            className="flex h-full items-center justify-center p-3 text-center text-sm font-medium text-zinc-400"
          >
            {movie.title}
          </div>
        )}
        {badges.length > 0 && (
          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            {badges.slice(0, 3).map((p) => (
              <ProviderBadge key={p.id} provider={p} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-zinc-100">{movie.title}</p>
      <p className="text-xs text-zinc-400">
        {rating && <span className="text-amber-400">★ {rating}</span>}
        {rating && movie.year && ' · '}
        {movie.year}
      </p>
    </Link>
  );
}
