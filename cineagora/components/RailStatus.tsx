'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useMinRating, usePreferences } from '@/lib/store/PreferencesProvider';
import { EmptyState } from './EmptyState';
import { OPEN_PROVIDER_FILTER_EVENT } from './ProviderFilter';

export type RailState = 'loading' | 'shown' | 'empty' | 'error';

type Statuses = Record<string, RailState>;

const RailStatusContext = createContext<{
  total: number;
  statuses: Statuses;
  attempt: number;
  report(key: string, state: RailState): void;
  retry(): void;
} | null>(null);

export function RailStatusProvider({ total, children }: { total: number; children: ReactNode }) {
  const [statuses, setStatuses] = useState<Statuses>({});
  const [attempt, setAttempt] = useState(0);
  const [actions] = useState(() => ({
    report: (key: string, state: RailState) =>
      setStatuses((prev) => (prev[key] === state ? prev : { ...prev, [key]: state })),
    retry: () => setAttempt((n) => n + 1),
  }));
  return (
    <RailStatusContext.Provider value={{ total, statuses, attempt, ...actions }}>
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

/** Muda a cada "Tentar novamente"; os trilhos refazem a busca quando ele muda. */
export function useRailAttempt(): number {
  return useContext(RailStatusContext)?.attempt ?? 0;
}

export function useRailRetry(): () => void {
  return useContext(RailStatusContext)?.retry ?? noop;
}

const noop = () => {};

const buttonClass =
  'rounded-md bg-projetor px-5 py-2.5 text-sm font-semibold text-tela transition-colors hover:bg-projetor-forte';

const secondaryButtonClass =
  'rounded-full px-5 py-2.5 text-sm text-tela ring-1 ring-cortina transition-colors hover:bg-cortina';

export function FilteredEmptyNotice() {
  const ctx = useContext(RailStatusContext);
  const { selected } = usePreferences();
  const { minRating, setMinRating } = useMinRating();
  const byProviders = !!selected?.length;
  const byRating = !!minRating;
  if (!ctx || (!byProviders && !byRating)) return null;

  const states = Object.values(ctx.statuses);
  if (states.length < ctx.total) return null;

  if (byProviders && states.every((s) => s === 'error')) {
    return (
      <EmptyState
        title="Não foi possível carregar seus streamings agora."
        message="Pode ser uma instabilidade passageira."
        action={
          <button type="button" onClick={ctx.retry} className={buttonClass}>
            Tentar novamente
          </button>
        }
      />
    );
  }

  if (!states.every((s) => s === 'empty' || s === 'error')) return null;

  const showAllRatings = byRating && (
    <button
      type="button"
      onClick={() => setMinRating(0)}
      className={byProviders ? secondaryButtonClass : buttonClass}
    >
      Mostrar todas as notas
    </button>
  );

  if (!byProviders) {
    return (
      <EmptyState
        title={`Nenhum filme com nota ${minRating}+ nestes trilhos`}
        message="Tente uma nota mínima menor."
        action={showAllRatings}
      />
    );
  }

  return (
    <EmptyState
      title="Nenhum filme dos seus streamings nestes trilhos"
      message={
        byRating
          ? 'Tente marcar outros serviços ou baixar a nota mínima.'
          : 'Tente marcar outros serviços para ver mais opções.'
      }
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_PROVIDER_FILTER_EVENT))}
            className={buttonClass}
          >
            Ajustar meus streamings
          </button>
          {showAllRatings}
        </div>
      }
    />
  );
}
