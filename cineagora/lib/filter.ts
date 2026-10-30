import type { Movie, RailItem, WatchProvider, WatchProviders } from './tmdb/types';

// "Meus streamings": conta o que a pessoa já pode ver — assinatura e grátis/com anúncios.
// Alugar e comprar são pagos à parte e não contam.

export function matchingProviders(p: WatchProviders, selected: number[]): WatchProvider[] {
  const wanted = new Set(selected);
  const seen = new Set<number>();
  return [...p.subscription, ...p.free].filter(
    (provider) => wanted.has(provider.id) && !seen.has(provider.id) && seen.add(provider.id),
  );
}

export function matchesProviders(p: WatchProviders, selected: number[]): boolean {
  return selected.length === 0 || matchingProviders(p, selected).length > 0;
}

export async function filterRail(
  movies: Movie[],
  selected: number[],
  getProviders: (movieId: number) => Promise<WatchProviders>,
): Promise<RailItem[]> {
  if (selected.length === 0) return movies.map((movie) => ({ movie, badges: [] }));

  const results = await Promise.allSettled(movies.map((m) => getProviders(m.id)));
  return movies.flatMap((movie, i) => {
    const result = results[i];
    // Sem como confirmar a disponibilidade, o filme sai do trilho filtrado.
    if (result.status === 'rejected') return [];
    const badges = matchingProviders(result.value, selected);
    return badges.length > 0 ? [{ movie, badges }] : [];
  });
}
