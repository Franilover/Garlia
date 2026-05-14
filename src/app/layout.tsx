import { Metadata, Viewport } from 'next';
import { Montserrat, Geist, Pixelify_Sans, Caveat, Lora, Literata } from 'next/font/google';
import { LightboxProvider } from "@/components/modal/lightbox/";
import { AuthProvider } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import AppLogic from "@/providers/AppLogic";
import "@/style/tailwind.css";
import { OfflineSyncActivator } from "@/providers/OfflineSyncActivator";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

// --- CONFIGURACIÓN DE FUENTES ---
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', variable: '--font-montserrat' });
const pixelifySans = Pixelify_Sans({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-pixelify', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-caveat', display: 'swap' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-lora', display: 'swap' });
const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });

export const metadata: Metadata = {
  title: {
    template: '%s | Enciclopedia de Garlia',
    default: 'Garlia - Archivos',
  },
  description: 'Explora mi universo.',
  keywords: ['wiki', 'libros', 'biblioteca', 'lectura', 'historias', 'franilover', 'arte', 'fantasia', ],
  authors: [{ name: 'Franilover' }],
  metadataBase: new URL('https://franilover.vercel.app/'), 
  verification: {
    google: 'Wil88vfT-qaSn4IBTlmk7MKlhxcjQYX0V0zhVS5_E_A',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'Garlia',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="es" 
      className={cn(
        geist.variable, 
        montserrat.variable, 
        pixelifySans.variable, 
        caveat.variable, 
        lora.variable, 
        literata.variable
      )}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedDark  = localStorage.getItem('theme');
                const savedTheme = localStorage.getItem('app-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedDark === 'dark' || (!savedDark && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
                if (savedTheme) {
                  document.documentElement.setAttribute('data-theme', savedTheme);
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-bg-main min-h-screen flex flex-col selection:bg-primary/20">
        <OfflineSyncActivator />
        <AuthProvider>
          <DataProvider>
            <ThemeProvider>
              <LightboxProvider>
                <div className="flex-grow flex flex-col md:pl-[68px] pb-[56px] md:pb-0">
                  <main className="flex-grow custom-scrollbar">
                    <AppLogic>
                      {children}
                    </AppLogic>
                  </main>
                </div>
              </LightboxProvider>
            </ThemeProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}