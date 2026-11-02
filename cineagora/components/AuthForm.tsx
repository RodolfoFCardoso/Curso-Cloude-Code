'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signIn, signUp } from '@/app/entrar/actions';
import type { AuthFormState } from '@/lib/auth/types';

const initial: AuthFormState = { status: 'idle' };

const tabClass = (active: boolean) =>
  `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
    active ? 'bg-tela text-veludo' : 'text-tela hover:bg-tela/10'
  }`;

const inputClass =
  'w-full rounded-full bg-veludo/50 px-4 py-3 text-sm text-tela ring-1 ring-tela/15 outline-none placeholder:text-penumbra transition focus:bg-poltrona focus:ring-folha';

export function AuthForm({ voltar, erro }: { voltar: string; erro?: string }) {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [signInState, signInAction, signInPending] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);

  const creating = mode === 'criar';
  const state = creating ? signUpState : signInState;
  const pending = creating ? signUpPending : signInPending;
  const expired = erro === 'link-expirado' ? 'Link expirado, peça outro.' : null;
  const message = state.status === 'error' || state.status === 'check-email' ? state.message : null;

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <div className="flex gap-1 rounded-full bg-tela/10 p-1">
        <button
          type="button"
          aria-pressed={!creating}
          onClick={() => setMode('entrar')}
          className={tabClass(!creating)}
        >
          Entrar
        </button>
        <button
          type="button"
          aria-pressed={creating}
          onClick={() => setMode('criar')}
          className={tabClass(creating)}
        >
          Criar conta
        </button>
      </div>

      <form
        key={mode}
        action={creating ? signUpAction : signInAction}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="voltar" value={voltar} />
        <label className="flex flex-col gap-1 text-sm text-tela">
          E-mail
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-tela">
          Senha
          <input
            type="password"
            name="password"
            required
            minLength={creating ? 6 : undefined}
            autoComplete={creating ? 'new-password' : 'current-password'}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center rounded-md bg-projetor px-5 py-3 text-sm font-semibold text-tela transition-colors hover:bg-projetor-forte disabled:opacity-60"
        >
          {creating ? 'Criar conta' : 'Entrar'}
        </button>
      </form>

      {(expired || message) && (
        <p role="alert" className="text-sm text-tela/90">
          {message ?? expired}
        </p>
      )}

      <Link href="/entrar/recuperar" className="self-center text-sm text-penumbra hover:text-tela">
        Esqueci minha senha
      </Link>
    </div>
  );
}
