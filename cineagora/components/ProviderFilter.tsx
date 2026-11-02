'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { usePreferences } from '@/lib/store/PreferencesProvider';
import type { WatchProvider } from '@/lib/tmdb/types';
import { ProviderBadge } from './ProviderBadge';

export const OPEN_PROVIDER_FILTER_EVENT = 'cineagora:open-provider-filter';

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')];
}

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

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    // Foco entra no painel (busca, ou o primeiro botão) e volta ao gatilho ao fechar.
    const trigger = triggerRef.current;
    const search = dialogRef.current?.querySelector<HTMLElement>('input[type="search"]');
    (search ?? focusables(dialogRef.current)[0])?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open]);

  function trapTab(e: ReactKeyboardEvent) {
    if (e.key !== 'Tab') return;
    const items = focusables(dialogRef.current);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const visible = (providers ?? []).filter((p) => fold(p.name).includes(fold(query.trim())));

  function toggle(id: number) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected([...next]);
  }

  const label = chosen.size > 0 ? `Meus streamings (${chosen.size})` : 'Meus streamings';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="flex shrink-0 items-center gap-2 rounded-md bg-projetor px-3 py-2 text-sm font-semibold text-tela transition-colors hover:bg-projetor-forte sm:px-4"
      >
        {/* No celular o "Meus" sai para o cabeçalho caber numa linha. */}
        <span className="hidden min-[480px]:inline">Meus&nbsp;</span>
        {chosen.size > 0 ? `streamings (${chosen.size})` : 'streamings'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-veludo/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            onKeyDown={trapTab}
            role="dialog"
            aria-modal="true"
            aria-label="Meus streamings"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col gap-4 bg-poltrona p-6 shadow-[-24px_0_60px_rgba(0,0,0,0.5)] ring-1 ring-cortina"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl leading-none font-extrabold text-tela">
                Meus streamings
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1 text-sm text-penumbra hover:bg-cortina hover:text-tela"
              >
                Fechar
              </button>
            </div>
            <p className="text-sm leading-relaxed text-penumbra">
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
                  className="rounded-lg bg-veludo px-3 py-2.5 text-sm text-tela ring-1 ring-cortina outline-none placeholder:text-penumbra focus:ring-folha focus-visible:outline-none"
                />
                <ul className="-mx-2 flex-1 overflow-y-auto">
                  {visible.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-cortina/60 has-[:checked]:bg-cortina">
                        <input
                          type="checkbox"
                          checked={chosen.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="h-4 w-4 accent-projetor"
                        />
                        <span aria-hidden="true">
                          <ProviderBadge provider={p} />
                        </span>
                        <span className="text-sm text-tela">{p.name}</span>
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
              className="rounded-full px-3 py-2.5 text-sm text-tela ring-1 ring-cortina hover:bg-cortina disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Limpar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
