import Image from 'next/image';
import type { WatchProvider } from '@/lib/tmdb/types';

const SIZES = { sm: 24, lg: 48 } as const;

export function ProviderBadge({
  provider,
  size = 'sm',
}: {
  provider: WatchProvider;
  size?: keyof typeof SIZES;
}) {
  const px = SIZES[size];
  if (!provider.logoUrl) {
    return (
      <span
        title={provider.name}
        style={{ width: px, height: px }}
        className="inline-flex items-center justify-center rounded-md bg-zinc-700 text-[10px] font-bold text-zinc-100"
      >
        {provider.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={provider.logoUrl}
      alt={provider.name}
      title={provider.name}
      width={px}
      height={px}
      className="rounded-md ring-1 ring-black/40"
    />
  );
}
