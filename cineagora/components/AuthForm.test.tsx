import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/app/entrar/actions', () => ({
  signIn: vi.fn(async () => ({ status: 'idle' })),
  signUp: vi.fn(async () => ({ status: 'idle' })),
}));

import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('alterna entre Entrar e Criar conta', () => {
    render(<AuthForm voltar="/filme/12" />);
    expect(screen.getByRole('button', { name: 'Entrar', pressed: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta', pressed: false }));
    expect(screen.getByRole('button', { name: 'Criar conta', pressed: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'email');
  });
  it('envia voltar em campo oculto e link de recuperação', () => {
    const { container } = render(<AuthForm voltar="/filme/12" />);
    expect(container.querySelector('input[name="voltar"]')).toHaveValue('/filme/12');
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute(
      'href',
      '/entrar/recuperar',
    );
  });
  it('mostra aviso de link expirado', () => {
    render(<AuthForm voltar="/" erro="link-expirado" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Link expirado, peça outro.');
  });
});
