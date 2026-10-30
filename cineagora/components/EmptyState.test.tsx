import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza título, mensagem e ação', () => {
    render(
      <EmptyState
        title="Nada aqui"
        message="Tente outro termo."
        action={<button>Voltar</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Nada aqui' })).toBeInTheDocument();
    expect(screen.getByText('Tente outro termo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });
});
