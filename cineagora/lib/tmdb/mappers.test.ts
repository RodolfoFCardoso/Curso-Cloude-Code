import { describe, expect, it } from 'vitest';
import detailsFixture from './__fixtures__/movie-details.json';
import genresFixture from './__fixtures__/genres.json';
import listFixture from './__fixtures__/movie-list.json';
import { imageUrl } from './images';
import { mapGenres, mapMovie, mapMovieDetails, mapMovieList } from './mappers';
import type { RawMovieDetails } from './raw';

const IMG = 'https://image.tmdb.org/t/p';

describe('imageUrl', () => {
  it('monta a URL com o tamanho pedido', () => {
    expect(imageUrl('/a.jpg', 'w342')).toBe(`${IMG}/w342/a.jpg`);
  });

  it('devolve null sem caminho', () => {
    expect(imageUrl(null, 'w342')).toBeNull();
    expect(imageUrl(undefined, 'w92')).toBeNull();
    expect(imageUrl('', 'w92')).toBeNull();
  });
});

describe('mapMovie', () => {
  it('mapeia um filme completo', () => {
    expect(mapMovie(listFixture.results[0])).toEqual({
      id: 550,
      title: 'Clube da Luta',
      year: 1999,
      rating: 8.4,
      posterUrl: `${IMG}/w342/fight-poster.jpg`,
      backdropUrl: `${IMG}/w1280/fight-backdrop.jpg`,
      genreIds: [18, 53],
    });
  });

  it('usa defaults quando faltam data, pôster e votos', () => {
    const movie = mapMovie(listFixture.results[1]);
    expect(movie.year).toBeNull();
    expect(movie.posterUrl).toBeNull();
    expect(movie.backdropUrl).toBeNull();
    expect(movie.rating).toBeNull();
  });

  it('usa lista vazia quando não há genre_ids', () => {
    expect(mapMovie(listFixture.results[2]).genreIds).toEqual([]);
  });

  it('arredonda a nota para 1 casa', () => {
    expect(mapMovie(listFixture.results[2]).rating).toBe(6.1);
  });
});

describe('mapMovieList', () => {
  it('mapeia todos os resultados', () => {
    expect(mapMovieList(listFixture).map((m) => m.id)).toEqual([550, 1001, 1002]);
  });

  it('tolera resposta sem results', () => {
    expect(mapMovieList({})).toEqual([]);
  });
});

describe('mapGenres', () => {
  it('mapeia a lista oficial', () => {
    expect(mapGenres(genresFixture)).toEqual([
      { id: 28, name: 'Ação' },
      { id: 35, name: 'Comédia' },
    ]);
  });
});

describe('mapMovieDetails', () => {
  const raw = detailsFixture as RawMovieDetails;

  it('mapeia os campos básicos', () => {
    const d = mapMovieDetails(raw);
    expect(d.id).toBe(550);
    expect(d.year).toBe(1999);
    expect(d.runtimeMinutes).toBe(139);
    expect(d.overview).toBe('Um homem deprimido conhece um vendedor de sabão.');
    expect(d.genres).toEqual([
      { id: 18, name: 'Drama' },
      { id: 53, name: 'Thriller' },
    ]);
  });

  it('prefere o trailer do YouTube em português', () => {
    expect(mapMovieDetails(raw).trailerYoutubeKey).toBe('pt-key');
  });

  it('sem trailer em pt usa o primeiro trailer do YouTube', () => {
    const videos = raw.videos!.results!.filter((v) => v.key !== 'pt-key');
    expect(mapMovieDetails({ ...raw, videos: { results: videos } }).trailerYoutubeKey).toBe(
      'en-key',
    );
  });

  it('sem Trailer devolve null mesmo havendo Teaser', () => {
    const videos = raw.videos!.results!.filter((v) => v.type !== 'Trailer');
    expect(mapMovieDetails({ ...raw, videos: { results: videos } }).trailerYoutubeKey).toBeNull();
  });

  it('elenco: 10 primeiros por order', () => {
    const cast = mapMovieDetails(raw).cast;
    expect(cast).toHaveLength(10);
    expect(cast.map((c) => c.name)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((o) => `Ator ${o}`));
    expect(cast[0]).toEqual({
      id: 100,
      name: 'Ator 0',
      character: 'Papel 0',
      profileUrl: `${IMG}/w185/p0.jpg`,
    });
    expect(cast[1].profileUrl).toBeNull();
  });

  it('limita filmes parecidos a 12', () => {
    expect(mapMovieDetails(raw).similar).toHaveLength(12);
  });

  it('runtime 0 ou ausente vira null', () => {
    expect(mapMovieDetails({ ...raw, runtime: 0 }).runtimeMinutes).toBeNull();
    expect(mapMovieDetails({ ...raw, runtime: undefined }).runtimeMinutes).toBeNull();
  });

  it('sinopse vazia continua vazia e campos aninhados ausentes viram listas vazias', () => {
    const d = mapMovieDetails({
      ...raw,
      overview: '',
      videos: undefined,
      credits: undefined,
      similar: undefined,
      genres: undefined,
    });
    expect(d.overview).toBe('');
    expect(d.trailerYoutubeKey).toBeNull();
    expect(d.cast).toEqual([]);
    expect(d.similar).toEqual([]);
    expect(d.genres).toEqual([]);
  });
});
