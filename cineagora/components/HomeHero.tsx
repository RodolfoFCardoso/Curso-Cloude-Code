'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { FeaturedMovie } from '@/lib/featured';
import { formatRating, formatRuntime } from '@/lib/format';
import { usePreferences } from '@/lib/store/PreferencesProvider';
import { FavoriteButton } from './FavoriteButton';
import { ProviderBadge } from './ProviderBadge';
import { Screen } from './Screen';

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
    <section aria-label="Em destaque" className="px-4 pt-20 sm:px-10 sm:pt-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Screen
            key={movie.id}
            src={movie.backdropUrl!}
            imageClassName={switched ? 'troca-destaque' : 'projetor-acende'}
            priority
          />

          <div key={`letreiro-${movie.id}`} className="letreiro-entra relative px-1 sm:px-6">
            {/* O letreiro invade a borda de baixo do telão. */}
            <h2 className="font-display -mt-[0.34em] text-[clamp(3rem,7.5vw,7.25rem)] leading-[0.84] font-black tracking-[-0.01em] text-balance text-tela uppercase drop-shadow-[0_6px_24px_rgba(10,4,7,0.8)]">
              {movie.title}
            </h2>

            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end xl:gap-10">
              <div>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tela/85 tabular-nums">
                  {rating && <span className="font-semibold text-projetor">★ {rating}</span>}
                  {movie.year && <span>{movie.year}</span>}
                  {runtime && <span>{runtime}</span>}
                  {current.genres.length > 0 && (
                    <span>{current.genres.slice(0, 2).join(', ')}</span>
                  )}
                </p>
                {current.overview && (
                  <p className="mt-3 line-clamp-3 max-w-[60ch] leading-relaxed text-tela/75">
                    {current.overview}
                  </p>
                )}
                {current.providers.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span
                      className={`text-sm ${inMyServices ? 'font-semibold text-projetor' : 'text-tela/75'}`}
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

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/filme/${movie.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-projetor px-6 py-3 text-sm font-semibold text-veludo transition-colors hover:bg-projetor-forte"
                >
                  Ver detalhes
                </Link>
                <FavoriteButton movie={movie} />
              </div>
            </div>
          </div>
        </div>

        {featured.length > 1 && (
          <div>
            <h3 className="font-display mb-4 text-2xl leading-none font-extrabold text-tela">
              Em alta esta semana
            </h3>
            <ol className="trilho -mx-4 flex divide-x divide-cortina overflow-x-auto border-y border-cortina px-4 sm:-mx-10 sm:px-10 lg:mx-0 lg:flex-col lg:divide-x-0 lg:divide-y lg:overflow-visible lg:px-0">
              {featured.map((f, i) => {
                const active = i === index;
                return (
                  <li key={f.movie.id} className="w-64 shrink-0 lg:w-auto">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => show(i)}
                      className={`group relative flex w-full items-center gap-4 py-3 pr-2 text-left transition-colors ${
                        active ? 'bg-poltrona' : 'hover:bg-poltrona/60'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${
                          active ? 'bg-projetor' : 'bg-transparent'
                        }`}
                      />
                      <span
                        className={`font-display w-10 shrink-0 text-right text-[2.75rem] leading-none font-black tabular-nums transition-colors ${
                          active ? 'text-projetor' : 'text-cortina group-hover:text-penumbra'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="relative h-[60px] w-10 shrink-0 overflow-hidden rounded-[2px] bg-cortina">
                        {f.movie.posterUrl && (
                          <Image
                            src={f.movie.posterUrl}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm font-semibold ${
                            active ? 'text-tela' : 'text-tela/75 group-hover:text-tela'
                          }`}
                        >
                          {f.movie.title}
                        </span>
                        <span className="block truncate text-xs text-penumbra">
                          {[f.movie.year, f.genres[0]].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
