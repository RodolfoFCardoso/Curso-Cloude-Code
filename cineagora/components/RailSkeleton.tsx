export function RailSkeleton({ title, count = 8 }: { title?: string; count?: number }) {
  return (
    <section aria-label={`Carregando ${title ?? 'filmes'}`} aria-busy="true" className="py-3">
      {title ? (
        <h2 className="font-display mb-2 px-4 text-2xl leading-none font-extrabold text-tela sm:px-10 sm:text-[1.75rem]">
          {title}
        </h2>
      ) : (
        <div className="mx-4 mb-2 h-6 w-44 animate-pulse rounded bg-poltrona sm:mx-10" />
      )}
      <div className="flex gap-2 overflow-hidden px-4 py-2 sm:gap-2.5 sm:px-10">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            data-testid="skeleton-card"
            className="aspect-video w-60 shrink-0 animate-pulse rounded-[4px] bg-poltrona motion-reduce:animate-none sm:w-72 lg:w-80"
          />
        ))}
      </div>
    </section>
  );
}
