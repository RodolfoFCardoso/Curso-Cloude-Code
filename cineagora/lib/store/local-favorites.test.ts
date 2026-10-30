import { beforeEach, describe, expect, it } from 'vitest';
import { runFavoritesStoreContract } from './contract';
import { createLocalFavoritesStore } from './local-favorites';

const KEY = 'cineagora:favorites:v1';

beforeEach(() => {
  window.localStorage.clear();
});

runFavoritesStoreContract('localStorage', () => createLocalFavoritesStore(window.localStorage));
runFavoritesStoreContract('memória (sem storage)', () => createLocalFavoritesStore(null));

describe('createLocalFavoritesStore', () => {
  const m = {
    id: 5,
    title: 'X',
    year: null,
    rating: null,
    posterUrl: null,
    backdropUrl: null,
    genreIds: [],
  };

  it('persiste na chave cineagora:favorites:v1 e outra instância lê', () => {
    createLocalFavoritesStore(window.localStorage).toggle(m);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ movies: [m] });
    expect(createLocalFavoritesStore(window.localStorage).has(5)).toBe(true);
  });

  it.each(['{oops', '{"movies":"x"}', '[1]', '{"movies":[{"title":"sem id"}, null]}'])(
    'valor corrompido (%s) vira lista vazia',
    (raw) => {
      window.localStorage.setItem(KEY, raw);
      expect(createLocalFavoritesStore(window.localStorage).list()).toEqual([]);
    },
  );

  it('storage que lança segue em memória', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    const store = createLocalFavoritesStore(broken);
    expect(() => store.toggle(m)).not.toThrow();
    expect(store.has(5)).toBe(true);
  });
});
