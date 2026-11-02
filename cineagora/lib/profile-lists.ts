import type { MovieStatus } from './store/types';

export type ProfileList = 'quero-assistir' | 'ja-assisti';

export const PROFILE_LISTS: readonly ProfileList[] = ['quero-assistir', 'ja-assisti'];

export const LIST_LABEL: Record<ProfileList, string> = {
  'quero-assistir': 'Quero assistir',
  'ja-assisti': 'Já assisti',
};

export const LIST_STATUS: Record<ProfileList, MovieStatus> = {
  'quero-assistir': 'want',
  'ja-assisti': 'watched',
};

export const STATUS_LIST: Record<MovieStatus, ProfileList> = {
  want: 'quero-assistir',
  watched: 'ja-assisti',
};

/** Endereço da lista dentro do perfil. */
export function listHref(list: ProfileList): string {
  return `/perfil?lista=${list}`;
}

/** Ausente ou inválido = Quero assistir. */
export function parseList(value: string | null): ProfileList {
  return value === 'ja-assisti' ? value : 'quero-assistir';
}
