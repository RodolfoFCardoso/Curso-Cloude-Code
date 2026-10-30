import { describe, expect, it } from 'vitest';
import listFixture from './__fixtures__/provider-list.json';
import watchFixture from './__fixtures__/watch-providers.json';
import { EMPTY_PROVIDERS, mapProviderList, mapWatchProviders } from './providers-mapper';

const logo = (p: string) => `https://image.tmdb.org/t/p/w92${p}`;
const names = (ps: { name: string }[]) => ps.map((p) => p.name);

describe('mapWatchProviders', () => {
  const result = mapWatchProviders(watchFixture);

  it('assinatura ordenada por display_priority, com logo w92', () => {
    expect(result.subscription).toEqual([
      { id: 1899, name: 'Max', logoUrl: logo('/max.jpg') },
      { id: 8, name: 'Netflix', logoUrl: logo('/netflix.jpg') },
    ]);
  });

  it('grátis junta free e ads sem duplicar', () => {
    expect(names(result.free)).toEqual(['Pluto TV', 'Tubi']);
  });

  it('alugar, comprar e link vêm do BR', () => {
    expect(names(result.rent)).toEqual(['Apple TV']);
    expect(names(result.buy)).toEqual(['Apple TV', 'Google Play Filmes']);
    expect(result.link).toBe('https://www.themoviedb.org/movie/550-fight-club/watch?locale=BR');
  });

  it('nunca usa dados de outra região', () => {
    const all = [...result.subscription, ...result.free, ...result.rent, ...result.buy];
    expect(all.some((p) => p.id === 15)).toBe(false);
  });

  it('sem BR devolve EMPTY_PROVIDERS', () => {
    expect(mapWatchProviders({ results: { US: watchFixture.results.US } })).toEqual(
      EMPTY_PROVIDERS,
    );
    expect(mapWatchProviders({})).toEqual(EMPTY_PROVIDERS);
  });
});

describe('mapProviderList', () => {
  it('ordena pela prioridade do BR, caindo para display_priority', () => {
    expect(mapProviderList(listFixture)).toEqual([
      { id: 8, name: 'Netflix', logoUrl: logo('/netflix.jpg') },
      { id: 9999, name: 'Serviço Sem BR', logoUrl: null },
      { id: 337, name: 'Disney Plus', logoUrl: logo('/disney.jpg') },
    ]);
  });
});
