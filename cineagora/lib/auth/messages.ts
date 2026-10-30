const MESSAGES = new Map<string, string>([
  ['invalid_credentials', 'E-mail ou senha incorretos.'],
  ['user_already_exists', 'Este e-mail já tem conta.'],
  ['email_exists', 'Este e-mail já tem conta.'],
  ['email_not_confirmed', 'Confirme seu e-mail antes de entrar.'],
  ['weak_password', 'Senha fraca. Use letras, números e símbolos.'],
  ['same_password', 'A nova senha precisa ser diferente da atual.'],
  ['over_email_send_rate_limit', 'Muitas tentativas. Aguarde alguns minutos.'],
  ['over_request_rate_limit', 'Muitas tentativas. Aguarde alguns minutos.'],
  ['otp_expired', 'Link expirado, peça outro.'],
]);

const FALLBACK = 'Algo deu errado, tente de novo.';

// Traduz o código de erro do Supabase Auth para uma mensagem em pt-BR.
export function authErrorMessage(err: { code?: string } | null | undefined): string {
  const code = err?.code;
  if (!code) return FALLBACK;
  return MESSAGES.get(code) ?? FALLBACK;
}
