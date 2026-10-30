import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => h.params }));

import { Notice } from './Notice';

beforeEach(() => {
  h.params = new URLSearchParams();
});

describe('Notice', () => {
  it('mostra aviso conhecido', () => {
    h.params = new URLSearchParams('aviso=senha-redefinida');
    render(<Notice />);
    expect(screen.getByRole('status')).toHaveTextContent('Senha redefinida.');
  });
  it('ignora avisos desconhecidos', () => {
    h.params = new URLSearchParams('aviso=<b>oi</b>');
    const { container } = render(<Notice />);
    expect(container).toBeEmptyDOMElement();
  });
  it('sem aviso não mostra nada', () => {
    const { container } = render(<Notice />);
    expect(container).toBeEmptyDOMElement();
  });
});
