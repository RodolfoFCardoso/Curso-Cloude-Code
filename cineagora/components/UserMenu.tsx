'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/app/entrar/actions';
import { useAuth } from '@/lib/auth/AuthProvider';

export function UserMenu() {
  const { user, available } = useAuth();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  if (!available) {
    return <span className="shrink-0 text-sm text-penumbra">Login indisponível</span>;
  }

  if (!user) {
    const onLogin = pathname === '/entrar' || pathname.startsWith('/entrar/');
    const here = pathname + (query ? `?${query}` : '');
    const href = onLogin ? '/entrar' : `/entrar?voltar=${encodeURIComponent(here)}`;
    return (
      <Link
        href={href}
        className="shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold text-tela ring-1 ring-tela/15 transition-colors hover:bg-cortina"
      >
        Entrar
      </Link>
    );
  }

  const initial = (user.email.trim()[0] ?? '?').toUpperCase();

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Conta de ${user.email}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="font-display flex h-10 w-10 items-center justify-center rounded-md bg-projetor text-xl leading-none font-black text-tela transition-colors hover:bg-projetor-forte"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Conta"
          className="absolute right-0 z-50 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-md bg-poltrona p-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] ring-1 ring-cortina"
        >
          <p className="truncate px-3 py-2 text-sm text-penumbra">{user.email}</p>
          <Link
            href="/perfil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-sm text-tela hover:bg-cortina"
          >
            Meu perfil
          </Link>
          <Link
            href="/conta/senha"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-sm text-tela hover:bg-cortina"
          >
            Trocar senha
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-tela hover:bg-cortina"
            >
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
