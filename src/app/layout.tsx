import { Montserrat } from 'next/font/google';
import { LightboxProvider } from "@/components/modal/lightbox/";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { DataProvider } from "@/app/providers/DataProvider";
import AppLogic from "@/app/providers/AppLogic";
import "@/style/tailwind.css";
import { OfflineSyncActivator } from "@/app/providers/OfflineSyncActivator";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
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
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
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
      <body className={`${montserrat.className} antialiased bg-bg-main min-h-svh flex flex-col`}>
        <OfflineSyncActivator />
        <AuthProvider>
          <DataProvider>
            <ThemeProvider>
            <LightboxProvider>
              <div className="flex-grow">
                <AppLogic>
                  {children}
                </AppLogic>
              </div>

              <footer className="hidden md:block w-full pt-6 pb-6 mt-auto text-center border-t border-primary/10 bg-white-custom/50 backdrop-blur-sm">
                <p className="text-primary/40 text-xs px-4">
                  © 2026 Franilover. Todos los derechos reservados. Queda estrictamente prohibido el uso o reproducción de las ilustraciones para fines comerciales o entrenamiento de modelos de IA sin autorización.
                </p>
              </footer>
            </LightboxProvider>
            </ThemeProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}