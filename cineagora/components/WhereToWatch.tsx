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
      className="overflow-hidden rounded-lg border-t-4 border-projetor bg-poltrona px-6 pt-5 pb-6 ring-1 ring-cortina"
    >
      <h2 className="font-display text-[1.75rem] leading-none font-extrabold text-tela">
        Onde assistir no Brasil
      </h2>

      {groups.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-penumbra">
          Sem informação de onde assistir no Brasil no momento.
        </p>
      ) : (
        <div className="mt-5 flex flex-col divide-y divide-cortina">
          {groups.map((g) => (
            <div key={g.key} className="py-4 first:pt-0 last:pb-0">
              <h3 className="mb-2.5 text-sm font-semibold text-tela/80">{g.label}</h3>
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
          className="mt-6 inline-block text-sm font-semibold text-folha underline-offset-4 hover:underline"
        >
          Ver preços e opções no JustWatch ↗
        </a>
      )}
      <p className="mt-3 text-xs text-penumbra">Disponibilidade atualizada periodicamente.</p>
    </section>
  );
}
