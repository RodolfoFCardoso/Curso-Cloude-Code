import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const h = vi.hoisted(() => ({
  signIn: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ status: 'idle' })),
  signUp: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ status: 'idle' })),
}));
vi.mock('@/app/entrar/actions', () => ({ signIn: h.signIn, signUp: h.signUp }));

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
  it('mantém o e-mail digitado depois de um erro', async () => {
    h.signIn.mockResolvedValueOnce({
      status: 'error',
      message: 'E-mail ou senha incorretos.',
      email: 'a@b.c',
    });
    const { container } = render(<AuthForm voltar="/" />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    await act(async () => {
      fireEvent.click(container.querySelector('button[type="submit"]')!);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('a@b.c');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });
});
