"use client";

import { usePathname } from "next/navigation";

/**
 * Envoltorio del contenido principal (todo lo que no es la navbar).
 *
 * pb-[56px] reserva en mobile el espacio de la bottom navbar fija. Pero
 * dentro del detalle de una conversación (/personal/mensajes/detalle...)
 * la navbar mobile se oculta (ver layout/navbar.tsx: ocultarNavbarMobile),
 * así que ese padding-bottom quedaba "empujando" el contenido hacia arriba
 * sin que hubiera nada abajo ocupando ese espacio. Acá replicamos la misma
 * condición para sacar el padding cuando la navbar no se muestra.
 */
export default function MainContentArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dentroDeUnChat = pathname?.startsWith("/personal/mensajes/detalle") ?? false;

  return (
    <div className={`flex-1 min-h-0 flex flex-col md:pl-[68px] md:pb-0 ${dentroDeUnChat ? "" : "pb-[56px]"}`}>
      {children}
    </div>
  );
}
