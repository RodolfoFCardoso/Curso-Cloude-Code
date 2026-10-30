import { beforeEach, describe, expect, it } from 'vitest';
import { runPreferencesStoreContract } from './contract';
import { createLocalPreferencesStore } from './local-preferences';

const KEY = 'cineagora:prefs:v1';

beforeEach(() => {
  window.localStorage.clear();
});

runPreferencesStoreContract('localStorage', () => createLocalPreferencesStore(window.localStorage));
runPreferencesStoreContract('memória (sem storage)', () => createLocalPreferencesStore(null));

describe('createLocalPreferencesStore', () => {
  it('persiste na chave cineagora:prefs:v1 e outra instância lê o valor', () => {
    createLocalPreferencesStore(window.localStorage).setSelectedProviders([8, 1899]);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({
      selectedProviders: [8, 1899],
      minRating: 0,
    });
    expect(createLocalPreferencesStore(window.localStorage).getSelectedProviders()).toEqual([
      8, 1899,
    ]);
  });

  it('persiste a nota mínima junto com os serviços', () => {
    const store = createLocalPreferencesStore(window.localStorage);
    store.setSelectedProviders([8]);
    store.setMinRating(8);
    const other = createLocalPreferencesStore(window.localStorage);
    expect(other.getMinRating()).toBe(8);
    expect(other.getSelectedProviders()).toEqual([8]);
  });

  it('lê o formato antigo (só serviços) com nota Todas', () => {
    window.localStorage.setItem(KEY, '{"selectedProviders":[8]}');
    const store = createLocalPreferencesStore(window.localStorage);
    expect(store.getSelectedProviders()).toEqual([8]);
    expect(store.getMinRating()).toBe(0);
  });

  it.each(['{"minRating":9}', '{"minRating":"8"}', '{oops'])(
    'nota salva inválida (%s) vira Todas',
    (raw) => {
      window.localStorage.setItem(KEY, raw);
      expect(createLocalPreferencesStore(window.localStorage).getMinRating()).toBe(0);
    },
  );

  it.each(['{oops', '{"selectedProviders":"x"}', '[1,2]', 'null', '{"selectedProviders":[8,"a"]}'])(
    'valor salvo corrompido (%s) vira lista vazia ou só os ids válidos',
    (raw) => {
      window.localStorage.setItem(KEY, raw);
      const selected = createLocalPreferencesStore(window.localStorage).getSelectedProviders();
      expect(selected.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
      expect(selected.length).toBeLessThanOrEqual(1);
    },
  );

  it('storage que lança no setItem/getItem segue funcionando em memória', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    const store = createLocalPreferencesStore(broken);
    expect(store.getSelectedProviders()).toEqual([]);
    expect(() => store.setSelectedProviders([8])).not.toThrow();
    expect(store.getSelectedProviders()).toEqual([8]);
  });
});
