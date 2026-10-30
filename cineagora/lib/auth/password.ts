const MIN_LENGTH = 6;

// Retorna a mensagem de erro para a nova senha, ou null quando está válida.
export function validateNewPassword(input: { current?: string; next: string; confirm: string }): string | null {
  if (input.next.length < MIN_LENGTH) {
    return `A nova senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`;
  }
  if (input.next !== input.confirm) {
    return 'As senhas não conferem.';
  }
  if (input.current !== undefined && input.current === input.next) {
    return 'A nova senha precisa ser diferente da atual.';
  }
  return null;
}
