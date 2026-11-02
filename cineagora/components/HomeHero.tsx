'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { FeaturedMovie } from '@/lib/featured';
import { formatRating, formatRuntime } from '@/lib/format';
import { usePreferences } from '@/lib/store/PreferencesProvider';
import { Billboard } from './Billboard';
import { ProviderBadge } from './ProviderBadge';

export function HomeHero({ featured }: { featured: FeaturedMovie[] }) {
  const [index, setIndex] = useState(0);
  const [switched, setSwitched] = useState(false);
  const { selected } = usePreferences();

  const current = featured[index];
  if (!current) return null;
  const { movie } = current;

  const rating = formatRating(movie.rating);
  const runtime = formatRuntime(current.runtimeMinutes);
  const mine = new Set(selected ?? []);
  const inMyServices =
    current.providersKind === 'stream' && current.providers.some((p) => mine.has(p.id));
  const providersLabel = inMyServices
    ? 'Está no que você assina'
    : current.providersKind === 'stream'
      ? 'Assista com'
      : 'Alugue ou compre em';

  function show(i: number) {
    if (i === index) return;
    setSwitched(true);
    setIndex(i);
  }

  return (
    <section aria-label="Em destaque">
      <Billboard
        key={movie.id}
        src={movie.backdropUrl!}
        imageClassName={switched ? 'troca-destaque' : 'projetor-acende'}
        priority
        overlapNext={featured.length > 1}
      >
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div key={`letreiro-${movie.id}`} className="letreiro-entra max-w-2xl">
            <h2 className="font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.86] font-black tracking-[-0.01em] text-balance text-tela uppercase drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)]">
              {movie.title}
            </h2>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tela/90 tabular-nums">
              {rating && <span className="font-semibold text-folha">★ {rating}</span>}
              {movie.year && <span>{movie.year}</span>}
              {runtime && <span>{runtime}</span>}
              {current.genres.length > 0 && <span>{current.genres.slice(0, 2).join(', ')}</span>}
            </p>
            {current.overview && (
              <p className="mt-3 line-clamp-3 max-w-[52ch] leading-relaxed text-tela/80">
                {current.overview}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href={`/filme/${movie.id}`}
                className="inline-flex items-center gap-2.5 rounded-md bg-tela px-6 py-3 text-base font-bold text-veludo transition-colors hover:bg-tela/80"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5">
                  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M10 9v5M10 6.2v.1"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                Ver detalhes
              </Link>
              {current.providers.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`text-sm ${inMyServices ? 'font-semibold text-folha' : 'text-tela/75'}`}
                  >
                    {providersLabel}
                  </span>
                  <ul className="flex gap-1.5">
                    {current.providers.slice(0, 5).map((p) => (
                      <li key={p.id}>
                        <ProviderBadge provider={p} size="md" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {featured.length > 1 && (
            <div role="group" aria-label="Trocar filme em destaque" className="flex gap-2">
              {featured.map((f, i) => (
                <button
                  key={f.movie.id}
                  type="button"
                  aria-label={`Destacar ${f.movie.title}`}
                  aria-pressed={i === index}
                  onClick={() => show(i)}
                  className="group flex h-6 items-center"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1 rounded-full transition-all ${
                      i === index ? 'w-10 bg-tela' : 'w-5 bg-tela/35 group-hover:bg-tela/70'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </Billboard>

      {featured.length > 1 && <TrendingRanking featured={featured} />}
    </section>
  );
}

/** Ranking da semana: numeral grande vazado com o pôster encaixado por cima. */
function TrendingRanking({ featured }: { featured: FeaturedMovie[] }) {
  return (
    <div className="relative z-10 lg:-mt-[9vw]">
      <h3 className="font-display mb-3 px-4 text-2xl leading-none font-extrabold text-tela sm:px-10 sm:text-[1.75rem]">
        Em alta esta semana
      </h3>
      <ol className="trilho flex gap-2 overflow-x-auto px-4 pt-1 pb-3 sm:gap-4 sm:px-10">
        {featured.map((f, i) => (
          <li key={f.movie.id} className="shrink-0">
            <Link
              href={`/filme/${f.movie.id}`}
              aria-label={`${i + 1}º: ${f.movie.title}`}
              className="group flex items-end rounded-md"
            >
              <span
                aria-hidden="true"
                className="numeral-ranking font-display -mr-3 min-w-14 text-right text-[8.5rem] leading-[0.78] font-black tabular-nums sm:-mr-4 sm:min-w-[4.5rem] sm:text-[10.5rem]"
              >
                {i + 1}
              </span>
              <span className="relative aspect-[2/3] w-24 overflow-hidden rounded-[4px] bg-poltrona shadow-[0_12px_30px_-10px_rgba(0,0,0,0.9)] ring-1 ring-tela/10 transition duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-folha group-focus-visible:ring-2 group-focus-visible:ring-folha motion-reduce:transform-none sm:w-28">
                {f.movie.posterUrl && (
                  <Image
                    src={f.movie.posterUrl}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
