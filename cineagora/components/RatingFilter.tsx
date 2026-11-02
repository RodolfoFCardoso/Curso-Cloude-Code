'use client';

import { useMinRating } from '@/lib/store/PreferencesProvider';
import { MIN_RATINGS } from '@/lib/store/types';

const chipClass = 'rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors';
const activeClass = 'bg-projetor text-tela ring-projetor hover:bg-projetor-forte';
const idleClass = 'text-tela ring-cortina hover:bg-cortina';

/** Chips de nota mínima (TMDB) para os trilhos da home. */
export function RatingFilter() {
  const { minRating, setMinRating } = useMinRating();

  return (
    <div
      role="group"
      aria-labelledby="rating-filter-label"
      className="flex flex-wrap items-center gap-2 px-4 pb-2 sm:px-10"
    >
      <span id="rating-filter-label" className="mr-1 text-sm text-penumbra">
        <span aria-hidden="true" className="text-folha">
          ★{' '}
        </span>
        Nota mínima
      </span>
      {MIN_RATINGS.map((value) => {
        const active = minRating === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setMinRating(value)}
            className={`${chipClass} ${active ? activeClass : idleClass}`}
          >
            {value === 0 ? 'Todas' : `${value}+`}
          </button>
        );
      })}
    </div>
  );
}
