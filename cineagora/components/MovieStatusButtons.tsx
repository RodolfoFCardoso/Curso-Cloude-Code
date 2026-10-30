'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import type { MovieStatus } from '@/lib/store/types';
import type { Movie } from '@/lib/tmdb/types';

const OPTIONS: { status: MovieStatus; symbol: string; activeSymbol: string; label: string }[] = [
  { status: 'want', symbol: '+', activeSymbol: '✓', label: 'Quero assistir' },
  { status: 'watched', symbol: '✓', activeSymbol: '✓', label: 'Já assisti' },
];

export function MovieStatusButtons({ movie }: { movie: Movie }) {
  const { user, available } = useAuth();
  const { ready, error, statusOf, setStatus } = useMovieList();
  const router = useRouter();
  const pathname = usePathname();
  const enterUrl = `/entrar?voltar=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    if (error === 'unauthenticated') router.push(enterUrl);
  }, [error, router, enterUrl]);

  if (!available) return null;

  const current = statusOf(movie.id);

  function onClick(status: MovieStatus) {
    if (!user) {
      router.push(enterUrl);
      return;
    }
    setStatus(movie, current === status ? null : status);
  }

  return (
    <div className="flex flex-col gap-2 self-start">
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((o) => {
          const active = current === o.status;
          return (
            <button
              key={o.status}
              type="button"
              aria-pressed={active}
              disabled={!!user && !ready}
              onClick={() => onClick(o.status)}
              className={`inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-semibold ring-1 backdrop-blur-md transition-colors disabled:opacity-60 ${
                active
                  ? 'bg-tela text-veludo ring-tela hover:bg-tela/85'
                  : 'bg-tela/10 text-tela ring-tela/30 hover:bg-tela/20'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {active ? o.activeSymbol : o.symbol}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      {error === 'save' && (
        <p role="status" className="text-sm text-tela/80">
          Não foi possível salvar, tente de novo.
        </p>
      )}
    </div>
  );
}
