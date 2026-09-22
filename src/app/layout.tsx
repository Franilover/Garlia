import type { Metadata, Viewport } from 'next';
import { Montserrat, Geist, Pixelify_Sans, Caveat, Literata, Cinzel } from 'next/font/google';
import localFont from 'next/font/local';

import { GlobalCommandPalette } from "@/ui/command";
import Navbar from "@/layout/navbar";
import MainContentArea from "@/layout/MainContentArea";
import LlamadaGlobal from "@/domains/personal/mensajes/LlamadaGlobal";
import { LightboxProvider } from "@/ui/modal/lightbox/";
import { cn } from "@/lib/utils/index";
import AppLogic from "@/providers/AppLogic";
import { AuthProvider } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import "@/style/tailwind.css";
import { ActualizacionDisponible } from "@/providers/ActualizacionDisponible";
import { OfflineSyncActivator } from "@/providers/OfflineSyncActivator";
import { PresenciaActivator } from "@/providers/PresenciaActivator";
import { PushActivator } from "@/providers/PushActivator";
import { QueryProvider } from "@/providers/QueryProvider";
import { ServiceWorkerManager } from "@/providers/ServiceWorkerManager";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "katex/dist/katex.min.css";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', variable: '--font-montserrat' });
const pixelifySans = Pixelify_Sans({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-pixelify', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-caveat', display: 'swap' });
// Lora self-hosteada (next/font/local) en vez de next/font/google: el
// loader de Google Fonts venía fallando tanto en el build de Android (CI)
// como en Vercel con "Module not found:
// @vercel/turbopack-next/internal/font/google/font" — no era solo un
// problema de red del runner de Android, así que se sacó la dependencia
// de red en build-time por completo. Los .ttf son variables (un solo
// archivo cubre 400-700, más su itálica), así que no hace falta un
// archivo por peso como en Google Fonts.
const lora = localFont({
  src: [
    { path: '../../public/fonts/Lora/Lora-VariableFont_wght.ttf', style: 'normal' },
    { path: '../../public/fonts/Lora/Lora-Italic-VariableFont_wght.ttf', style: 'italic' },
  ],
  variable: '--font-lora',
  display: 'swap',
});
const literata = Literata({ subsets: ["latin"], variable: "--font-literata", display: "swap" });
// Usada en el mapa de Garlia (mapaGarlia.tsx) — antes se cargaba con un
// <style>@import url(...)</style> inline en cada render de ese componente,
// lo que causaba un parpadeo la primera vez que el usuario veía texto con
// esta fuente (el navegador recién ahí la resolvía). Cargándola acá, junto
// con el resto, Next la optimiza y self-hostea una sola vez a nivel app.
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '700', '900'], variable: '--font-cinzel', display: 'swap' });

export const metadata: Metadata = {
  title: {
    template: '%s | Enciclopedia de Garlia',
    default: 'Garlia - Archivos',
  },
  description: 'Explora mi universo.',
  keywords: ['wiki', 'libros', 'biblioteca', 'lectura', 'historias', 'franilover', 'arte', 'fantasia', ],
  authors: [{ name: 'Franilover' }],
  metadataBase: new URL('https://franilover.vercel.app/'), 

  icons: {
    icon: '/icon.jpg?v=2',      
    shortcut: '/icon.jpg?v=2',  
    apple: '/icon.jpg?v=2',     
  },

  verification: {
    google: 'Wil88vfT-qaSn4IBTlmk7MKlhxcjQYX0V0zhVS5_E_A',
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://franilover.vercel.app/',
    siteName: 'Garlia',
    images: [
      {
        url: '/icon.jpg', 
        width: 800,
        height: 800,
        alt: 'Icono de Garlia',
      },
    ],
  },
  twitter: {
    card: 'summary', 
    images: ['/icon.jpg'],
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
      suppressHydrationWarning 
      className={cn(
        geist.variable, 
        montserrat.variable, 
        pixelifySans.variable, 
        caveat.variable, 
        lora.variable, 
        literata.variable,
        cinzel.variable
      )}
      lang="es"
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
      {/* h-dvh (no min-h-screen) + overflow-hidden: el documento entero NO
          debe poder scrollear. Cada sección de la app (como el chat de
          mensajes, que ya trae su propio h-dvh + overflow-y-auto interno)
          maneja su propio scroll puertas adentro. Con min-h-screen (como
          estaba antes) el body podía crecer más allá de la pantalla y
          scrollear como documento — en mobile, al abrir el teclado, el
          navegador terminaba scrolleando ESTE body en vez de (o además
          de) el contenedor interno del chat, empujando el header del chat
          (que es sticky solo dentro de SU contenedor) fuera de la vista. */}
      <body className="antialiased bg-bg-main h-dvh overflow-hidden flex flex-col selection:bg-primary/20">
        <ServiceWorkerManager />
        <OfflineSyncActivator />
        <AuthProvider>
          <QueryProvider>
          <DataProvider>
            <ThemeProvider>
              <LightboxProvider>
                <GlobalCommandPalette />
                <LlamadaGlobal />
                <PresenciaActivator />
                <PushActivator />
                <ActualizacionDisponible />
                <Navbar />
                <MainContentArea>
                  <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <AppLogic>
                      {children}
                    </AppLogic>
                  </main>
                </MainContentArea>
              </LightboxProvider>
            </ThemeProvider>
          </DataProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}