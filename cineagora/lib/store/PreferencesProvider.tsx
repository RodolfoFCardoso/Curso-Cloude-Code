'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createLocalPreferencesStore } from './local-preferences';
import type { MinRating, PreferencesStore } from './types';

type Stores = { preferences: PreferencesStore };

const StoresContext = createContext<Stores | null>(null);

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function PreferencesProvider({
  store,
  children,
}: {
  store?: PreferencesStore;
  children: ReactNode;
}) {
  const [value] = useState<Stores>(() => ({
    preferences: store ?? createLocalPreferencesStore(browserStorage()),
  }));
  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
}

function useStores(): Stores {
  const stores = useContext(StoresContext);
  if (!stores) throw new Error('usePreferences precisa estar dentro de <PreferencesProvider>');
  return stores;
}

const serverSnapshot = () => null;

/** `selected === null` enquanto não hidratou (servidor e primeiro render). */
export function usePreferences(): {
  selected: number[] | null;
  setSelected(ids: number[]): void;
} {
  const { preferences } = useStores();
  const selected = useSyncExternalStore(
    preferences.subscribe,
    preferences.getSelectedProviders,
    serverSnapshot,
  );
  return { selected, setSelected: preferences.setSelectedProviders };
}

/** `minRating === null` enquanto não hidratou; 0 = Todas. */
export function useMinRating(): {
  minRating: MinRating | null;
  setMinRating(value: MinRating): void;
} {
  const { preferences } = useStores();
  const minRating = useSyncExternalStore(
    preferences.subscribe,
    preferences.getMinRating,
    serverSnapshot,
  );
  return { minRating, setMinRating: preferences.setMinRating };
}
