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
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({ selectedProviders: [8, 1899] });
    expect(createLocalPreferencesStore(window.localStorage).getSelectedProviders()).toEqual([
      8, 1899,
    ]);
  });

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
