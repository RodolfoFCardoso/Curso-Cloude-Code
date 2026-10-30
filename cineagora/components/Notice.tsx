'use client';

import { useSearchParams } from 'next/navigation';

const NOTICES = new Map<string, string>([['senha-redefinida', 'Senha redefinida.']]);

export function Notice() {
  const aviso = useSearchParams().get('aviso');
  const message = aviso ? NOTICES.get(aviso) : undefined;
  if (!message) return null;
  return (
    <p
      role="status"
      className="mx-auto mt-4 w-fit rounded-full bg-tela/10 px-4 py-2 text-sm text-tela"
    >
      {message}
    </p>
  );
}
