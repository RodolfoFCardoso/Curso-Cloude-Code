import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RailItem } from '@/lib/tmdb/types';
import { RailSkeleton } from './RailSkeleton';
import { Row } from './Row';

const item = (id: number): RailItem => ({
  movie: {
    id,
    title: `Filme ${id}`,
    year: null,
    rating: null,
    posterUrl: null,
    backdropUrl: null,
    genreIds: [],
  },
  badges: [],
});

describe('Row', () => {
  it('renderiza o título como heading e um card por item', () => {
    render(<Row title="Populares" items={[item(1), item(2), item(3)]} />);
    const section = screen.getByRole('region', { name: 'Populares' });
    expect(within(section).getByRole('heading', { name: 'Populares' })).toBeInTheDocument();
    expect(within(section).getAllByRole('link')).toHaveLength(3);
  });
});

describe('RailSkeleton', () => {
  it('mostra count placeholders e marca carregando', () => {
    render(<RailSkeleton title="Em alta" count={5} />);
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(5);
    expect(screen.getByLabelText('Carregando Em alta')).toHaveAttribute('aria-busy', 'true');
  });
});
