'use client';

import { useRef } from 'react';
import type { RailItem } from '@/lib/tmdb/types';
import { MovieCard } from './MovieCard';

export function RowTitle({ children }: { children: string }) {
  return (
    <h2 className="font-display text-[1.75rem] leading-none font-extrabold tracking-[0.005em] text-tela sm:text-[2rem]">
      {children}
    </h2>
  );
}

const arrowClass =
  'flex h-9 w-9 items-center justify-center rounded-full text-tela ring-1 ring-cortina transition-colors hover:bg-projetor hover:text-veludo hover:ring-projetor';

export function Row({ title, items }: { title: string; items: RailItem[] }) {
  const track = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <section aria-label={title} className="py-4">
      <div className="mb-4 flex items-end justify-between gap-4 px-4 sm:px-10">
        <RowTitle>{title}</RowTitle>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            aria-label={`Voltar em ${title}`}
            onClick={() => scroll(-1)}
            className={arrowClass}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Avançar em ${title}`}
            onClick={() => scroll(1)}
            className={arrowClass}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
              <path d="m7.5 4 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={track}
        className="trilho flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pt-2 pb-3 sm:gap-4 sm:scroll-px-10 sm:px-10"
      >
        {items.map(({ movie, badges }) => (
          <MovieCard key={movie.id} movie={movie} badges={badges} />
        ))}
      </div>
    </section>
  );
}
