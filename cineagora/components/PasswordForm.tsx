'use client';

import { useActionState } from 'react';
import type { AuthFormState } from '@/lib/auth/types';

const initial: AuthFormState = { status: 'idle' };

const inputClass =
  'w-full rounded-full bg-veludo/50 px-4 py-3 text-sm text-tela ring-1 ring-tela/15 outline-none placeholder:text-penumbra transition focus:bg-poltrona focus:ring-projetor';

type Action = (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;

export function PasswordForm({
  action,
  requireCurrent,
}: {
  action: Action;
  requireCurrent: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <form action={formAction} className="flex flex-col gap-3">
        {requireCurrent && (
          <label className="flex flex-col gap-1 text-sm text-tela">
            Senha atual
            <input
              type="password"
              name="current"
              required
              autoComplete="current-password"
              className={inputClass}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-tela">
          Nova senha
          <input
            type="password"
            name="next"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-tela">
          Confirmar nova senha
          <input
            type="password"
            name="confirm"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-projetor px-5 py-3 text-sm font-semibold text-veludo transition-colors hover:bg-projetor/85 disabled:opacity-60"
        >
          Salvar senha
        </button>
      </form>

      {state.status === 'error' && (
        <p role="alert" className="text-sm text-tela/90">
          {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <p role="status" className="text-sm text-tela/90">
          {state.message}
        </p>
      )}
    </div>
  );
}
