'use client';

import { useFavorites } from '@/lib/store/PreferencesProvider';
import type { Movie } from '@/lib/tmdb/types';

export function FavoriteButton({ movie }: { movie: Movie }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(movie.id);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => toggle(movie)}
      className={`self-start rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
        active
          ? 'bg-amber-400 text-zinc-950 ring-amber-400 hover:bg-amber-300'
          : 'text-zinc-100 ring-white/20 hover:bg-zinc-800'
      }`}
    >
      <span aria-hidden="true">{active ? '✓ ' : '+ '}</span>
      {active ? 'Remover da minha lista' : 'Adicionar à minha lista'}
    </button>
  );
}
