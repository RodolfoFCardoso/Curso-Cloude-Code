import { RailSkeleton } from '@/components/RailSkeleton';

export default function Loading() {
  return (
    <div>
      <div aria-hidden="true" className="px-4 pt-20 sm:px-10 sm:pt-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="aspect-video animate-pulse rounded-[3px] bg-poltrona lg:aspect-[2.39/1]" />
            <div className="mt-6 h-20 w-3/5 animate-pulse rounded bg-poltrona sm:ml-6" />
          </div>
          <div className="hidden flex-col gap-3 lg:flex">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded bg-poltrona" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-14">
        {Array.from({ length: 3 }, (_, i) => (
          <RailSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
