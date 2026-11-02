import type { Metadata } from 'next';
import { EmptyState } from '@/components/EmptyState';
import { MovieCard } from '@/components/MovieCard';
import { SearchBar } from '@/components/SearchBar';
import { logTmdbError } from '@/lib/tmdb/errors';
import { searchMovies } from '@/lib/tmdb/service';
import type { Movie } from '@/lib/tmdb/types';

export const metadata: Metadata = { title: 'Busca' };

export default async function SearchPage({ searchParams }: PageProps<'/busca'>) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';

  let movies: Movie[] | null = [];
  if (q) {
    try {
      movies = await searchMovies(q);
    } catch (err) {
      logTmdbError(err, { busca: q });
      movies = null;
    }
  }

  return (
    <div className="px-4 pt-24 pb-6 sm:px-10 sm:pt-32">
      <div className="mb-6 sm:hidden">
        <SearchBar defaultValue={q} />
      </div>
      <div className="mb-10 hidden sm:block">
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[0.9] font-black text-balance text-tela">
          {q ? `Resultados para "${q}"` : 'Buscar filmes'}
        </h1>
      </div>

      {!q ? (
        <EmptyState title="Digite o nome de um filme para buscar." />
      ) : movies === null ? (
        <EmptyState title="A busca está indisponível agora. Tente novamente em instantes." />
      ) : movies.length === 0 ? (
        <EmptyState title={`Nenhum filme encontrado para "${q}". Tente outro termo.`} />
      ) : (
        <ul className="grid grid-cols-1 gap-x-2.5 gap-y-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {movies.map((m) => (
            <li key={m.id}>
              <MovieCard movie={m} fluid />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
