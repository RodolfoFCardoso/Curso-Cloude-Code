import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-cortina px-4 py-10 text-xs leading-relaxed text-penumbra sm:px-10">
      <div className="mb-4 opacity-80">
        <Logo size="sm" />
      </div>
      <p>Este produto usa a API da TMDB, mas não é endossado nem certificado pela TMDB.</p>
      <p>Dados de onde assistir: JustWatch. Atualizados periodicamente.</p>
    </footer>
  );
}
