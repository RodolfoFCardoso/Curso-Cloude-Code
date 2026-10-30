'use client';

import { useFavorites } from '@/lib/store/PreferencesProvider';
import { Row } from './Row';

export function FavoritesRow() {
  const { favorites } = useFavorites();
  if (!favorites?.length) return null;
  return <Row title="Minha lista" items={favorites.map((movie) => ({ movie, badges: [] }))} />;
}
