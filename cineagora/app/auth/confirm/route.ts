import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/auth/recovery';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tokenHash = params.get('token_hash');
  // code: link do modelo de e-mail padrão (PKCE), só vale no navegador que pediu o e-mail.
  const code = params.get('code');
  const type = params.get('type');
  const next = safeRedirectPath(params.get('next'));

  const known = type === 'signup' || type === 'recovery';
  const failure = type === 'recovery' ? '/entrar/recuperar?erro=link-expirado' : '/entrar?erro=link-expirado';
  if (!known || (!tokenHash && !code)) redirect(failure);

  const supabase = await createSupabaseServerClient();
  const { error } = tokenHash
    ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    : await supabase.auth.exchangeCodeForSession(code!);
  if (error) redirect(failure);

  if (type === 'recovery') {
    (await cookies()).set(RECOVERY_COOKIE, '1', recoveryCookieOptions());
  }
  redirect(next);
}
