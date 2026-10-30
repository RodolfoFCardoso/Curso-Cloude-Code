export const RECOVERY_COOKIE = 'cineagora_recovery';

// Cookie curto que marca a sessão de recuperação de senha (10 minutos).
export function recoveryCookieOptions(): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  maxAge: 600;
  path: '/';
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  };
}
