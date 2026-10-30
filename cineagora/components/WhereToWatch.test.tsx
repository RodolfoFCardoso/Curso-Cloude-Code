import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EMPTY_PROVIDERS } from '@/lib/tmdb/providers-mapper';
import type { WatchProviders } from '@/lib/tmdb/types';
import { WhereToWatch } from './WhereToWatch';

const p = (id: number, name: string) => ({ id, name, logoUrl: `https://x/${id}.jpg` });

const providers: WatchProviders = {
  link: 'https://www.themoviedb.org/movie/550/watch?locale=BR',
  subscription: [p(8, 'Netflix')],
  free: [],
  rent: [p(2, 'Apple TV')],
  buy: [p(2, 'Apple TV'), p(3, 'Google Play Filmes')],
};

describe('WhereToWatch', () => {
  it('mostra os grupos não vazios na ordem Assinatura, Alugar, Comprar', () => {
    render(<WhereToWatch providers={providers} />);
    const section = screen.getByRole('region', { name: 'Onde assistir no Brasil' });
    const groups = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(groups).toEqual(['Assinatura', 'Alugar', 'Comprar']);
    expect(within(section).getByAltText('Netflix')).toBeInTheDocument();
    expect(within(section).getAllByAltText('Apple TV')).toHaveLength(2);
  });

  it('inclui Grátis entre Assinatura e Alugar quando houver', () => {
    render(<WhereToWatch providers={{ ...providers, free: [p(300, 'Pluto TV')] }} />);
    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(groups).toEqual(['Assinatura', 'Grátis', 'Alugar', 'Comprar']);
  });

  it('linka para preços no JustWatch em nova aba', () => {
    render(<WhereToWatch providers={providers} />);
    const link = screen.getByRole('link', { name: /ver preços e opções no justwatch/i });
    expect(link).toHaveAttribute('href', providers.link);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('sem dados mostra aviso honesto', () => {
    render(<WhereToWatch providers={EMPTY_PROVIDERS} />);
    expect(
      screen.getByText('Sem informação de onde assistir no Brasil no momento.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
