'use client';

import Link from 'next/link';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import { LIST_LABEL, listHref, STATUS_LIST } from '@/lib/profile-lists';
import type { MovieStatus } from '@/lib/store/types';
import { EmptyState } from './EmptyState';
import { MovieCard } from './MovieCard';

const GRID =
  'grid grid-cols-1 gap-x-2.5 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

export function MovieListPanel({ status }: { status: MovieStatus }) {
  const { user } = useAuth();
  const { ready, error, list, reload } = useMovieList();

  // Sessão expirada (ou Sair em outra aba): mesmo convite do deslogado.
  if (!user || error === 'unauthenticated') {
    const voltar = encodeURIComponent(listHref(STATUS_LIST[status]));
    return (
      <EmptyState
        title="Entre para montar suas listas"
        message="Marque filmes como Quero assistir ou Já assisti e eles aparecem aqui."
        action={
          <Link
            href={`/entrar?voltar=${voltar}`}
            className="inline-block rounded-md bg-projetor px-5 py-2 text-sm font-semibold text-tela"
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
            className="rounded-md bg-projetor px-5 py-2 text-sm font-semibold text-tela"
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
            className="aspect-video animate-pulse rounded-[4px] bg-poltrona motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }

  const movies = list(status);
  if (movies.length === 0) {
    return (
      <EmptyState
        title="Nada aqui ainda."
        message={`Abra um filme e marque ${LIST_LABEL[STATUS_LIST[status]]}.`}
      />
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
