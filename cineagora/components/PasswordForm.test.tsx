import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordForm } from './PasswordForm';

describe('PasswordForm', () => {
  it('sem requireCurrent não mostra senha atual', () => {
    render(<PasswordForm action={vi.fn(async () => ({ status: 'idle' as const }))} requireCurrent={false} />);
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveAttribute('autocomplete', 'new-password');
  });
  it('com requireCurrent mostra senha atual', () => {
    render(<PasswordForm action={vi.fn(async () => ({ status: 'idle' as const }))} requireCurrent />);
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('autocomplete', 'current-password');
  });
});
