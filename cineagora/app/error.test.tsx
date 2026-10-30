import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HomeError from './error';

describe('error.tsx', () => {
  it('Tentar novamente chama retry (busca de novo), não reset', async () => {
    const retry = vi.fn();
    const reset = vi.fn();
    render(<HomeError error={new Error('x')} retry={retry} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
  });
});
