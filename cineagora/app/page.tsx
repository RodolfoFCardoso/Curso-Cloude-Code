import { Suspense } from 'react';
import { FilterableRow } from '@/components/FilterableRow';
import { HomeHero } from '@/components/HomeHero';
import { HomeTabs } from '@/components/HomeTabs';
import { Notice } from '@/components/Notice';
import { RatingFilter } from '@/components/RatingFilter';
import { FilteredEmptyNotice, RailStatusProvider } from '@/components/RailStatus';
import { loadFeatured } from '@/lib/featured';
import { loadHomeRails } from '@/lib/rails';

export default async function Home() {
  const [rails, featured] = await Promise.all([loadHomeRails(), loadFeatured()]);
  return (
    <>
      <Suspense fallback={null}>
        <Notice />
      </Suspense>
      <h1 className="sr-only">CineAgora: o que assistir nos seus streamings</h1>
      {featured.length > 0 ? <HomeHero featured={featured} /> : <div className="h-20" />}
      <HomeTabs>
        <div className="mt-14">
          <RatingFilter />
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
      </HomeTabs>
    </>
  );
}
