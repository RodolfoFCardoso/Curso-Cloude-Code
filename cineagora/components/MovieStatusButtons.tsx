'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import type { MovieListError, MovieStatus } from '@/lib/store/types';
import type { Movie } from '@/lib/tmdb/types';

const OPTIONS: { status: MovieStatus; symbol: string; label: string }[] = [
  { status: 'want', symbol: '+', label: 'Quero assistir' },
  { status: 'watched', symbol: '✓', label: 'Já assisti' },
];

export function MovieStatusButtons({ movie }: { movie: Movie }) {
  const { user, available } = useAuth();
  const { ready, error, statusOf, setStatus, reload } = useMovieList();
  const router = useRouter();
  const pathname = usePathname();
  const enterUrl = `/entrar?voltar=${encodeURIComponent(pathname)}`;

  // O store sobrevive à navegação: ao voltar do login ele ainda guarda 'unauthenticated'.
  // Já montado com esse erro, recarrega (limpa se a sessão voltou); só redireciona na transição.
  // Se a sessão continua expirada, o reload reemite o mesmo erro (sem transição): confere depois dele.
  const previous = useRef<MovieListError | null | undefined>(undefined);
  const alive = useRef(true);
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const before = previous.current;
    previous.current = error;
    if (error !== 'unauthenticated' || before === 'unauthenticated') return;
    if (before === undefined) {
      // reload() nunca rejeita (o store captura os erros); o estado novo é conferido no efeito abaixo.
      void reload().then(() => {
        if (alive.current) setRecheck((n) => n + 1);
      });
    } else {
      router.push(enterUrl);
    }
  }, [error, router, enterUrl, reload]);
  // Depois do reload, `error` vem do snapshot atual do store (não de um ref que pode estar velho).
  useEffect(() => {
    if (recheck > 0 && error === 'unauthenticated') router.push(enterUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reavalia quando o reload termina
  }, [recheck]);

  if (!available) return null;

  const current = statusOf(movie.id);
  const loadFailed = !!user && error === 'load';

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
              disabled={(!!user && !ready) || loadFailed}
              onClick={() => onClick(o.status)}
              className={`inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-semibold ring-1 backdrop-blur-md transition-colors disabled:opacity-60 ${
                active
                  ? 'bg-tela text-veludo ring-tela hover:bg-tela/85'
                  : 'bg-tela/10 text-tela ring-tela/30 hover:bg-tela/20'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {active ? '✓' : o.symbol}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>
      {loadFailed && (
        <p role="status" className="flex flex-wrap items-center gap-2 text-sm text-tela/80">
          Não foi possível carregar suas listas.
          <button
            type="button"
            onClick={() => void reload()}
            className="font-semibold text-tela underline underline-offset-2 hover:text-tela/80"
          >
            Tentar de novo
          </button>
        </p>
      )}
      {error === 'save' && (
        <p role="status" className="text-sm text-tela/80">
          Não foi possível salvar, tente de novo.
        </p>
      )}
    </div>
  );
}
