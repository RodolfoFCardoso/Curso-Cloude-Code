'use client';

import Link from 'next/link';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import type { HomeTab } from '@/lib/home-tabs';
import type { MovieStatus } from '@/lib/store/types';
import { EmptyState } from './EmptyState';
import { MovieCard } from './MovieCard';

const STATUS_TAB: Record<MovieStatus, HomeTab> = {
  want: 'quero-assistir',
  watched: 'ja-assisti',
};

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6';

export function MovieListPanel({ status }: { status: MovieStatus }) {
  const { user } = useAuth();
  const { ready, error, list, reload } = useMovieList();

  // Sessão expirada (ou Sair em outra aba): mesmo convite do deslogado.
  if (!user || error === 'unauthenticated') {
    const voltar = encodeURIComponent(`/?aba=${STATUS_TAB[status]}`);
    return (
      <EmptyState
        title="Entre para montar suas listas"
        message="Marque filmes como Quero assistir ou Já assisti e eles aparecem aqui."
        action={
          <Link
            href={`/entrar?voltar=${voltar}`}
            className="inline-block rounded-full bg-projetor px-5 py-2 text-sm font-semibold text-veludo"
          >
            Entrar
          </Link>
        }
      />
    );
  }

  if (error === 'load') {
    return (
      <EmptyState
        title="Não foi possível carregar suas listas"
        action={
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-full bg-projetor px-5 py-2 text-sm font-semibold text-veludo"
          >
            Tentar de novo
          </button>
        }
      />
    );
  }

  if (!ready) {
    return (
      <div className={GRID} aria-busy="true">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            data-testid="list-skeleton"
            className="aspect-[2/3] animate-pulse rounded-md bg-poltrona motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  const movies = list(status);
  if (movies.length === 0) {
    return (
      <EmptyState title="Nada aqui ainda." message="Abra um filme e marque Quero assistir." />
    );
  }

  return (
    <div className={GRID}>
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} fluid />
      ))}
    </div>
  );
}
