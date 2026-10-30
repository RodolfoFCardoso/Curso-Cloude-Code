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
      className={`inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-semibold ring-1 backdrop-blur-md transition-colors ${
        active
          ? 'bg-tela text-veludo ring-tela hover:bg-tela/85'
          : 'bg-tela/10 text-tela ring-tela/30 hover:bg-tela/20'
      }`}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {active ? '✓' : '+'}
      </span>
      {active ? 'Remover da minha lista' : 'Adicionar à minha lista'}
    </button>
  );
}
