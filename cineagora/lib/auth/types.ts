export type AuthUser = { id: string; email: string };

export type AuthFormState = {
  status: 'idle' | 'error' | 'check-email' | 'sent' | 'success';
  message?: string;
  /** E-mail enviado, devolvido nos erros para o campo não ficar vazio após o reset do form. */
  email?: string;
};
