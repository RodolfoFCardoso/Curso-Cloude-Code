import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createLocalPreferencesStore } from '@/lib/store/local-preferences';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { OPEN_PROVIDER_FILTER_EVENT } from './ProviderFilter';
import {
  FilteredEmptyNotice,
  RailStatusProvider,
  useReportRailStatus,
  type RailState,
} from './RailStatus';

function Reporter({ id, state }: { id: string; state: RailState }) {
  useReportRailStatus(id, state);
  return null;
}

function setup(states: RailState[], selected: number[] = [8]) {
  const store = createLocalPreferencesStore(null);
  store.setSelectedProviders(selected);
  render(
    <PreferencesProvider store={store}>
      <RailStatusProvider total={states.length}>
        {states.map((s, i) => (
          <Reporter key={i} id={`r${i}`} state={s} />
        ))}
        <FilteredEmptyNotice />
      </RailStatusProvider>
    </PreferencesProvider>,
  );
}

const MESSAGE = 'Nenhum filme dos seus streamings nestes trilhos';

describe('FilteredEmptyNotice', () => {
  it('aparece quando todos os trilhos ficaram vazios ou com erro', () => {
    setup(['empty', 'error']);
    expect(screen.getByRole('heading', { name: MESSAGE })).toBeInTheDocument();
  });

  it('não aparece se algum trilho tem filmes', () => {
    setup(['empty', 'shown']);
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it('não aparece enquanto algum trilho carrega', () => {
    setup(['empty', 'loading']);
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it('não aparece sem filtro ativo', () => {
    setup(['empty', 'empty'], []);
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  it('o botão abre o painel Meus streamings', async () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_PROVIDER_FILTER_EVENT, listener);
    setup(['empty']);
    await userEvent.click(screen.getByRole('button', { name: 'Ajustar meus streamings' }));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(OPEN_PROVIDER_FILTER_EVENT, listener);
  });
});
