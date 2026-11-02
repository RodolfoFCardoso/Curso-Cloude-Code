import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeaderNav } from './HeaderNav';

const h = vi.hoisted(() => ({ pathname: '/', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
}));

afterEach(cleanup);

describe('HeaderNav', () => {
  it('na home marca Início', () => {
    h.pathname = '/';
    h.search = '';
    render(<HeaderNav />);
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Já assisti' })).toHaveAttribute(
      'href',
      '/perfil?lista=ja-assisti',
    );
  });

  it('no perfil marca a lista aberta', () => {
    h.pathname = '/perfil';
    h.search = 'lista=ja-assisti';
    render(<HeaderNav />);
    expect(screen.getByRole('link', { name: 'Já assisti' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');
  });
});
