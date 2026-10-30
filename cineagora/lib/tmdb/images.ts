export type ImageSize = 'w92' | 'w185' | 'w342' | 'w1280';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function imageUrl(path: string | null | undefined, size: ImageSize): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}
