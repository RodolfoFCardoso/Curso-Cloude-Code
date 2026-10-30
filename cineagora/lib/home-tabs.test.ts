import { describe, expect, it } from 'vitest';
import { parseTab, TAB_STATUS } from './home-tabs';

describe('parseTab', () => {
  it.each([
    [null, 'descobrir'],
    ['quero-assistir', 'quero-assistir'],
    ['ja-assisti', 'ja-assisti'],
    ['xyz', 'descobrir'],
    ['', 'descobrir'],
  ])('parseTab(%s)', (value, expected) => {
    expect(parseTab(value)).toBe(expected);
  });

  it('mapeia abas pessoais para status', () => {
    expect(TAB_STATUS).toEqual({ 'quero-assistir': 'want', 'ja-assisti': 'watched' });
  });
});
