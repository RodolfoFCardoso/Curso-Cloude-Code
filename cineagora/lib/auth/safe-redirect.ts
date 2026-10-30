// Aceita apenas caminhos internos (ex.: "/filme/12", "/?aba=ja-assisti").
// Qualquer outra coisa (URL absoluta, "//host", "/\host", texto solto) cai no fallback.
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  try {
    if (new URL(value, 'http://x').origin !== 'http://x') return fallback;
  } catch {
    return fallback;
  }
  return value;
}

// Destino após entrar: como safeRedirectPath, mas nunca volta para o próprio login
// (`/entrar?voltar=/entrar` viraria um laço).
export function afterLoginPath(value: unknown): string {
  const path = safeRedirectPath(value);
  const { pathname } = new URL(path, 'http://x');
  return pathname === '/entrar' || pathname.startsWith('/entrar/') ? '/' : path;
}
