import { describe, expect, it, vi } from 'vitest';
import type { Movie } from '../tmdb/types';
import type { MovieListStore, PreferencesStore } from './types';

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

    it('começa sem nota mínima (Todas = 0)', () => {
      expect(makeStore().getMinRating()).toBe(0);
    });

    it('salva a nota mínima e notifica', () => {
      const store = makeStore();
      const listener = vi.fn();
      store.subscribe(listener);
      store.setMinRating(8);
      expect(store.getMinRating()).toBe(8);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it.each([5, 7.5, Number.NaN, -1])('nota fora das opções (%s) vira Todas', (value) => {
      const store = makeStore();
      store.setMinRating(8);
      store.setMinRating(value as never);
      expect(store.getMinRating()).toBe(0);
    });

    it('mudar a nota não apaga os serviços, e vice-versa', () => {
      const store = makeStore();
      store.setSelectedProviders([8]);
      store.setMinRating(7);
      store.setSelectedProviders([8, 1899]);
      expect(store.getMinRating()).toBe(7);
      expect(store.getSelectedProviders()).toEqual([8, 1899]);
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

// makeStore resolve com o store já pronto (isReady() === true).
export function runMovieListStoreContract(name: string, makeStore: () => Promise<MovieListStore>) {
  describe(`MovieListStore: ${name}`, () => {
    it('pronto e vazio', async () => {
      const s = await makeStore();
      expect(s.isReady()).toBe(true);
      expect(s.list('want')).toEqual([]);
      expect(s.list('watched')).toEqual([]);
      expect(s.statusOf(1)).toBeNull();
      expect(s.lastError()).toBeNull();
    });

    it('marca, troca e desmarca com status exclusivo', async () => {
      const s = await makeStore();
      s.setStatus(movie(1), 'want');
      expect(s.statusOf(1)).toBe('want');
      expect(s.list('want')).toEqual([movie(1)]);
      s.setStatus(movie(1), 'watched');
      expect(s.statusOf(1)).toBe('watched');
      expect(s.list('want')).toEqual([]);
      expect(s.list('watched')).toEqual([movie(1)]);
      s.setStatus(movie(1), null);
      expect(s.statusOf(1)).toBeNull();
      expect(s.list('watched')).toEqual([]);
    });

    it('mais recente primeiro; remarcar move para o topo', async () => {
      const s = await makeStore();
      s.setStatus(movie(1), 'want');
      s.setStatus(movie(2), 'want');
      expect(s.list('want').map((m) => m.id)).toEqual([2, 1]);
      s.setStatus(movie(1), 'watched');
      s.setStatus(movie(1), 'want');
      expect(s.list('want').map((m) => m.id)).toEqual([1, 2]);
    });

    it('notifica uma vez por mudança, nada sem mudança, e para após cancelar', async () => {
      const s = await makeStore();
      const listener = vi.fn();
      const unsubscribe = s.subscribe(listener);
      s.setStatus(movie(1), 'want');
      expect(listener).toHaveBeenCalledTimes(1);
      s.setStatus(movie(1), 'want');
      expect(listener).toHaveBeenCalledTimes(1);
      s.setStatus(movie(9), null);
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      s.setStatus(movie(2), 'want');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('mesma referência enquanto nada muda; nova após mudar', async () => {
      const s = await makeStore();
      s.setStatus(movie(1), 'want');
      const want = s.list('want');
      expect(s.list('want')).toBe(want);
      s.setStatus(movie(2), 'watched');
      expect(s.list('want')).toBe(want);
      s.setStatus(movie(3), 'want');
      expect(s.list('want')).not.toBe(want);
      expect(s.list('want').map((m) => m.id)).toEqual([3, 1]);
      const watched = s.list('watched');
      const wantNow = s.list('want');
      s.setStatus(movie(9), null);
      expect(s.list('watched')).toBe(watched);
      expect(s.list('want')).toBe(wantNow);
    });

    it('reload resolve sem mudar o estado', async () => {
      const s = await makeStore();
      s.setStatus(movie(1), 'want');
      await s.reload();
      expect(s.list('want')).toEqual([movie(1)]);
      expect(s.list('watched')).toEqual([]);
      expect(s.statusOf(1)).toBe('want');
    });
  });
}
