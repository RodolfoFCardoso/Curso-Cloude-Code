import Link from 'next/link';
import type { WatchProvider } from '@/lib/tmdb/types';
import { ProviderFilter } from './ProviderFilter';
import { SearchBar } from './SearchBar';

export function Header({ providers }: { providers: WatchProvider[] | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/85 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:gap-6 sm:px-8">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-zinc-100">
          Cine<span className="text-amber-400">Agora</span>
        </Link>
        <div className="flex flex-1 justify-end sm:justify-center">
          <SearchBar />
        </div>
        <ProviderFilter providers={providers} />
      </div>
    </header>
  );
}
