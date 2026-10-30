import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';

export default function MovieNotFound() {
  return (
    <EmptyState
      title="Filme não encontrado"
      message="Talvez o link esteja errado ou o filme tenha saído da base da TMDB."
      action={
        <Link href="/" className="text-amber-400 hover:underline">
          Voltar para o início
        </Link>
      }
    />
  );
}
