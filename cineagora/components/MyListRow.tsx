'use client';

import Link from 'next/link';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import { listHref } from '@/lib/profile-lists';
import { Row } from './Row';

/** "Quero assistir" do usuário como primeiro trilho da home; some se a lista estiver vazia. */
export function MyListRow() {
  const { user } = useAuth();
  const { ready, error, list } = useMovieList();
  if (!user || !ready || error) return null;
  const movies = list('want');
  if (movies.length === 0) return null;
  return (
    <Row
      title="Quero assistir"
      items={movies.map((movie) => ({ movie, badges: [] }))}
      action={
        <Link
          href={listHref('quero-assistir')}
          className="text-sm font-semibold text-folha underline-offset-4 hover:underline"
        >
          Ver lista completa
        </Link>
      }
    />
  );
}
