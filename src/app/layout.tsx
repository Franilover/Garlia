import { Montserrat } from 'next/font/google';
import { LightboxProvider } from "@/shared/modal/lightbox/";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { DataProvider } from "@/app/providers/DataProvider";
import AppLogic from "@/app/providers/AppLogic";
import "@/style/tailwind.css";
import { OfflineSyncActivator } from "@/app/providers/OfflineSyncActivator";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import FooterCondicional from "@/shared/layout/FooterCondicional";

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
                <FooterCondicional />
              </LightboxProvider>
            </ThemeProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}