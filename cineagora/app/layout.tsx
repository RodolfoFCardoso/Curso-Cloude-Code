import type { Metadata } from 'next';
import { Big_Shoulders, Hanken_Grotesk } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { logTmdbError } from '@/lib/tmdb/errors';
import { getAvailableProviders } from '@/lib/tmdb/service';
import type { WatchProvider } from '@/lib/tmdb/types';
import './globals.css';

// Renderiza por requisição (nunca chama a TMDB no build); os dados ficam no cache do fetch.
export const dynamic = 'force-dynamic';

const hanken = Hanken_Grotesk({ variable: '--font-hanken', subsets: ['latin'] });
const shoulders = Big_Shoulders({
  variable: '--font-shoulders',
  subsets: ['latin'],
  axes: ['opsz'],
  // A tabela de métricas do Next não tem esta fonte; sem isso, só um aviso a cada build.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: { default: 'CineAgora', template: '%s · CineAgora' },
  description: 'Descubra o que assistir nos streamings que você já assina.',
};

async function loadProviders(): Promise<WatchProvider[] | null> {
  try {
    return await getAvailableProviders();
  } catch (err) {
    logTmdbError(err, { origem: 'layout' });
    return null;
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const providers = await loadProviders();
  return (
    <html lang="pt-BR" className={`${hanken.variable} ${shoulders.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-veludo text-tela">
        <PreferencesProvider>
          <Header providers={providers} />
          <main className="flex-1">{children}</main>
          <Footer />
        </PreferencesProvider>
      </body>
    </html>
  );
}
