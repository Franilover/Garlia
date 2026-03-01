import { Montserrat } from 'next/font/google';
import { LightboxProvider } from "@/shared/modal/lightbox/";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { DataProvider } from "@/app/providers/DataProvider";
import AppLogic from "@/app/providers/AppLogic";
import "@/style/tailwind.css";
import { OfflineSyncActivator } from "@/app/providers/OfflineSyncActivator";

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

export const metadata = {
  title: 'Franilover',
  description: 'Mi Nexus personal',
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
    // ✅ El script inline lee localStorage ANTES de que React hidrate,
    // así evita el flash blanco al recargar con modo oscuro activo.
    <html lang="es" className={montserrat.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (saved === 'dark' || (!saved && prefersDark)) {
                  document.documentElement.classList.add('dark');
                }
              } catch {}
            `,
          }}
        />
      </head>
      {/* ✅ Reemplazado bg-[#F0F0F0] por bg-bg-main — usa tu variable CSS */}
      <body className={`${montserrat.className} antialiased bg-bg-main min-h-screen flex flex-col`}>
        <OfflineSyncActivator />
        <AuthProvider>
          <DataProvider>
            <LightboxProvider>
              <div className="flex-grow">
                <AppLogic>
                  {children}
                </AppLogic>
              </div>

              {/* ✅ Footer usando variables CSS en vez de grays hardcodeados */}
              <footer className="w-full pt-6 pb-20 md:pb-6 mt-auto text-center border-t border-primary/10 bg-white-custom/50 backdrop-blur-sm">
                <p className="text-primary/40 text-[10px] sm:text-xs px-4">
                  © 2026 Franilover. Todos los derechos reservados. Queda estrictamente prohibido el uso o reproducción de las ilustraciones para fines comerciales o entrenamiento de modelos de IA sin autorización.
                </p>
              </footer>
            </LightboxProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}