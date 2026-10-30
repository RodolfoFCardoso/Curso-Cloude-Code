import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalPreferencesStore } from '@/lib/store/local-preferences';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import type { PreferencesStore } from '@/lib/store/types';
import type { Movie, RailItem } from '@/lib/tmdb/types';
import { FilterableRow } from './FilterableRow';
import { RailStatusProvider, useRailRetry, useRailStatuses } from './RailStatus';

const movie = (id: number): Movie => ({
  id,
  title: `Filme ${id}`,
  year: null,
  rating: null,
  posterUrl: null,
  backdropUrl: null,
  genreIds: [],
});
const netflix = { id: 8, name: 'Netflix', logoUrl: 'https://x/n.jpg' };
const max = { id: 1899, name: 'Max', logoUrl: 'https://x/m.jpg' };

const fetchMock = vi.fn();

function ok(items: RailItem[]) {
  return new Response(JSON.stringify({ items }), { status: 200 });
}

function StatusProbe() {
  const statuses = useRailStatuses();
  const retry = useRailRetry();
  return (
    <>
      <output data-testid="status">{statuses.popular ?? 'none'}</output>
      <button onClick={retry}>retry-probe</button>
    </>
  );
}

function setup(store: PreferencesStore) {
  return render(
    <PreferencesProvider store={store}>
      <RailStatusProvider total={1}>
        <FilterableRow
          railKey="popular"
          title="Populares"
          initialMovies={[movie(1), movie(2), movie(3)]}
        />
        <StatusProbe />
      </RailStatusProvider>
    </PreferencesProvider>,
  );
}

function filtered(ids: number[]) {
  const store = createLocalPreferencesStore(null);
  store.setSelectedProviders(ids);
  return store;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FilterableRow', () => {
  it('antes de conhecer o filtro salvo (servidor) mostra esqueleto, não filmes sem filtro', () => {
    const html = renderToString(
      <PreferencesProvider store={filtered([8])}>
        <FilterableRow railKey="popular" title="Populares" initialMovies={[movie(1)]} />
      </PreferencesProvider>,
    );
    expect(html).toContain('Carregando Populares');
    expect(html).not.toContain('/filme/1');
  });

  it('sem filtro mostra os filmes iniciais sem chamar a API', () => {
    setup(createLocalPreferencesStore(null));
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('shown');
  });

  it('com filtro mostra esqueleto e depois os itens filtrados com selo', async () => {
    fetchMock.mockResolvedValue(ok([{ movie: movie(2), badges: [netflix] }]));

    setup(filtered([8]));
    expect(screen.getByLabelText('Carregando Populares')).toBeInTheDocument();

    expect(await screen.findByAltText('Netflix')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/rail/popular?providers=8');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(await screen.findByText('shown')).toBeInTheDocument();
  });

  it('resultado vazio esconde o trilho e reporta empty', async () => {
    fetchMock.mockResolvedValue(ok([]));
    setup(filtered([8]));
    expect(await screen.findByText('empty')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Populares' })).not.toBeInTheDocument();
  });

  it('erro HTTP esconde o trilho e reporta error', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"unavailable"}', { status: 502 }));
    setup(filtered([8]));
    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Populares' })).not.toBeInTheDocument();
  });

  it('falha de rede esconde o trilho e reporta error', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    setup(filtered([8]));
    expect(await screen.findByText('error')).toBeInTheDocument();
  });

  it('troca rápida de filtro: resposta antiga não sobrescreve a nova', async () => {
    const store = filtered([8]);
    let resolveFirst: (r: Response) => void = () => {};
    fetchMock
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(ok([{ movie: movie(3), badges: [max] }]));

    setup(store);
    act(() => store.setSelectedProviders([1899]));
    expect(await screen.findByAltText('Max')).toBeInTheDocument();

    const firstSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/rail/popular?providers=1899');

    await act(async () => resolveFirst(ok([{ movie: movie(1), badges: [netflix] }])));
    expect(screen.queryByAltText('Netflix')).not.toBeInTheDocument();
    expect(screen.getByAltText('Max')).toBeInTheDocument();
  });

  it('nova tentativa refaz a busca após erro', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(ok([{ movie: movie(2), badges: [netflix] }]));
    setup(filtered([8]));
    expect(await screen.findByText('error')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'retry-probe' }).click());
    expect(await screen.findByAltText('Netflix')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('voltar para sem filtro mostra os iniciais de novo', async () => {
    const store = filtered([8]);
    fetchMock.mockResolvedValue(ok([]));
    setup(store);
    await screen.findByText('empty');
    act(() => store.setSelectedProviders([]));
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
});
