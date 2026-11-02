import { RailSkeleton } from '@/components/RailSkeleton';

export default function Loading() {
  return (
    <div>
      <div
        aria-hidden="true"
        className="flex min-h-[560px] items-end bg-gradient-to-t from-poltrona to-veludo px-4 pb-16 sm:min-h-[620px] sm:px-10 lg:h-[min(56.25vw,88vh)] lg:pb-[13vw]"
      >
        <div className="w-full max-w-2xl">
          <div className="h-24 w-4/5 animate-pulse rounded bg-cortina/60" />
          <div className="mt-5 h-4 w-1/2 animate-pulse rounded bg-cortina/60" />
          <div className="mt-6 h-12 w-40 animate-pulse rounded-md bg-cortina/60" />
        </div>
      </div>
      <div className="relative lg:-mt-[9vw]">
        {Array.from({ length: 3 }, (_, i) => (
          <RailSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
