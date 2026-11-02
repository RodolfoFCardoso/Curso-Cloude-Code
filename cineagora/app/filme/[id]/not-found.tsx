import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';

export default function MovieNotFound() {
  return (
    <div className="pt-20">
      <EmptyState
        title="Filme não encontrado"
        message="Talvez o link esteja errado ou o filme tenha saído da base da TMDB."
        action={
          <Link href="/" className="text-folha underline-offset-4 hover:underline">
            Voltar para o início
          </Link>
        }
      />
    </div>
  );
}
