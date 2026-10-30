'use client';

import { EmptyState } from '@/components/EmptyState';

export default function HomeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title="Não foi possível carregar os filmes agora."
      message="Pode ser uma instabilidade passageira. Tente de novo em instantes."
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
        >
          Tentar novamente
        </button>
      }
    />
  );
}
