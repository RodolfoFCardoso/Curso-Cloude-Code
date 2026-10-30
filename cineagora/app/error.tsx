'use client';

import { EmptyState } from '@/components/EmptyState';

export default function HomeError({
  retry,
}: {
  error: unknown;
  retry: () => void;
  reset?: () => void;
}) {
  return (
    <div className="pt-20">
      <EmptyState
        title="Não foi possível carregar os filmes agora."
        message="Pode ser uma instabilidade passageira. Tente de novo em instantes."
        action={
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-projetor px-5 py-2.5 text-sm font-semibold text-veludo transition-colors hover:bg-projetor-forte"
          >
            Tentar novamente
          </button>
        }
      />
    </div>
  );
}
