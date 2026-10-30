import type { Metadata } from 'next';
import { RecoverForm } from '@/components/RecoverForm';

export const metadata: Metadata = { title: 'Recuperar senha' };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecuperarPage({ searchParams }: PageProps<'/entrar/recuperar'>) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="font-display text-3xl leading-tight font-extrabold text-balance text-tela">
        Recuperar senha
      </h1>
      <RecoverForm erro={first(params.erro)} />
    </div>
  );
}
