import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PasswordForm } from '@/components/PasswordForm';
import { getCurrentUser } from '@/lib/supabase/server';
import { changePassword } from '../actions';

export const metadata: Metadata = { title: 'Trocar senha' };

export default async function TrocarSenhaPage() {
  if (!(await getCurrentUser())) redirect('/entrar?voltar=/conta/senha');

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="font-display text-3xl leading-tight font-extrabold text-balance text-tela">
        Trocar senha
      </h1>
      <PasswordForm action={changePassword} requireCurrent />
    </div>
  );
}
