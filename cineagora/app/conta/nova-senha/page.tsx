import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PasswordForm } from '@/components/PasswordForm';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';
import { getCurrentUser } from '@/lib/supabase/server';
import { resetPassword } from '../actions';

export const metadata: Metadata = { title: 'Nova senha' };

export default async function NovaSenhaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar/recuperar');
  if (!(await cookies()).get(RECOVERY_COOKIE)) redirect('/conta/senha');

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="font-display text-3xl leading-tight font-extrabold text-balance text-tela">
        Nova senha
      </h1>
      <PasswordForm action={resetPassword} requireCurrent={false} />
    </div>
  );
}
