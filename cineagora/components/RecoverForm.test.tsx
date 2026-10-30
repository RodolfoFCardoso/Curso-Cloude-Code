import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  requestPasswordReset: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ status: 'idle' })),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/app/entrar/actions', () => ({ requestPasswordReset: h.requestPasswordReset }));

import { RecoverForm } from './RecoverForm';

describe('RecoverForm', () => {
  it('mantém o e-mail digitado depois de um erro', async () => {
    h.requestPasswordReset.mockResolvedValueOnce({
      status: 'error',
      message: 'Muitas tentativas. Aguarde alguns minutos.',
      email: 'a@b.c',
    });
    render(<RecoverForm />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.c' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('a@b.c');
  });

  it('mostra a resposta neutra de envio', async () => {
    h.requestPasswordReset.mockResolvedValueOnce({
      status: 'sent',
      message: 'Se houver uma conta com esse e-mail, enviamos um link.',
    });
    render(<RecoverForm />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.c' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    });
    expect(await screen.findByRole('status')).toHaveTextContent('enviamos um link');
  });
});
