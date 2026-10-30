import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Movie } from '../tmdb/types';
import { runMovieListStoreContract } from './contract';
import { createFakeMovieStatusTable } from './fake-movie-status-table';
import { createSupabaseMovieListStore, fromRow, toRow } from './supabase-movie-list';

const movie = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  year: 2020,
  rating: 7,
  posterUrl: 'p',
  backdropUrl: null,
  genreIds: [18],
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

runMovieListStoreContract('supabase (fake)', async () => {
  const s = createSupabaseMovieListStore(createFakeMovieStatusTable());
  await s.reload();
  return s;
});

describe('createSupabaseMovieListStore', () => {
  it('toRow/fromRow ida e volta', () => {
    expect(fromRow(toRow(movie(1), 'want'))).toEqual({ movie: movie(1), status: 'want' });
  });

  it('começa não pronto e fica pronto após a carga', async () => {
    const s = createSupabaseMovieListStore(createFakeMovieStatusTable());
    expect(s.isReady()).toBe(false);
    await vi.waitFor(() => expect(s.isReady()).toBe(true));
  });

  it('carrega linhas existentes na ordem do banco', async () => {
    const t = createFakeMovieStatusTable([toRow(movie(2), 'watched'), toRow(movie(1), 'want')]);
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    expect(s.list('watched')[0].id).toBe(2);
    expect(s.statusOf(1)).toBe('want');
  });

  it('falha ao carregar → ready com erro load; reload ok limpa', async () => {
    const t = createFakeMovieStatusTable();
    t.failNext({ message: 'x' });
    const s = createSupabaseMovieListStore(t);
    await vi.waitFor(() => expect(s.isReady()).toBe(true));
    expect(s.lastError()).toBe('load');
    expect(s.list('want')).toEqual([]);
    await s.reload();
    expect(s.lastError()).toBeNull();
  });

  it('grava no banco: upsert ao marcar, remove ao desmarcar', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    s.setStatus(movie(1), 'want');
    await vi.waitFor(() => expect(t.rows.map((r) => r.movie_id)).toEqual([1]));
    s.setStatus(movie(1), null);
    await vi.waitFor(() => expect(t.rows).toEqual([]));
  });

  it('no-op não escreve no banco', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    s.setStatus(movie(9), null);
    s.setStatus(movie(1), 'want');
    await vi.waitFor(() => expect(t.upsert.calls).toHaveLength(1));
    s.setStatus(movie(1), 'want');
    await Promise.resolve();
    expect(t.upsert.calls).toHaveLength(1);
  });

  it('falha ao gravar desfaz e marca save; sucesso depois limpa', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    t.failNext({ message: 'x' });
    s.setStatus(movie(1), 'want');
    expect(s.statusOf(1)).toBe('want');
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    expect(s.statusOf(1)).toBeNull();
    s.setStatus(movie(1), 'want');
    await vi.waitFor(() => expect(s.lastError()).toBeNull());
    expect(s.statusOf(1)).toBe('want');
  });

  it('rollback devolve o filme à posição e ao status anteriores', async () => {
    const t = createFakeMovieStatusTable([
      toRow(movie(3), 'want'),
      toRow(movie(2), 'want'),
      toRow(movie(1), 'want'),
    ]);
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    t.failNext({ message: 'x' });
    s.setStatus(movie(2), 'watched');
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    expect(s.list('want').map((m) => m.id)).toEqual([3, 2, 1]);
    expect(s.list('watched')).toEqual([]);
  });

  it('notifica na mudança de erro', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const listener = vi.fn();
    s.subscribe(listener);
    t.failNext({ message: 'x' });
    s.setStatus(movie(1), 'want');
    expect(listener).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('401 vira unauthenticated', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    t.failNext({ message: 'jwt', status: 401 });
    s.setStatus(movie(1), 'want');
    await vi.waitFor(() => expect(s.lastError()).toBe('unauthenticated'));
    expect(s.statusOf(1)).toBeNull();
  });

  it('PGRST301 vira unauthenticated', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    t.failNext({ message: 'jwt', code: 'PGRST301' });
    s.setStatus(movie(1), 'want');
    await vi.waitFor(() => expect(s.lastError()).toBe('unauthenticated'));
  });

  it('Review Focus 1: falha antiga não desfaz escolha mais nova', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const first = t.deferNext();
    s.setStatus(movie(1), 'want');
    s.setStatus(movie(1), 'watched');
    first.reject({ message: 'timeout' });
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    expect(s.statusOf(1)).toBe('watched');
  });

  it('recarga que termina depois de uma escrita pendente mantém o estado otimista', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const gate = t.deferNextSelect();
    const reloading = s.reload();
    const write = t.deferNext();
    s.setStatus(movie(1), 'want');
    gate.resolve();
    await reloading;
    expect(s.statusOf(1)).toBe('want');
    write.resolve();
    await vi.waitFor(() => expect(t.rows.map((r) => r.movie_id)).toEqual([1]));
  });

  it('recarga mais antiga que termina depois da mais nova é ignorada', async () => {
    const t = createFakeMovieStatusTable([toRow(movie(1), 'want')]);
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const g1 = t.deferNextSelect();
    const r1 = s.reload();
    t.rows = [toRow(movie(2), 'want')];
    const g2 = t.deferNextSelect();
    const r2 = s.reload();
    g2.resolve();
    await r2;
    g1.resolve();
    await r1;
    expect(s.list('want').map((m) => m.id)).toEqual([2]);
  });

  it('duas escritas seguidas, ambas falham → null (nada confirmado)', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const first = t.deferNext();
    s.setStatus(movie(1), 'want');
    t.failNext({ message: 'off' });
    s.setStatus(movie(1), 'watched');
    first.reject({ message: 'off' });
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    await new Promise((r) => setTimeout(r, 0));
    expect(s.statusOf(1)).toBeNull();
  });

  it('want confirmado, depois watched falha → volta a want', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    s.setStatus(movie(1), 'want');
    await vi.waitFor(() => expect(t.rows).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 0));
    t.failNext({ message: 'x' });
    s.setStatus(movie(1), 'watched');
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    expect(s.statusOf(1)).toBe('want');
  });

  it('sucesso antigo não limpa erro de uma escrita mais nova', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const older = t.deferNext();
    s.setStatus(movie(1), 'want');
    t.failNext({ message: 'jwt', status: 401 });
    s.setStatus(movie(2), 'want');
    await vi.waitFor(() => expect(s.lastError()).toBe('unauthenticated'));
    older.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(s.lastError()).toBe('unauthenticated');
  });

  it('falha de um filme não desfaz outro filme', async () => {
    const t = createFakeMovieStatusTable();
    const s = createSupabaseMovieListStore(t);
    await s.reload();
    const first = t.deferNext();
    s.setStatus(movie(1), 'want');
    s.setStatus(movie(2), 'want');
    first.reject({ message: 'timeout' });
    await vi.waitFor(() => expect(s.lastError()).toBe('save'));
    expect(s.statusOf(1)).toBeNull();
    expect(s.statusOf(2)).toBe('want');
  });
});
