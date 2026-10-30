import type { Metadata } from 'next';
import { Big_Shoulders, Hanken_Grotesk } from 'next/font/google';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { PreferencesProvider } from '@/lib/store/PreferencesProvider';
import { getSupabaseEnv, requireSupabaseEnv } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/supabase/server';
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

let warned = false;
function warnSupabaseMissing() {
  if (warned) return;
  warned = true;
  try {
    requireSupabaseEnv();
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Supabase não configurado');
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [providers, user] = await Promise.all([loadProviders(), getCurrentUser()]);
  const available = getSupabaseEnv() !== null;
  if (!available) warnSupabaseMissing();
  return (
    <html lang="pt-BR" className={`${hanken.variable} ${shoulders.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-veludo text-tela">
        <PreferencesProvider>
          <AuthProvider user={user} available={available}>
            <Header providers={providers} />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
