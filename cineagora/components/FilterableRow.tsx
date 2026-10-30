'use client';

import { useEffect, useState } from 'react';
import { filterByRating } from '@/lib/filter';
import type { RailKey } from '@/lib/rails';
import { useMinRating, usePreferences } from '@/lib/store/PreferencesProvider';
import type { Movie, RailItem } from '@/lib/tmdb/types';
import { RailSkeleton } from './RailSkeleton';
import { useRailAttempt, useReportRailStatus, type RailState } from './RailStatus';
import { Row } from './Row';

type Filtered = {
  query: string;
  attempt: number;
  state: Exclude<RailState, 'loading'>;
  items: RailItem[];
};

export function FilterableRow({
  railKey,
  title,
  initialMovies,
}: {
  railKey: RailKey;
  title: string;
  initialMovies: Movie[];
}) {
  const { selected } = usePreferences();
  const { minRating } = useMinRating();
  const query = selected?.length ? selected.join(',') : '';
  const [filtered, setFiltered] = useState<Filtered | null>(null);
  const attempt = useRailAttempt();

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const done = (state: Filtered['state'], items: RailItem[] = []) => {
      if (!controller.signal.aborted) setFiltered({ query, attempt, state, items });
    };

    fetch(`/api/rail/${railKey}?providers=${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return done('error');
        const { items } = (await res.json()) as { items: RailItem[] };
        done(items.length > 0 ? 'shown' : 'empty', items);
      })
      .catch(() => done('error'));

    return () => controller.abort();
  }, [railKey, query, attempt]);

  // Resultado de um filtro (ou tentativa) anterior não vale para o atual.
  const current = filtered?.query === query && filtered.attempt === attempt ? filtered : null;
  const hydrated = selected !== null && minRating !== null;
  const fetched: RailState = !hydrated
    ? 'loading'
    : !query
      ? 'shown'
      : (current?.state ?? 'loading');
  // A nota mínima é aplicada aqui, no cliente: trocar de chip não refaz a busca.
  const items =
    fetched !== 'shown'
      ? []
      : filterByRating(
          query ? current!.items : initialMovies.map((movie) => ({ movie, badges: [] })),
          minRating ?? 0,
        );
  const state: RailState = fetched === 'shown' && items.length === 0 ? 'empty' : fetched;
  useReportRailStatus(railKey, state);

  // Até ler o filtro salvo, não mostra filmes que talvez fiquem de fora (evita "pulo").
  if (state === 'loading') return <RailSkeleton title={title} />;
  if (state !== 'shown') return null;
  return <Row title={title} items={items} />;
}
