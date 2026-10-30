import { describe, expect, it } from 'vitest';
import { runMovieListStoreContract } from './contract';
import { createMemoryMovieListStore } from './memory-movie-list';

runMovieListStoreContract('memória', async () => createMemoryMovieListStore());

describe('createMemoryMovieListStore', () => {
  it('aceita estado inicial já em ordem (mais recente primeiro)', () => {
    const m = (id: number) => ({
      id,
      title: `Filme ${id}`,
      year: 2020,
      rating: 7,
      posterUrl: null,
      backdropUrl: null,
      genreIds: [],
    });
    const store = createMemoryMovieListStore([
      { movie: m(2), status: 'want' },
      { movie: m(1), status: 'want' },
      { movie: m(3), status: 'watched' },
    ]);
    expect(store.list('want').map((x) => x.id)).toEqual([2, 1]);
    expect(store.statusOf(3)).toBe('watched');
  });
});
