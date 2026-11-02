'use client';

import Link from 'next/link';
import { useAuth, useMovieList } from '@/lib/auth/AuthProvider';
import {
  LIST_LABEL,
  LIST_STATUS,
  listHref,
  PROFILE_LISTS,
  type ProfileList,
} from '@/lib/profile-lists';
import { MovieListPanel } from './MovieListPanel';

/** Seletor das listas do perfil (links: cada lista tem seu endereço) e a grade da lista ativa. */
export function ProfileLists({ active }: { active: ProfileList }) {
  const { user } = useAuth();
  const { ready, list } = useMovieList();
  const showCounts = !!user && ready;

  return (
    <>
      <nav aria-label="Suas listas" className="flex gap-6 border-b border-cortina">
        {PROFILE_LISTS.map((l) => {
          const current = l === active;
          return (
            <Link
              key={l}
              href={listHref(l)}
              replace
              scroll={false}
              aria-current={current ? 'page' : undefined}
              className={`-mb-px border-b-2 pb-3 text-base font-semibold transition-colors sm:text-lg ${
                current
                  ? 'border-folha text-tela'
                  : 'border-transparent text-penumbra hover:text-tela'
              }`}
            >
              {LIST_LABEL[l]}
              {showCounts && (
                <span className="ml-2 text-sm font-normal text-penumbra tabular-nums">
                  {list(LIST_STATUS[l]).length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">
        <MovieListPanel status={LIST_STATUS[active]} />
      </div>
    </>
  );
}
