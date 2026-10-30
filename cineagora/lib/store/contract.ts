import { describe, expect, it, vi } from 'vitest';
import type { Movie } from '../tmdb/types';
import type { FavoritesStore, PreferencesStore } from './types';

// Suíte de contrato: qualquer adapter (localStorage hoje, banco amanhã) deve passar nela.
export function runPreferencesStoreContract(name: string, makeStore: () => PreferencesStore) {
  describe(`PreferencesStore: ${name}`, () => {
    it('começa sem serviços marcados', () => {
      expect(makeStore().getSelectedProviders()).toEqual([]);
    });

    it('normaliza ao salvar: inteiros únicos em ordem crescente', () => {
      const store = makeStore();
      store.setSelectedProviders([1899, 8, 8]);
      expect(store.getSelectedProviders()).toEqual([8, 1899]);
    });

    it('descarta ids inválidos', () => {
      const store = makeStore();
      store.setSelectedProviders([8, 0, -1, 1.5, Number.NaN]);
      expect(store.getSelectedProviders()).toEqual([8]);
    });

    it('notifica quem assina e para após cancelar', () => {
      const store = makeStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      store.setSelectedProviders([8]);
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      store.setSelectedProviders([9]);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('devolve a mesma referência enquanto nada muda', () => {
      const store = makeStore();
      store.setSelectedProviders([8]);
      expect(store.getSelectedProviders()).toBe(store.getSelectedProviders());
    });
  });
}

const movie = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  year: 2020,
  rating: 7,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});

export function runFavoritesStoreContract(name: string, makeStore: () => FavoritesStore) {
  describe(`FavoritesStore: ${name}`, () => {
    it('começa vazio', () => {
      expect(makeStore().list()).toEqual([]);
    });

    it('toggle adiciona e depois remove', () => {
      const store = makeStore();
      store.toggle(movie(1));
      expect(store.has(1)).toBe(true);
      expect(store.list()).toEqual([movie(1)]);
      store.toggle(movie(1));
      expect(store.has(1)).toBe(false);
      expect(store.list()).toEqual([]);
    });

    it('mais recente primeiro, sem duplicatas', () => {
      const store = makeStore();
      store.toggle(movie(1));
      store.toggle(movie(2));
      expect(store.list().map((m) => m.id)).toEqual([2, 1]);
    });

    it('notifica quem assina e para após cancelar', () => {
      const store = makeStore();
      const listener = vi.fn();
      const unsubscribe = store.subscribe(listener);
      store.toggle(movie(1));
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      store.toggle(movie(2));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('devolve a mesma referência enquanto nada muda', () => {
      const store = makeStore();
      store.toggle(movie(1));
      expect(store.list()).toBe(store.list());
    });
  });
}
