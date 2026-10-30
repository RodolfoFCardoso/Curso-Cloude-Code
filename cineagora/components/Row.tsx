import type { RailItem } from '@/lib/tmdb/types';
import { MovieCard } from './MovieCard';

export function Row({ title, items }: { title: string; items: RailItem[] }) {
  return (
    <section aria-label={title} className="py-3">
      <h2 className="mb-3 px-4 text-lg font-semibold text-zinc-100 sm:px-8">{title}</h2>
      <div className="flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-8 sm:px-8">
        {items.map(({ movie, badges }) => (
          <MovieCard key={movie.id} movie={movie} badges={badges} />
        ))}
      </div>
    </section>
  );
}
