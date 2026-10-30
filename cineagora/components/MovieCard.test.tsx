import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Movie } from '@/lib/tmdb/types';
import { MovieCard } from './MovieCard';

const movie: Movie = {
  id: 550,
  title: 'Clube da Luta',
  year: 1999,
  rating: 8.4,
  posterUrl: 'https://image.tmdb.org/t/p/w342/p.jpg',
  backdropUrl: null,
  genreIds: [],
};

describe('MovieCard', () => {
  it('mostra título, nota e link para o detalhe', () => {
    render(<MovieCard movie={movie} />);
    expect(screen.getByText('Clube da Luta')).toBeInTheDocument();
    expect(screen.getByText('★ 8,4')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/filme/550');
  });

  it('mostra os selos dos serviços', () => {
    render(
      <MovieCard movie={movie} badges={[{ id: 8, name: 'Netflix', logoUrl: 'https://x/n.jpg' }]} />,
    );
    expect(screen.getByAltText('Netflix')).toBeInTheDocument();
  });

  it('sem pôster mostra placeholder com o título', () => {
    render(<MovieCard movie={{ ...movie, posterUrl: null }} />);
    expect(screen.getByTestId('poster-placeholder')).toHaveTextContent('Clube da Luta');
  });

  it('sem nota não mostra estrela', () => {
    render(<MovieCard movie={{ ...movie, rating: null }} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});
