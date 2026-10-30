export function RailSkeleton({ title, count = 8 }: { title?: string; count?: number }) {
  return (
    <section aria-label={`Carregando ${title ?? 'filmes'}`} aria-busy="true" className="py-4">
      {title ? (
        <h2 className="font-display mb-4 px-4 text-[1.75rem] leading-none font-extrabold text-tela sm:px-10 sm:text-[2rem]">
          {title}
        </h2>
      ) : (
        <div className="mx-4 mb-4 h-7 w-44 animate-pulse rounded bg-poltrona sm:mx-10" />
      )}
      <div className="flex gap-3 overflow-hidden px-4 pt-2 sm:gap-4 sm:px-10">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} data-testid="skeleton-card" className="w-36 shrink-0 sm:w-44 lg:w-48">
            <div className="aspect-[2/3] animate-pulse rounded-md bg-poltrona" />
            <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-poltrona" />
          </div>
        ))}
      </div>
    </section>
  );
}
