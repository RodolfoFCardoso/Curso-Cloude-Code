import { MIN_RATINGS, type MinRating, type PreferencesStore } from './types';

export function normalizeIds(ids: unknown[]): number[] {
  const valid = ids.filter((id): id is number => Number.isInteger(id) && (id as number) > 0);
  return [...new Set(valid)].sort((a, b) => a - b);
}

export function normalizeMinRating(value: unknown): MinRating {
  return MIN_RATINGS.find((r) => r === value) ?? 0;
}

type Saved = { selectedProviders: number[]; minRating: MinRating };

function read(storage: Storage | null, key: string): Saved {
  try {
    const parsed = JSON.parse(storage?.getItem(key) ?? 'null') as {
      selectedProviders?: unknown;
      minRating?: unknown;
    } | null;
    const ids = parsed?.selectedProviders;
    return {
      selectedProviders: Array.isArray(ids) ? normalizeIds(ids) : [],
      minRating: normalizeMinRating(parsed?.minRating),
    };
  } catch {
    return { selectedProviders: [], minRating: 0 };
  }
}

export function createLocalPreferencesStore(
  storage: Storage | null = null,
  key = 'cineagora:prefs:v1',
): PreferencesStore {
  let saved = read(storage, key);
  const listeners = new Set<() => void>();

  function save(next: Saved) {
    saved = next;
    try {
      storage?.setItem(key, JSON.stringify(saved));
    } catch {
      // Modo privado / cota cheia: segue só em memória.
    }
    listeners.forEach((listener) => listener());
  }

  return {
    getSelectedProviders: () => saved.selectedProviders,
    setSelectedProviders(ids) {
      save({ ...saved, selectedProviders: normalizeIds(ids) });
    },
    getMinRating: () => saved.minRating,
    setMinRating(value) {
      save({ ...saved, minRating: normalizeMinRating(value) });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
