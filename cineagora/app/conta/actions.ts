'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authErrorMessage } from '@/lib/auth/messages';
import { validateNewPassword } from '@/lib/auth/password';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';
import type { AuthFormState } from '@/lib/auth/types';
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server';

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v : '';
}

export async function changePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?voltar=/conta/senha');

  const current = field(formData, 'current');
  const next = field(formData, 'next');
  const confirm = field(formData, 'confirm');
  const invalid = validateNewPassword({ current, next, confirm });
  if (invalid) return { status: 'error', message: invalid };

  const supabase = await createSupabaseServerClient();
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (check.error) return { status: 'error', message: 'Senha atual incorreta.' };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { status: 'error', message: authErrorMessage(error) };
  return { status: 'success', message: 'Senha alterada.' };
}

export async function resetPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  if (!user || !cookieStore.get(RECOVERY_COOKIE)) redirect('/conta/senha');

  const next = field(formData, 'next');
  const confirm = field(formData, 'confirm');
  const invalid = validateNewPassword({ next, confirm });
  if (invalid) return { status: 'error', message: invalid };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { status: 'error', message: authErrorMessage(error) };

  cookieStore.delete(RECOVERY_COOKIE);
  redirect('/?aviso=senha-redefinida');
}
