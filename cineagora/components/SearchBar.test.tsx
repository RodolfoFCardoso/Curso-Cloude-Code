import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('é um form GET para /busca com campo q', () => {
    render(<SearchBar defaultValue="matrix" />);
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/busca');
    expect(form).toHaveAttribute('method', 'get');
    const input = screen.getByRole('searchbox', { name: 'Buscar filmes' });
    expect(input).toHaveAttribute('name', 'q');
    expect(input).toHaveValue('matrix');
  });
});
