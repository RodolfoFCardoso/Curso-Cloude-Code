import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// next/image otimiza via servidor; nos testes basta um <img> simples.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    sizes: _sizes,
    ...rest
  }: Record<string, unknown>) => {
    void _fill;
    void _priority;
    void _sizes;
    return React.createElement('img', { src, alt, ...rest });
  },
}));
