import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createLocalPreferencesStore } from '@/lib/store/local-preferences';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { OPEN_PROVIDER_FILTER_EVENT } from './ProviderFilter';
import {
  FilteredEmptyNotice,
  RailStatusProvider,
  useRailAttempt,
  useReportRailStatus,
  type RailState,
} from './RailStatus';

function Reporter({ id, state }: { id: string; state: RailState }) {
  useReportRailStatus(id, state);
  return null;
}

function AttemptProbe() {
  return <output data-testid="attempt">{useRailAttempt()}</output>;
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
        <AttemptProbe />
      </RailStatusProvider>
    </PreferencesProvider>,
  );
}

const MESSAGE = 'Nenhum filme dos seus streamings nestes trilhos';

describe('FilteredEmptyNotice', () => {
  it('todos com erro: mostra indisponível e Tentar novamente busca de novo', async () => {
    setup(['error', 'error']);
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Não foi possível carregar seus streamings agora.' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('attempt')).toHaveTextContent('0');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.getByTestId('attempt')).toHaveTextContent('1');
  });

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
