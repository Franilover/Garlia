"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLightbox } from "@/components/recursos/boxes/lightbox"; 
import Navbar from "@/components/recursos/navbar/navbar";

export default function AppLogic({ children }) {
  const pathname = usePathname();
  const { closeLightbox } = useLightbox() || {}; 

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Resetear el scroll al cambiar de página
      window.scrollTo(0, 0); 
      
      // 2. Cerrar el lightbox al cambiar de ruta
      if (closeLightbox && typeof closeLightbox === 'function') {
        closeLightbox();
      }

      // 3. LÓGICA DE PROTECCIÓN TOTAL
      const manejarEventos = (e) => {
        // Bloquear Clic Derecho y Arrastre de imágenes
        if (e.type === 'contextmenu' || e.type === 'dragstart') {
          e.preventDefault();
        }

        // Bloquear atajos de teclado:
        // Ctrl+S (Guardar), Ctrl+P (Imprimir), Ctrl+U (Ver código fuente)
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u')) {
          e.preventDefault();
          console.warn("Acción bloqueada por derechos de autor.");
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

      // Limpieza al desmontar o cambiar de página
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