import { Montserrat } from 'next/font/google';
import { LightboxProvider } from "@/components/shared/modal/lightbox/"; 
import { AuthProvider } from "@/components/providers/AuthProvider"; 
import { DataProvider } from "@/components/providers/DataProvider"; 
import AppLogic from "@/components/providers/AppLogic";
import "@/style/tailwind.css";
import { OfflineSyncActivator } from "@/components/providers/OfflineSyncActivator";

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
    <html lang="es" className={montserrat.variable}>
      <body className={`${montserrat.className} antialiased bg-[#F0F0F0] min-h-screen flex flex-col`}>
        <OfflineSyncActivator />
        <AuthProvider>
          <DataProvider> 
            <LightboxProvider>
              <div className="flex-grow pb-28 md:pb-0">
                <AppLogic>
                  {children}
                </AppLogic>
              </div>
              
              <footer className="w-full py-6 mt-auto text-center border-t border-gray-300 bg-white/50 backdrop-blur-sm">
                <p className="text-gray-600 text-[10px] sm:text-xs px-4">
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