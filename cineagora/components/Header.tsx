import Link from 'next/link';
import { Suspense } from 'react';
import type { WatchProvider } from '@/lib/tmdb/types';
import { HeaderShell } from './HeaderShell';
import { Logo } from './Logo';
import { ProviderFilter } from './ProviderFilter';
import { SearchBar } from './SearchBar';
import { UserMenu } from './UserMenu';

export function Header({ providers }: { providers: WatchProvider[] | null }) {
  return (
    <HeaderShell>
      <div className="flex items-center gap-2.5 px-4 py-3 sm:gap-6 sm:px-10 sm:py-4">
        <Link href="/" aria-label="CineAgora, início" className="shrink-0 rounded-md">
          <Logo />
        </Link>
        <div className="hidden flex-1 justify-end sm:flex">
          <SearchBar />
        </div>
        <Link
          href="/busca"
          aria-label="Buscar filmes"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-tela ring-1 ring-tela/15 sm:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>
        <ProviderFilter providers={providers} />
        {/* UserMenu lê useSearchParams: em rotas pré-renderizadas precisa de um limite de Suspense. */}
        <Suspense fallback={<span aria-hidden="true" className="h-10 w-10 shrink-0" />}>
          <UserMenu />
        </Suspense>
      </div>
    </HeaderShell>
  );
}
