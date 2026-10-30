'use client';

import { useActionState } from 'react';
import { requestPasswordReset } from '@/app/entrar/actions';
import type { AuthFormState } from '@/lib/auth/types';

const initial: AuthFormState = { status: 'idle' };

const inputClass =
  'w-full rounded-full bg-veludo/50 px-4 py-3 text-sm text-tela ring-1 ring-tela/15 outline-none placeholder:text-penumbra transition focus:bg-poltrona focus:ring-projetor';

export function RecoverForm({ erro }: { erro?: string }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initial);
  const expired = erro === 'link-expirado' ? 'Link expirado, peça outro.' : null;

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-tela">
          E-mail
          <input type="email" name="email" required autoComplete="email" className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-projetor px-5 py-3 text-sm font-semibold text-veludo transition-colors hover:bg-projetor/85 disabled:opacity-60"
        >
          Enviar link
        </button>
      </form>

      {state.status === 'sent' && (
        <p role="status" className="text-sm text-tela/90">
          {state.message}
        </p>
      )}
      {(state.status === 'error' || expired) && (
        <p role="alert" className="text-sm text-tela/90">
          {state.status === 'error' ? state.message : expired}
        </p>
      )}
    </div>
  );
}
