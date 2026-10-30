import type { MovieStatus } from './store/types';

export type HomeTab = 'descobrir' | 'quero-assistir' | 'ja-assisti';

export const HOME_TABS: readonly HomeTab[] = ['descobrir', 'quero-assistir', 'ja-assisti'];

export const TAB_STATUS: Record<'quero-assistir' | 'ja-assisti', MovieStatus> = {
  'quero-assistir': 'want',
  'ja-assisti': 'watched',
};

/** Ausente ou inválido = Descobrir. */
export function parseTab(value: string | null): HomeTab {
  return value === 'quero-assistir' || value === 'ja-assisti' ? value : 'descobrir';
}
