import { describe, expect, it, vi } from 'vitest';
import { filterByRating, filterRail, matchesProviders, matchingProviders } from './filter';
import { EMPTY_PROVIDERS } from './tmdb/providers-mapper';
import type { Movie, WatchProvider, WatchProviders } from './tmdb/types';

const netflix: WatchProvider = { id: 8, name: 'Netflix', logoUrl: null };
const max: WatchProvider = { id: 1899, name: 'Max', logoUrl: null };

const movie = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  year: 2020,
  rating: 7,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});

const providers = (p: Partial<WatchProviders>): WatchProviders => ({ ...EMPTY_PROVIDERS, ...p });

describe('matchesProviders / matchingProviders', () => {
  it('sem seleção tudo casa', () => {
    expect(matchesProviders(EMPTY_PROVIDERS, [])).toBe(true);
  });

  it('assinatura e grátis contam; alugar e comprar não', () => {
    expect(matchesProviders(providers({ subscription: [netflix] }), [8])).toBe(true);
    expect(matchesProviders(providers({ free: [netflix] }), [8])).toBe(true);
    expect(matchesProviders(providers({ rent: [netflix], buy: [netflix] }), [8])).toBe(false);
    expect(matchesProviders(EMPTY_PROVIDERS, [8])).toBe(false);
  });

  it('badges sem duplicatas', () => {
    const p = providers({ subscription: [netflix, max], free: [netflix] });
    expect(matchingProviders(p, [8, 1899])).toEqual([netflix, max]);
  });
});

describe('filterByRating', () => {
  const rated = (id: number, rating: number | null) => ({
    movie: { ...movie(id), rating },
    badges: [],
  });

  it('Todas (0) devolve a mesma lista, inclusive sem nota', () => {
    const items = [rated(1, null), rated(2, 5)];
    expect(filterByRating(items, 0)).toBe(items);
  });

  it('mantém notas iguais ou acima do mínimo e tira as sem nota', () => {
    const items = [rated(1, 8), rated(2, 7.9), rated(3, 9.1), rated(4, null)];
    expect(filterByRating(items, 8).map((i) => i.movie.id)).toEqual([1, 3]);
  });
});

describe('filterRail', () => {
  it('sem seleção devolve todos sem badges e não consulta provedores', async () => {
    const getProviders = vi.fn();
    const { items, failures } = await filterRail([movie(1), movie(2)], [], getProviders);
    expect(failures).toBe(0);
    expect(items).toEqual([
      { movie: movie(1), badges: [] },
      { movie: movie(2), badges: [] },
    ]);
    expect(getProviders).not.toHaveBeenCalled();
  });

  it('mantém só os disponíveis nos serviços marcados, na ordem original', async () => {
    const byId: Record<number, WatchProviders> = {
      1: providers({ subscription: [netflix] }),
      2: providers({ rent: [netflix] }),
      3: EMPTY_PROVIDERS,
      4: providers({ free: [netflix] }),
    };
    const { items, failures } = await filterRail(
      [1, 2, 3, 4].map(movie),
      [8],
      async (id) => byId[id],
    );
    expect(failures).toBe(0);
    expect(items).toEqual([
      { movie: movie(1), badges: [netflix] },
      { movie: movie(4), badges: [netflix] },
    ]);
  });

  it('falha ao consultar um filme exclui só esse filme', async () => {
    const { items, failures } = await filterRail([1, 2, 3].map(movie), [8], async (id) => {
      if (id === 2) throw new Error('TMDB fora');
      return providers({ subscription: [netflix] });
    });
    expect(items.map((i) => i.movie.id)).toEqual([1, 3]);
    expect(failures).toBe(1);
  });
});
