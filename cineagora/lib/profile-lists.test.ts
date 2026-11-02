import { describe, expect, it } from 'vitest';
import { LIST_STATUS, listHref, parseList, STATUS_LIST } from './profile-lists';

describe('parseList', () => {
  it.each([
    [null, 'quero-assistir'],
    ['quero-assistir', 'quero-assistir'],
    ['ja-assisti', 'ja-assisti'],
    ['xyz', 'quero-assistir'],
    ['', 'quero-assistir'],
  ])('parseList(%s)', (value, expected) => {
    expect(parseList(value)).toBe(expected);
  });

  it('mapeia listas para status e de volta', () => {
    expect(LIST_STATUS).toEqual({ 'quero-assistir': 'want', 'ja-assisti': 'watched' });
    expect(STATUS_LIST).toEqual({ want: 'quero-assistir', watched: 'ja-assisti' });
  });

  it('monta o endereço da lista no perfil', () => {
    expect(listHref('ja-assisti')).toBe('/perfil?lista=ja-assisti');
  });
});
