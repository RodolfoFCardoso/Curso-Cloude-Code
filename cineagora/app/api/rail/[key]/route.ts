import { fetchRailItems, parseProviderIds, parseRailKey } from '@/lib/rails';
import { logTmdbError } from '@/lib/tmdb/errors';

const CACHE_CONTROL = 'public, s-maxage=10800, stale-while-revalidate=86400';

// Trilho filtrado por "Meus streamings": GET /api/rail/{key}?providers=8,1899
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key: rawKey } = await params;
  const key = parseRailKey(rawKey);
  if (!key) return Response.json({ error: 'not_found' }, { status: 404 });

  const providerIds = parseProviderIds(new URL(request.url).searchParams.get('providers'));
  try {
    const { items, failures } = await fetchRailItems(key, providerIds);
    // Resultado parcial (TMDB instável) não pode ficar horas no cache da CDN.
    const cacheControl = failures > 0 ? 'no-store' : CACHE_CONTROL;
    return Response.json({ items }, { headers: { 'Cache-Control': cacheControl } });
  } catch (err) {
    logTmdbError(err, { rail: key, providers: providerIds.join(',') });
    return Response.json({ error: 'unavailable' }, { status: 502 });
  }
}
