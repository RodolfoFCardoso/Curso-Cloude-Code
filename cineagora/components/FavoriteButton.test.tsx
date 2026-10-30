import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLocalFavoritesStore } from '@/lib/store/local-favorites';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import type { Movie } from '@/lib/tmdb/types';
import { FavoriteButton } from './FavoriteButton';
import { FavoritesRow } from './FavoritesRow';

const movie: Movie = {
  id: 550,
  title: 'Clube da Luta',
  year: 1999,
  rating: 8.4,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
};

function setup() {
  const favorites = createLocalFavoritesStore(null);
  render(
    <PreferencesProvider favoritesStore={favorites}>
      <FavoriteButton movie={movie} />
      <FavoritesRow />
    </PreferencesProvider>,
  );
  return { favorites, user: userEvent.setup() };
}

describe('FavoriteButton + FavoritesRow', () => {
  it('alterna aria-pressed e o texto, e o trilho Minha lista aparece', async () => {
    const { favorites, user } = setup();
    const button = screen.getByRole('button', { name: 'Adicionar à minha lista' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: 'Minha lista' })).not.toBeInTheDocument();

    await user.click(button);
    expect(screen.getByRole('button', { name: 'Remover da minha lista' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(favorites.has(550)).toBe(true);
    expect(screen.getByRole('region', { name: 'Minha lista' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover da minha lista' }));
    expect(favorites.has(550)).toBe(false);
    expect(screen.queryByRole('region', { name: 'Minha lista' })).not.toBeInTheDocument();
  });
});
