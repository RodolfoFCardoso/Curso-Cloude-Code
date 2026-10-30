'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePreferences } from '@/lib/store/PreferencesProvider';
import { EmptyState } from './EmptyState';
import { OPEN_PROVIDER_FILTER_EVENT } from './ProviderFilter';

export type RailState = 'loading' | 'shown' | 'empty' | 'error';

type Statuses = Record<string, RailState>;

const RailStatusContext = createContext<{
  total: number;
  statuses: Statuses;
  report(key: string, state: RailState): void;
} | null>(null);

export function RailStatusProvider({ total, children }: { total: number; children: ReactNode }) {
  const [statuses, setStatuses] = useState<Statuses>({});
  const [report] = useState(
    () => (key: string, state: RailState) =>
      setStatuses((prev) => (prev[key] === state ? prev : { ...prev, [key]: state })),
  );
  return (
    <RailStatusContext.Provider value={{ total, statuses, report }}>
      {children}
    </RailStatusContext.Provider>
  );
}

/** Cada trilho informa seu estado; sem provider, não faz nada. */
export function useReportRailStatus(key: string, state: RailState): void {
  const report = useContext(RailStatusContext)?.report;
  useEffect(() => {
    report?.(key, state);
  }, [report, key, state]);
}

export function useRailStatuses(): Statuses {
  return useContext(RailStatusContext)?.statuses ?? {};
}

export function FilteredEmptyNotice() {
  const ctx = useContext(RailStatusContext);
  const { selected } = usePreferences();
  if (!ctx || !selected?.length) return null;

  const states = Object.values(ctx.statuses);
  const allGone = states.length >= ctx.total && states.every((s) => s === 'empty' || s === 'error');
  if (!allGone) return null;

  return (
    <EmptyState
      title="Nenhum filme dos seus streamings nestes trilhos"
      message="Tente marcar outros serviços para ver mais opções."
      action={
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_PROVIDER_FILTER_EVENT))}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
        >
          Ajustar meus streamings
        </button>
      }
    />
  );
}
