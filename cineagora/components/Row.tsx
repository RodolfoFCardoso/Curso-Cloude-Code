'use client';

import { useRef, type ReactNode } from 'react';
import type { RailItem } from '@/lib/tmdb/types';
import { MovieCard } from './MovieCard';

export function RowTitle({ children }: { children: string }) {
  return (
    <h2 className="font-display text-2xl leading-none font-extrabold tracking-[0.005em] text-tela sm:text-[1.75rem]">
      {children}
    </h2>
  );
}

// Setas nas bordas do trilho: aparecem ao passar o mouse sobre ele ou ao receber foco.
const arrowClass =
  'absolute inset-y-2 z-20 hidden w-10 items-center justify-center text-tela opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:flex';

export function Row({
  title,
  items,
  action,
}: {
  title: string;
  items: RailItem[];
  /** Link ao lado do título (ex.: ver a lista completa). */
  action?: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <section aria-label={title} className="py-3">
      <div className="mb-2 flex items-baseline gap-4 px-4 sm:px-10">
        <RowTitle>{title}</RowTitle>
        {action}
      </div>
      <div className="group/row relative">
        <button
          type="button"
          aria-label={`Voltar em ${title}`}
          onClick={() => scroll(-1)}
          className={`${arrowClass} left-0 bg-gradient-to-r from-veludo/90 to-transparent`}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-7 w-7">
            <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
        </button>
        <div
          ref={track}
          className="trilho flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 py-2 sm:gap-2.5 sm:scroll-px-10 sm:px-10"
        >
          {items.map(({ movie, badges }) => (
            <MovieCard key={movie.id} movie={movie} badges={badges} />
          ))}
        </div>
        <button
          type="button"
          aria-label={`Avançar em ${title}`}
          onClick={() => scroll(1)}
          className={`${arrowClass} right-0 bg-gradient-to-l from-veludo/90 to-transparent`}
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-7 w-7">
            <path d="m7.5 4 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" />
          </svg>
        </button>
      </div>
    </section>
  );
}
