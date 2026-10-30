import type { WatchProvider, WatchProviders } from '@/lib/tmdb/types';
import { ProviderBadge } from './ProviderBadge';

const GROUPS: { key: keyof Omit<WatchProviders, 'link'>; label: string }[] = [
  { key: 'subscription', label: 'Assinatura' },
  { key: 'free', label: 'Grátis' },
  { key: 'rent', label: 'Alugar' },
  { key: 'buy', label: 'Comprar' },
];

export function WhereToWatch({ providers }: { providers: WatchProviders }) {
  const groups = GROUPS.map((g) => ({ ...g, list: providers[g.key] as WatchProvider[] })).filter(
    (g) => g.list.length > 0,
  );

  return (
    <section
      aria-label="Onde assistir no Brasil"
      className="rounded-xl bg-zinc-900/80 p-5 ring-1 ring-amber-400/30"
    >
      <h2 className="text-lg font-semibold text-zinc-100">Onde assistir no Brasil</h2>

      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">
          Sem informação de onde assistir no Brasil no momento.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-6">
          {groups.map((g) => (
            <div key={g.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                {g.label}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {g.list.map((p) => (
                  <li key={p.id}>
                    <ProviderBadge provider={p} size="lg" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {groups.length > 0 && providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-amber-400 hover:underline"
        >
          Ver preços e opções no JustWatch ↗
        </a>
      )}
      <p className="mt-3 text-xs text-zinc-500">Disponibilidade atualizada periodicamente.</p>
    </section>
  );
}
