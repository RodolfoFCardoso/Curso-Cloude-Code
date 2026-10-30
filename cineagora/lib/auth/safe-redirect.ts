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
