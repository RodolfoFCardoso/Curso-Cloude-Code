import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createLocalPreferencesStore } from '@/lib/store/local-preferences';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { RatingFilter } from './RatingFilter';

function setup() {
  const store = createLocalPreferencesStore(null);
  render(
    <PreferencesProvider store={store}>
      <RatingFilter />
    </PreferencesProvider>,
  );
  return { store, user: userEvent.setup() };
}

describe('RatingFilter', () => {
  it('mostra as opções num grupo, com Todas marcada por padrão', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Nota mínima' })).toBeInTheDocument();
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Todas', '6+', '7+', '8+']);
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '8+' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicar num chip salva a nota e marca só ele', async () => {
    const { store, user } = setup();
    await user.click(screen.getByRole('button', { name: '8+' }));
    expect(store.getMinRating()).toBe(8);
    expect(screen.getByRole('button', { name: '8+' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Todas' }));
    expect(store.getMinRating()).toBe(0);
  });

  it('no servidor nenhum chip aparece marcado (ainda não leu o salvo)', () => {
    const html = renderToString(
      <PreferencesProvider store={createLocalPreferencesStore(null)}>
        <RatingFilter />
      </PreferencesProvider>,
    );
    expect(html).not.toContain('aria-pressed="true"');
  });
});
