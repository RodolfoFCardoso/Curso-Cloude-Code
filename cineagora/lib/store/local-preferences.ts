import type { PreferencesStore } from './types';

export function normalizeIds(ids: unknown[]): number[] {
  const valid = ids.filter((id): id is number => Number.isInteger(id) && (id as number) > 0);
  return [...new Set(valid)].sort((a, b) => a - b);
}

function readIds(storage: Storage | null, key: string): number[] {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? 'null');
    const ids = (parsed as { selectedProviders?: unknown } | null)?.selectedProviders;
    return Array.isArray(ids) ? normalizeIds(ids) : [];
  } catch {
    return [];
  }
}

export function createLocalPreferencesStore(
  storage: Storage | null = null,
  key = 'cineagora:prefs:v1',
): PreferencesStore {
  let selected = readIds(storage, key);
  const listeners = new Set<() => void>();

  return {
    getSelectedProviders: () => selected,
    setSelectedProviders(ids) {
      selected = normalizeIds(ids);
      try {
        storage?.setItem(key, JSON.stringify({ selectedProviders: selected }));
      } catch {
        // Modo privado / cota cheia: segue só em memória.
      }
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
