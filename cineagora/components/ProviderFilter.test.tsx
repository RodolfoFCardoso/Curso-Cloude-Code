import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLocalPreferencesStore } from '@/lib/store/local-preferences';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import type { WatchProvider } from '@/lib/tmdb/types';
import { OPEN_PROVIDER_FILTER_EVENT, ProviderFilter } from './ProviderFilter';

const providers: WatchProvider[] = [
  { id: 8, name: 'Netflix', logoUrl: null },
  { id: 1899, name: 'Max', logoUrl: null },
  { id: 307, name: 'Globoplay', logoUrl: null },
];

function setup(list: WatchProvider[] | null = providers) {
  const store = createLocalPreferencesStore(null);
  render(
    <PreferencesProvider store={store}>
      <ProviderFilter providers={list} />
    </PreferencesProvider>,
  );
  return { store, user: userEvent.setup() };
}

describe('ProviderFilter', () => {
  it('abre o painel e marcar um serviço salva no store', async () => {
    const { store, user } = setup();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /meus streamings/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Netflix' }));
    expect(store.getSelectedProviders()).toEqual([8]);
    expect(screen.getByRole('button', { name: 'Meus streamings (1)' })).toBeInTheDocument();
  });

  it('Limpar desmarca tudo', async () => {
    const { store, user } = setup();
    act(() => store.setSelectedProviders([8, 1899]));
    await user.click(screen.getByRole('button', { name: /meus streamings/i }));
    expect(screen.getByRole('checkbox', { name: 'Max' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(store.getSelectedProviders()).toEqual([]);
  });

  it('busca dentro do painel ignora maiúsculas e acentos', async () => {
    const { user } = setup([...providers, { id: 99, name: 'Cinépolis Klic', logoUrl: null }]);
    await user.click(screen.getByRole('button', { name: /meus streamings/i }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar serviço' }), 'MAX');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    await user.clear(screen.getByRole('searchbox', { name: 'Buscar serviço' }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar serviço' }), 'cinepolis');
    expect(screen.getByRole('checkbox', { name: 'Cinépolis Klic' })).toBeInTheDocument();
  });

  it('sem lista mostra mensagem e nenhuma checkbox', async () => {
    const { user } = setup(null);
    await user.click(screen.getByRole('button', { name: /meus streamings/i }));
    expect(screen.getByText('Não foi possível carregar os serviços agora.')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('abre ao receber o evento global', () => {
    setup();
    act(() => {
      window.dispatchEvent(new Event(OPEN_PROVIDER_FILTER_EVENT));
    });
    expect(screen.getByRole('dialog', { name: 'Meus streamings' })).toBeInTheDocument();
  });

  it('Escape fecha o painel', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /meus streamings/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
