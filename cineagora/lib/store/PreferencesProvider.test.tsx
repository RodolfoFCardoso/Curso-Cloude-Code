import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createLocalPreferencesStore } from './local-preferences';
import { PreferencesProvider, usePreferences } from './PreferencesProvider';

function Probe() {
  const { selected, setSelected } = usePreferences();
  return (
    <button onClick={() => setSelected([8])}>
      {selected === null ? 'sem-hidratar' : `ids:${selected.join(',')}`}
    </button>
  );
}

describe('PreferencesProvider', () => {
  it('no servidor selected é null', () => {
    const html = renderToString(
      <PreferencesProvider store={createLocalPreferencesStore(null)}>
        <Probe />
      </PreferencesProvider>,
    );
    expect(html).toContain('sem-hidratar');
  });

  it('no cliente reflete o store e re-renderiza ao mudar', () => {
    const store = createLocalPreferencesStore(null);
    store.setSelectedProviders([1899]);
    render(
      <PreferencesProvider store={store}>
        <Probe />
      </PreferencesProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('ids:1899');
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button')).toHaveTextContent('ids:8');
    expect(store.getSelectedProviders()).toEqual([8]);
  });

  it('usePreferences fora do provider lança erro claro', () => {
    expect(() => render(<Probe />)).toThrow(/PreferencesProvider/);
  });
});
