'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePreferences } from '@/lib/store/PreferencesProvider';
import type { WatchProvider } from '@/lib/tmdb/types';
import { ProviderBadge } from './ProviderBadge';

export const OPEN_PROVIDER_FILTER_EVENT = 'cineagora:open-provider-filter';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function ProviderFilter({ providers }: { providers: WatchProvider[] | null }) {
  const { selected, setSelected } = usePreferences();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chosen = useMemo(() => new Set(selected ?? []), [selected]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_PROVIDER_FILTER_EVENT, openPanel);
    return () => window.removeEventListener(OPEN_PROVIDER_FILTER_EVENT, openPanel);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const visible = (providers ?? []).filter((p) => fold(p.name).includes(fold(query.trim())));

  function toggle(id: number) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected([...next]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
      >
        {chosen.size > 0 ? `Meus streamings (${chosen.size})` : 'Meus streamings'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Meus streamings"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col gap-4 bg-zinc-900 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Meus streamings</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-100"
              >
                Fechar
              </button>
            </div>
            <p className="text-sm text-zinc-400">
              Marque os serviços que você assina. A home passa a mostrar só o que você já pode ver.
            </p>

            {providers === null ? (
              <p className="text-sm text-red-300">Não foi possível carregar os serviços agora.</p>
            ) : (
              <>
                <input
                  type="search"
                  aria-label="Buscar serviço"
                  placeholder="Buscar serviço…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-white/10 focus:ring-amber-400"
                />
                <ul className="-mx-2 flex-1 overflow-y-auto">
                  {visible.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-800">
                        <input
                          type="checkbox"
                          checked={chosen.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="h-4 w-4 accent-amber-400"
                        />
                        <span aria-hidden="true">
                          <ProviderBadge provider={p} />
                        </span>
                        <span className="text-sm text-zinc-100">{p.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={chosen.size === 0}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 ring-1 ring-white/10 hover:bg-zinc-800 disabled:opacity-40"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
