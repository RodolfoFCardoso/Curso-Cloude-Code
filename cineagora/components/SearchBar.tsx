export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/busca" method="get" role="search" className="w-full max-w-xs">
      <label className="group relative block">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-4 w-4 -translate-y-1/2 text-penumbra transition-colors group-focus-within:text-folha"
        >
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="q"
          aria-label="Buscar filmes"
          placeholder="Buscar filmes…"
          defaultValue={defaultValue}
          className="w-full rounded-full bg-veludo/50 py-2 pr-4 pl-10 text-sm text-tela ring-1 ring-tela/15 backdrop-blur-sm outline-none placeholder:text-penumbra transition focus:bg-poltrona focus:ring-folha focus-visible:outline-none"
        />
      </label>
    </form>
  );
}
