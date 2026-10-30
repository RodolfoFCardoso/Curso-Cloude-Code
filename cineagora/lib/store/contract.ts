import { describe, expect, it, vi } from 'vitest';
import type { PreferencesStore } from './types';

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
