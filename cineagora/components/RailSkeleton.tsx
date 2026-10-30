export function RailSkeleton({ title, count = 8 }: { title?: string; count?: number }) {
  return (
    <section aria-label={`Carregando ${title ?? 'filmes'}`} aria-busy="true" className="py-3">
      {title ? (
        <h2 className="mb-3 px-4 text-lg font-semibold text-zinc-100 sm:px-8">{title}</h2>
      ) : (
        <div className="mx-4 mb-3 h-6 w-40 animate-pulse rounded bg-zinc-800 sm:mx-8" />
      )}
      <div className="flex gap-3 overflow-hidden px-4 sm:px-8">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} data-testid="skeleton-card" className="w-36 shrink-0 sm:w-40">
            <div className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </section>
  );
}
