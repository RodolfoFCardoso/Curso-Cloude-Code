export function SearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/busca" method="get" role="search" className="w-full max-w-sm">
      <input
        type="search"
        name="q"
        aria-label="Buscar filmes"
        placeholder="Buscar filmes…"
        defaultValue={defaultValue}
        className="w-full rounded-full bg-zinc-800/80 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-white/10 focus:ring-amber-400"
      />
    </form>
  );
}
