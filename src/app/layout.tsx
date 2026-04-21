import { Montserrat, Geist, Pixelify_Sans, Caveat, Lora } from 'next/font/google';
import { LightboxProvider } from "@/components/modal/lightbox/";
import { AuthProvider } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import AppLogic from "@/providers/AppLogic";
import "@/style/tailwind.css";
import { OfflineSyncActivator } from "@/providers/OfflineSyncActivator";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-pixelify',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-caveat',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

import { Literata } from "next/font/google";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: 'Franilover',
  description: 'Mi pequeño jardin digital',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Franilover',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={cn(
        "font-sans",
        geist.variable,
        montserrat.variable,
        pixelifySans.variable,
        caveat.variable,
        lora.variable,
        literata.variable,
      )}
      suppressHydrationWarning
    >
      <head>
        <meta name="google-site-verification" content="Wil88vfT-qaSn4IBTlmk7MKlhxcjQYX0V0zhVS5_E_A" />
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
      {}
      <body className="antialiased bg-bg-main min-h-svh flex flex-col">
        <OfflineSyncActivator />
        <AuthProvider>
          <DataProvider>
            <ThemeProvider>
              <LightboxProvider>
                <div className="flex-grow pb-[56px] md:pb-0 md:pl-[68px]">
                  <AppLogic>
                    {children}
                  </AppLogic>
                </div>
              </LightboxProvider>
            </ThemeProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}