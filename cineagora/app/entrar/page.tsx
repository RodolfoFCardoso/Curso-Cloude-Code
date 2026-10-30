import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { afterLoginPath } from '@/lib/auth/safe-redirect';
import { getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Entrar' };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EntrarPage({ searchParams }: PageProps<'/entrar'>) {
  const params = await searchParams;
  const voltar = afterLoginPath(first(params.voltar));
  const erro = first(params.erro);

  if (await getCurrentUser()) redirect(voltar);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="font-display text-3xl leading-tight font-extrabold text-balance text-tela">
        Entre no CineAgora
      </h1>
      <AuthForm voltar={voltar} erro={erro} />
    </div>
  );
}
