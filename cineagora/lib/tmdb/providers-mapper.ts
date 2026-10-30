import { imageUrl } from './images';
import type { RawProvider, RawProviderList, RawWatchProviders } from './raw';
import type { WatchProvider, WatchProviders } from './types';

export const EMPTY_PROVIDERS: WatchProviders = Object.freeze({
  link: null,
  subscription: [],
  free: [],
  rent: [],
  buy: [],
}) as WatchProviders;

function toProvider(raw: RawProvider): WatchProvider {
  return {
    id: raw.provider_id,
    name: raw.provider_name ?? '',
    logoUrl: imageUrl(raw.logo_path, 'w92'),
  };
}

function sortedUnique(list: RawProvider[], priority: (p: RawProvider) => number): WatchProvider[] {
  const seen = new Set<number>();
  return [...list]
    .sort((a, b) => priority(a) - priority(b))
    .filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id))
    .map(toProvider);
}

const byDisplayPriority = (p: RawProvider) => p.display_priority ?? Infinity;

export function mapWatchProviders(raw: RawWatchProviders, region = 'BR'): WatchProviders {
  const r = raw.results?.[region];
  if (!r) return EMPTY_PROVIDERS;
  return {
    link: r.link ?? null,
    subscription: sortedUnique(r.flatrate ?? [], byDisplayPriority),
    free: sortedUnique([...(r.free ?? []), ...(r.ads ?? [])], byDisplayPriority),
    rent: sortedUnique(r.rent ?? [], byDisplayPriority),
    buy: sortedUnique(r.buy ?? [], byDisplayPriority),
  };
}

export function mapProviderList(raw: RawProviderList, region = 'BR'): WatchProvider[] {
  return sortedUnique(
    raw.results ?? [],
    (p) => p.display_priorities?.[region] ?? p.display_priority ?? Infinity,
  );
}
