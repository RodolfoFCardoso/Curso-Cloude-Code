'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const NOTICES = new Map<string, string>([['senha-redefinida', 'Senha redefinida.']]);

export function Notice() {
  const params = useSearchParams();
  const aviso = params.get('aviso');
  const fromUrl = aviso ? NOTICES.get(aviso) : undefined;

  // O aviso sai da URL (para não reaparecer no recarregar/voltar), mas segue visível nesta montagem.
  const [shown, setShown] = useState(fromUrl);
  if (fromUrl && fromUrl !== shown) setShown(fromUrl);

  useEffect(() => {
    if (!fromUrl) return;
    const next = new URLSearchParams(params.toString());
    next.delete('aviso');
    const qs = next.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
    );
  }, [fromUrl, params]);

  const message = fromUrl ?? shown;
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
