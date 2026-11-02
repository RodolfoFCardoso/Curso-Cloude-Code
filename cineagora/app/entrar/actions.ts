'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authErrorMessage } from '@/lib/auth/messages';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';
import { afterLoginPath } from '@/lib/auth/safe-redirect';
import type { AuthFormState } from '@/lib/auth/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const MIN_PASSWORD = 6;

function fail(message: string, email: string): AuthFormState {
  return { status: 'error', message, email };
}

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === 'string' ? v : '';
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, 'email').trim();
  const password = field(formData, 'password');
  if (!email || !password) return fail('Informe e-mail e senha.', email);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(authErrorMessage(error), email);

  // Uma recuperação de senha pendente de outra sessão não vale para este login.
  (await cookies()).delete(RECOVERY_COOKIE);
  // redirect() lança; fica fora de qualquer try/catch.
  redirect(afterLoginPath(field(formData, 'voltar')));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, 'email').trim();
  const password = field(formData, 'password');
  if (!email || !password) return fail('Informe e-mail e senha.', email);
  if (password.length < MIN_PASSWORD) {
    return fail('A senha precisa ter pelo menos 6 caracteres.', email);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return fail(authErrorMessage(error), email);

  // Com confirmação ligada, e-mail já cadastrado volta sem erro e sem identidades.
  if (data.user?.identities?.length === 0) {
    return fail('Este e-mail já tem conta.', email);
  }
  if (data.session) redirect(afterLoginPath(field(formData, 'voltar')));

  return {
    status: 'check-email',
    message: 'Enviamos um link para seu e-mail. Abra-o para ativar a conta.',
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // 'local': encerra só esta sessão, sem derrubar o usuário nos outros dispositivos.
  await supabase.auth.signOut({ scope: 'local' });
  (await cookies()).delete(RECOVERY_COOKIE);
  redirect('/');
}

const RATE_LIMIT_CODES = new Set(['over_email_send_rate_limit', 'over_request_rate_limit']);

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, 'email').trim();
  if (!email) return fail('Informe seu e-mail.', email);

  const supabase = await createSupabaseServerClient();
  // Com o modelo de e-mail padrão o link volta com ?code=; /auth/confirm troca o code pela sessão.
  const origin = (await headers()).get('origin');
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    origin
      ? { redirectTo: `${origin}/auth/confirm?type=recovery&next=/conta/nova-senha` }
      : undefined,
  );
  // Resposta neutra para não revelar quais e-mails têm conta; só o limite de envio aparece.
  if (error?.code && RATE_LIMIT_CODES.has(error.code)) {
    return fail(authErrorMessage(error), email);
  }
  return { status: 'sent', message: 'Se houver uma conta com esse e-mail, enviamos um link.' };
}
