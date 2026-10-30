import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { logTmdbError } from '@/lib/tmdb/errors';
import { getAvailableProviders } from '@/lib/tmdb/service';
import type { WatchProvider } from '@/lib/tmdb/types';
import './globals.css';

// Renderiza por requisição (nunca chama a TMDB no build); os dados ficam no cache do fetch.
export const dynamic = 'force-dynamic';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

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
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <PreferencesProvider>
          <Header providers={providers} />
          <main className="flex-1">{children}</main>
          <Footer />
        </PreferencesProvider>
      </body>
    </html>
  );
}
