"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLightbox } from "@/components/shared/modal/lightbox"; 
import Navbar from "@/components/shared/layout/navbar";

export default function AppLogic({ children }) {
  const pathname = usePathname();
  const { closeLightbox } = useLightbox() || {}; 

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Resetear el scroll al cambiar de pÃ¡gina
      window.scrollTo(0, 0); 
      
      // 2. Cerrar el lightbox al cambiar de ruta
      if (closeLightbox && typeof closeLightbox === 'function') {
        closeLightbox();
      }

      // 3. LÃGICA DE PROTECCIÃN TOTAL
      const manejarEventos = (e) => {
        // Bloquear Clic Derecho y Arrastre de imÃ¡genes
        if (e.type === 'contextmenu' || e.type === 'dragstart') {
          e.preventDefault();
        }

        // Bloquear atajos de teclado:
        // Ctrl+S (Guardar), Ctrl+P (Imprimir), Ctrl+U (Ver cÃ³digo fuente)
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u')) {
          e.preventDefault();
          console.warn("AcciÃ³n bloqueada por derechos de autor.");
        }

        // Opcional: Bloquear F12 (Herramientas de desarrollador)
        if (e.key === 'F12') {
          e.preventDefault();
        }
      };

      // Registrar los eventos
      document.addEventListener("contextmenu", manejarEventos);
      document.addEventListener("dragstart", manejarEventos);
      document.addEventListener("keydown", manejarEventos);

      // Limpieza al desmontar o cambiar de pÃ¡gina
      return () => {
        document.removeEventListener("contextmenu", manejarEventos);
        document.removeEventListener("dragstart", manejarEventos);
        document.removeEventListener("keydown", manejarEventos);
      };
    }
  }, [pathname, closeLightbox]); 

  return (
    <div className="app-container select-none"> {/* "select-none impide seleccionar texto" */}
      <Navbar />
      <main>{children}</main>
    </div>
  );
}