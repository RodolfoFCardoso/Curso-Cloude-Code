import { describe, expect, it } from 'vitest';
import { formatRating, formatRuntime } from './format';

describe('formatRating', () => {
  it('usa vírgula e 1 casa', () => {
    expect(formatRating(7.5)).toBe('7,5');
    expect(formatRating(8)).toBe('8,0');
    expect(formatRating(null)).toBeNull();
  });
});

describe('formatRuntime', () => {
  it('formata horas e minutos', () => {
    expect(formatRuntime(139)).toBe('2h 19min');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(null)).toBeNull();
  });
});
