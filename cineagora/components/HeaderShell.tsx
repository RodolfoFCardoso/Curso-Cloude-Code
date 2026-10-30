'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Header fixo: transparente sobre o destaque, ganha fundo quando a página rola. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? 'bg-veludo/92 shadow-[0_1px_0_var(--color-cortina)] backdrop-blur-md'
          : 'bg-gradient-to-b from-veludo/80 to-transparent'
      }`}
    >
      {children}
    </header>
  );
}
