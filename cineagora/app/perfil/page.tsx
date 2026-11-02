import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProfileLists } from '@/components/ProfileLists';
import { listHref, parseList } from '@/lib/profile-lists';
import { getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Meu perfil' };

export default async function ProfilePage({ searchParams }: PageProps<'/perfil'>) {
  const raw = (await searchParams).lista;
  const list = parseList((Array.isArray(raw) ? raw[0] : raw) ?? null);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?voltar=${encodeURIComponent(listHref(list))}`);

  const initial = (user.email.trim()[0] ?? '?').toUpperCase();

  return (
    <div className="px-4 pt-24 pb-6 sm:px-10 sm:pt-32">
      <header className="mb-12 flex items-center gap-5 sm:gap-7">
        <span
          aria-hidden="true"
          className="font-display flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-projetor text-5xl leading-none font-black text-tela shadow-[0_0_0_4px_var(--color-mata)] sm:h-28 sm:w-28 sm:text-7xl"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.9] font-black text-tela">
            Meu perfil
          </h1>
          <p className="mt-2 truncate text-penumbra">{user.email}</p>
          <Link
            href="/conta/senha"
            className="mt-2 inline-block text-sm font-semibold text-folha underline-offset-4 hover:underline"
          >
            Trocar senha
          </Link>
        </div>
      </header>
      <ProfileLists active={list} />
    </div>
  );
}
