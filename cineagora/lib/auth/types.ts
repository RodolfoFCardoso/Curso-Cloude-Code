export type AuthUser = { id: string; email: string };

export type AuthFormState = {
  status: 'idle' | 'error' | 'check-email' | 'sent' | 'success';
  message?: string;
};
