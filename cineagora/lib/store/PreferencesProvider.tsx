'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Movie } from '../tmdb/types';
import { createLocalFavoritesStore } from './local-favorites';
import { createLocalPreferencesStore } from './local-preferences';
import type { FavoritesStore, PreferencesStore } from './types';

type Stores = { preferences: PreferencesStore; favorites: FavoritesStore };

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
  favoritesStore,
  children,
}: {
  store?: PreferencesStore;
  favoritesStore?: FavoritesStore;
  children: ReactNode;
}) {
  const [value] = useState<Stores>(() => ({
    preferences: store ?? createLocalPreferencesStore(browserStorage()),
    favorites: favoritesStore ?? createLocalFavoritesStore(browserStorage()),
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

/** `favorites === null` enquanto não hidratou. */
export function useFavorites(): {
  favorites: Movie[] | null;
  isFavorite(id: number): boolean;
  toggle(movie: Movie): void;
} {
  const { favorites: store } = useStores();
  const favorites = useSyncExternalStore(store.subscribe, store.list, serverSnapshot);
  return {
    favorites,
    isFavorite: (id) => favorites?.some((m) => m.id === id) ?? false,
    toggle: store.toggle,
  };
}
