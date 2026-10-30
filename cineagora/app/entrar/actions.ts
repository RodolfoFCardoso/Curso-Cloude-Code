'use server';

import { redirect } from 'next/navigation';
import { authErrorMessage } from '@/lib/auth/messages';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import type { AuthFormState } from '@/lib/auth/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MIN_PASSWORD = 6;

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v : '';
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, 'email').trim();
  const password = field(formData, 'password');
  if (!email || !password) return { status: 'error', message: 'Informe e-mail e senha.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: 'error', message: authErrorMessage(error) };

  // redirect() lança; fica fora de qualquer try/catch.
  redirect(safeRedirectPath(field(formData, 'voltar')));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, 'email').trim();
  const password = field(formData, 'password');
  if (!email || !password) return { status: 'error', message: 'Informe e-mail e senha.' };
  if (password.length < MIN_PASSWORD) {
    return { status: 'error', message: 'A senha precisa ter pelo menos 6 caracteres.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { status: 'error', message: authErrorMessage(error) };

  // Com confirmação ligada, e-mail já cadastrado volta sem erro e sem identidades.
  if (data.user?.identities?.length === 0) {
    return { status: 'error', message: 'Este e-mail já tem conta.' };
  }
  if (data.session) redirect(safeRedirectPath(field(formData, 'voltar')));

  return {
    status: 'check-email',
    message: 'Enviamos um link para seu e-mail. Abra-o para ativar a conta.',
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit']);

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email').trim();
  if (!email) return { status: 'error', message: 'Informe seu e-mail.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  // Resposta neutra para não revelar quais e-mails têm conta; só o limite de envio aparece.
  if (error?.code && RATE_LIMIT_CODES.has(error.code)) {
    return { status: 'error', message: authErrorMessage(error) };
  }
  return { status: 'sent', message: 'Se houver uma conta com esse e-mail, enviamos um link.' };
}
