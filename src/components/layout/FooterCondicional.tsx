"use client";
import { usePathname } from "next/navigation";

const RUTAS_SIN_FOOTER = [
  "/personal",
  "/personal/salud",
  "/wiki",
  "/wiki/enciclopedia",
];

export default function FooterCondicional() {
  const pathname = usePathname();
  const ocultar = RUTAS_SIN_FOOTER.some((ruta) => pathname === ruta);

  if (ocultar) return null;

  return (
    <footer className="w-full pt-6 pb-20 md:pb-6 mt-auto text-center border-t border-primary/10 bg-white-custom/50 backdrop-blur-sm">
      <p className="text-primary/40 text-[10px] sm:text-xs px-4">
        © 2026 Franilover. Todos los derechos reservados. Queda estrictamente prohibido el uso o reproducción de las ilustraciones para fines comerciales o entrenamiento de modelos de IA sin autorización.
      </p>
    </footer>
  );
}