import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => h.params }));

import { Notice } from './Notice';

let replaceState: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  h.params = new URLSearchParams();
  replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

function at(search: string) {
  h.params = new URLSearchParams(search);
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    ...window.location,
    pathname: '/',
    search: search ? `?${search}` : '',
    hash: '',
  });
}

describe('Notice', () => {
  it('mostra aviso conhecido', () => {
    at('aviso=senha-redefinida');
    render(<Notice />);
    expect(screen.getByRole('status')).toHaveTextContent('Senha redefinida.');
  });
  it('remove o aviso da URL mantendo os outros parâmetros, e continua exibindo', () => {
    at('aviso=senha-redefinida&aba=ja-assisti');
    const { rerender } = render(<Notice />);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?aba=ja-assisti');
    // O Next sincroniza useSearchParams com o replaceState: o aviso sai dos parâmetros.
    at('aba=ja-assisti');
    rerender(<Notice />);
    expect(screen.getByRole('status')).toHaveTextContent('Senha redefinida.');
    expect(replaceState).toHaveBeenCalledTimes(1);
  });
  it('sem outros parâmetros volta para o caminho limpo', () => {
    at('aviso=senha-redefinida');
    render(<Notice />);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
  });
  it('ignora avisos desconhecidos', () => {
    at('aviso=<b>oi</b>');
    const { container } = render(<Notice />);
    expect(container).toBeEmptyDOMElement();
    expect(replaceState).not.toHaveBeenCalled();
  });
  it('sem aviso não mostra nada', () => {
    const { container } = render(<Notice />);
    expect(container).toBeEmptyDOMElement();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
