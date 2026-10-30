import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/lib/auth/types';
import { UserMenu } from './UserMenu';

const state = vi.hoisted(() => ({
  user: null as AuthUser | null,
  available: true,
  pathname: '/filme/3',
}));

vi.mock('@/lib/auth/AuthProvider', () => ({
  useAuth: () => ({ user: state.user, available: state.available }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/app/entrar/actions', () => ({ signOut: vi.fn() }));

beforeEach(() => {
  state.user = null;
  state.available = true;
  state.pathname = '/filme/3';
});

describe('UserMenu', () => {
  it('deslogado mostra Entrar com voltar', () => {
    render(<UserMenu />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?voltar=%2Ffilme%2F3',
    );
  });

  it('em /entrar o link não leva voltar', () => {
    state.pathname = '/entrar';
    render(<UserMenu />);
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
  });

  it('logado mostra inicial e abre menu', async () => {
    state.user = { id: 'u1', email: 'rodolfo@x.com' };
    const user = userEvent.setup();
    render(<UserMenu />);
    const btn = screen.getByRole('button', { name: 'Conta de rodolfo@x.com' });
    expect(btn).toHaveTextContent('R');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('rodolfo@x.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Trocar senha' })).toHaveAttribute(
      'href',
      '/conta/senha',
    );
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
  });

  it('Escape fecha e devolve o foco', async () => {
    state.user = { id: 'u1', email: 'rodolfo@x.com' };
    const user = userEvent.setup();
    render(<UserMenu />);
    const btn = screen.getByRole('button', { name: /conta de/i });
    await user.click(btn);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(btn).toHaveFocus();
  });

  it('clique fora fecha', async () => {
    state.user = { id: 'u1', email: 'rodolfo@x.com' };
    const user = userEvent.setup();
    render(
      <>
        <UserMenu />
        <p>fora</p>
      </>,
    );
    await user.click(screen.getByRole('button', { name: /conta de/i }));
    await user.click(screen.getByText('fora'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('indisponível mostra aviso', () => {
    state.available = false;
    render(<UserMenu />);
    expect(screen.getByText('Login indisponível')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
  });
});
