'use client';

import { useEffect, useState } from 'react';
import type { RailKey } from '@/lib/rails';
import { usePreferences } from '@/lib/store/PreferencesProvider';
import type { Movie, RailItem } from '@/lib/tmdb/types';
import { RailSkeleton } from './RailSkeleton';
import { useReportRailStatus, type RailState } from './RailStatus';
import { Row } from './Row';

type Filtered = { query: string; state: Exclude<RailState, 'loading'>; items: RailItem[] };

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
  const query = selected?.length ? selected.join(',') : '';
  const [filtered, setFiltered] = useState<Filtered | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const done = (state: Filtered['state'], items: RailItem[] = []) => {
      if (!controller.signal.aborted) setFiltered({ query, state, items });
    };

    fetch(`/api/rail/${railKey}?providers=${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return done('error');
        const { items } = (await res.json()) as { items: RailItem[] };
        done(items.length > 0 ? 'shown' : 'empty', items);
      })
      .catch(() => done('error'));

    return () => controller.abort();
  }, [railKey, query]);

  // Resultado de um filtro anterior não vale para o atual.
  const current = filtered?.query === query ? filtered : null;
  const state: RailState = !query ? 'shown' : (current?.state ?? 'loading');
  useReportRailStatus(railKey, state);

  if (!query) {
    return <Row title={title} items={initialMovies.map((movie) => ({ movie, badges: [] }))} />;
  }
  if (state === 'loading') return <RailSkeleton title={title} />;
  if (state !== 'shown') return null;
  return <Row title={title} items={current!.items} />;
}
