import { FavoritesRow } from '@/components/FavoritesRow';
import { FilterableRow } from '@/components/FilterableRow';
import { FilteredEmptyNotice, RailStatusProvider } from '@/components/RailStatus';
import { loadHomeRails } from '@/lib/rails';

export default async function Home() {
  const rails = await loadHomeRails();
  return (
    <div className="py-4">
      <FavoritesRow />
      <RailStatusProvider total={rails.length}>
        {rails.map((rail) => (
          <FilterableRow
            key={rail.key}
            railKey={rail.key}
            title={rail.title}
            initialMovies={rail.movies}
          />
        ))}
        <FilteredEmptyNotice />
      </RailStatusProvider>
    </div>
  );
}
