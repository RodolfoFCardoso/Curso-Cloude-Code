'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createLocalPreferencesStore } from './local-preferences';
import type { PreferencesStore } from './types';

const PreferencesContext = createContext<PreferencesStore | null>(null);

function defaultStore(): PreferencesStore {
  let storage: Storage | null = null;
  try {
    storage = typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    storage = null;
  }
  return createLocalPreferencesStore(storage);
}

export function PreferencesProvider({
  store,
  children,
}: {
  store?: PreferencesStore;
  children: ReactNode;
}) {
  const [value] = useState(() => store ?? defaultStore());
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

const serverSnapshot = () => null;

/** `selected === null` enquanto não hidratou (servidor e primeiro render). */
export function usePreferences(): {
  selected: number[] | null;
  setSelected(ids: number[]): void;
} {
  const store = useContext(PreferencesContext);
  if (!store) throw new Error('usePreferences precisa estar dentro de <PreferencesProvider>');
  const selected = useSyncExternalStore(
    store.subscribe,
    store.getSelectedProviders,
    serverSnapshot,
  );
  return { selected, setSelected: store.setSelectedProviders };
}
