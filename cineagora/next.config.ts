import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache clássico por fetch (next.revalidate); Cache Components fica desligado de propósito.
  cacheComponents: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' }],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
