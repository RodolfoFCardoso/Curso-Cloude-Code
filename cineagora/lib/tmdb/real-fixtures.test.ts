import { describe, expect, it } from 'vitest';
import genres from './__fixtures__/real-genres.json';
import details from './__fixtures__/real-movie-details.json';
import list from './__fixtures__/real-movie-list.json';
import providerList from './__fixtures__/real-provider-list.json';
import watch from './__fixtures__/real-watch-providers.json';
import { mapGenres, mapMovieDetails, mapMovieList } from './mappers';
import { mapProviderList, mapWatchProviders } from './providers-mapper';
import type { RawMovieDetails, RawProviderList, RawWatchProviders } from './raw';

// Respostas reais da TMDB (recortadas, 2026-10-30): garantem que os mapeadores
// entendem o formato de verdade, não só as fixtures sintéticas.

const IMG = /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\/.+/;

describe('mapeadores com respostas reais da TMDB', () => {
  it('detalhe de Clube da Luta', () => {
    const d = mapMovieDetails(details as RawMovieDetails);
    expect(d).toMatchObject({ id: 550, title: 'Clube da Luta', year: 1999, runtimeMinutes: 139 });
    expect(d.rating).toBeGreaterThan(0);
    expect(d.posterUrl).toMatch(IMG);
    expect(d.overview.length).toBeGreaterThan(0);
    expect(d.genres.length).toBeGreaterThan(0);
    // Sem trailer em pt, cai para o primeiro Trailer do YouTube.
    expect(d.trailerYoutubeKey).toBe(
      details.videos.results.find((v) => v.type === 'Trailer' && v.site === 'YouTube')!.key,
    );
    expect(d.cast).toHaveLength(10);
    expect(d.cast[0].name).toBe('Edward Norton');
    expect(d.similar.length).toBeGreaterThan(0);
  });

  it('lista de populares', () => {
    const movies = mapMovieList(list);
    expect(movies).toHaveLength(3);
    for (const m of movies) {
      expect(m.id).toBeGreaterThan(0);
      expect(m.title.length).toBeGreaterThan(0);
    }
  });

  it('19 gêneros oficiais em pt-BR', () => {
    const g = mapGenres(genres);
    expect(g).toHaveLength(19);
    expect(g.map((x) => x.name)).toContain('Ação');
  });

  it('onde assistir no BR', () => {
    const p = mapWatchProviders(watch as RawWatchProviders);
    expect(p.link).toContain('locale=BR');
    expect(p.subscription.map((s) => s.name)).toContain('Netflix');
    expect(p.subscription[0].logoUrl).toMatch(IMG);
  });

  it('lista de provedores do BR', () => {
    const p = mapProviderList(providerList as RawProviderList);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x.id > 0 && x.name.length > 0)).toBe(true);
  });
});
