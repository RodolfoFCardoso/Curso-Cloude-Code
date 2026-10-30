'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import { HOME_TABS, parseTab, TAB_STATUS, type HomeTab } from '@/lib/home-tabs';
import { MovieListPanel } from './MovieListPanel';

const LABELS: Record<HomeTab, string> = {
  descobrir: 'Descobrir',
  'quero-assistir': 'Quero assistir',
  'ja-assisti': 'Já assisti',
};

function HomeTabsInner({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const { user } = useAuth();
  const { ready, list } = useMovieList();
  const refs = useRef<Partial<Record<HomeTab, HTMLButtonElement | null>>>({});
  const active = parseTab(params.get('aba'));

  function select(tab: HomeTab) {
    const next = new URLSearchParams(params.toString());
    if (tab === 'descobrir') next.delete('aba');
    else next.set('aba', tab);
    const qs = next.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
    );
  }

  function onKeyDown(e: KeyboardEvent, from: HomeTab) {
    const i = HOME_TABS.indexOf(from);
    let to: number;
    if (e.key === 'ArrowRight') to = (i + 1) % HOME_TABS.length;
    else if (e.key === 'ArrowLeft') to = (i - 1 + HOME_TABS.length) % HOME_TABS.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = HOME_TABS.length - 1;
    else return;
    e.preventDefault();
    const tab = HOME_TABS[to];
    refs.current[tab]?.focus();
    select(tab);
  }

  const showCounts = !!user && ready;

  return (
    <>
      <div
        role="tablist"
        aria-label="Seções da home"
        className="mt-10 flex gap-2 overflow-x-auto border-b border-tela/10 pb-3"
      >
        {HOME_TABS.map((tab) => {
          const selected = tab === active;
          const count = showCounts && tab !== 'descobrir' ? list(TAB_STATUS[tab]).length : null;
          return (
            <button
              key={tab}
              ref={(el) => {
                refs.current[tab] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={selected}
              aria-controls={`panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab)}
              onKeyDown={(e) => onKeyDown(e, tab)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-projetor ${
                selected
                  ? 'border-projetor bg-projetor text-veludo'
                  : 'border-tela/15 text-tela/80 hover:border-tela/40'
              }`}
            >
              {LABELS[tab]}
              {count !== null && ` · ${count}`}
            </button>
          );
        })}
      </div>

      {/* Descobrir fica sempre montado (só oculto): preserva scroll dos trilhos e evita refazer requests. */}
      <div
        role="tabpanel"
        id="panel-descobrir"
        aria-labelledby="tab-descobrir"
        hidden={active !== 'descobrir'}
      >
        {children}
      </div>
      {active !== 'descobrir' && (
        <div
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
          className="mt-8"
        >
          <MovieListPanel status={TAB_STATUS[active]} />
        </div>
      )}
    </>
  );
}

export function HomeTabs({ children }: { children: ReactNode }) {
  // Sem os parâmetros (render estático) mostra Descobrir, para os trilhos já irem no HTML.
  return (
    <Suspense
      fallback={
        <div role="tabpanel" id="panel-descobrir">
          {children}
        </div>
      }
    >
      <HomeTabsInner>{children}</HomeTabsInner>
    </Suspense>
  );
}
