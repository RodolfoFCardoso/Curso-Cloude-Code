import { RailSkeleton } from '@/components/RailSkeleton';

export default function Loading() {
  return (
    <div className="py-4">
      {Array.from({ length: 4 }, (_, i) => (
        <RailSkeleton key={i} />
      ))}
    </div>
  );
}
