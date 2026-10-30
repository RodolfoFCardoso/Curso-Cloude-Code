import Image from 'next/image';
import type { WatchProvider } from '@/lib/tmdb/types';

const SIZES = { sm: 24, md: 36, lg: 48 } as const;

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
        className="inline-flex items-center justify-center rounded-md bg-cortina text-[10px] font-bold text-tela"
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
      className="rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-black/30"
    />
  );
}
