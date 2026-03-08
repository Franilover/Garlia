import { Montserrat } from 'next/font/google';
import { LightboxProvider } from "@/shared/modal/lightbox/";
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
      <body className={`${montserrat.className} antialiased bg-bg-main min-h-screen flex flex-col`}>

        {/* Filtros SVG para el efecto de borde tembloroso del tema scribble.
            Son invisibles — solo definen los filtros feTurbulence que usa el CSS. */}
        <svg
          width="0"
          height="0"
          style={{ position: 'absolute', overflow: 'hidden' }}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            {/* Trazo principal — distorsión orgánica suave */}
            <filter id="scribble-turb" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.025 0.06"
                numOctaves="2"
                seed="1"
                result="noise"
              >
                <animate
                  attributeName="seed"
                  values="1;4;7;2;9;3;6;1"
                  dur="0.85s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="2.4"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {/* Trazo sombra accent — frecuencia y velocidad distintas para contrafase */}
            <filter id="scribble-turb-accent" x="-8%" y="-8%" width="116%" height="116%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.03 0.07"
                numOctaves="2"
                seed="5"
                result="noise"
              >
                <animate
                  attributeName="seed"
                  values="5;2;8;3;6;1;4;5"
                  dur="1.1s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="2.9"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

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

              <footer className="w-full pt-6 pb-20 md:pb-6 mt-auto text-center border-t border-primary/10 bg-white-custom/50 backdrop-blur-sm">
                <p className="text-primary/40 text-[10px] sm:text-xs px-4">
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