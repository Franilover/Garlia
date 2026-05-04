import { Montserrat, Geist, Pixelify_Sans, Caveat, Lora, Literata } from 'next/font/google';
import { LightboxProvider } from "@/components/modal/lightbox/";
import { AuthProvider } from "@/providers/AuthProvider";
import { DataProvider } from "@/providers/DataProvider";
import AppLogic from "@/providers/AppLogic";
import "@/style/tailwind.css"; // Tu CSS cargará la fuente de public
import { OfflineSyncActivator } from "@/providers/OfflineSyncActivator";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

// Fuentes de Google (se mantienen igual)
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', variable: '--font-montserrat' });
const pixelifySans = Pixelify_Sans({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-pixelify', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-caveat', display: 'swap' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '600'], style: ['normal', 'italic'], variable: '--font-lora', display: 'swap' });
const literata = Literata({ subsets: ["latin"], variable: "--font-literata", weight: ["300", "400", "700"], style: ["normal", "italic"] });

export const metadata = {
  title: 'Franilover',
  description: 'Mi pequeño jardin digital',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable, montserrat.variable, pixelifySans.variable, caveat.variable, lora.variable, literata.variable)} suppressHydrationWarning>
      <body className={cn(
        "antialiased bg-bg-main h-svh overflow-hidden flex flex-col",
        geist.variable,
        montserrat.variable,
        pixelifySans.variable,
        caveat.variable,
        lora.variable,
        literata.variable,
      )}>
        <OfflineSyncActivator />
        <AuthProvider>
          <DataProvider>
            <ThemeProvider>
              <LightboxProvider>
                <div className="flex-grow overflow-y-auto custom-scrollbar pb-[56px] md:pb-0 md:pl-[68px]">
                  <AppLogic>{children}</AppLogic>
                </div>
              </LightboxProvider>
            </ThemeProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}