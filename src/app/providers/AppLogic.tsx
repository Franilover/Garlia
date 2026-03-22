"use client";
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLightbox } from "@/components/modal/lightbox";
import Navbar from "@/components/layout/navbar";

export default function AppLogic({ children }) {
  const pathname = usePathname();
  const { closeLightbox } = useLightbox() || {};

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);

      if (closeLightbox && typeof closeLightbox === 'function') {
        closeLightbox();
      }

      const manejarEventos = (e) => {
        if (e.type === 'contextmenu' || e.type === 'dragstart') {
          e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u')) {
          e.preventDefault();
          console.warn("Acción bloqueada por derechos de autor.");
        }
        if (e.key === 'F12') {
          e.preventDefault();
        }
      };

      document.addEventListener("contextmenu", manejarEventos);
      document.addEventListener("dragstart", manejarEventos);
      document.addEventListener("keydown", manejarEventos);

      return () => {
        document.removeEventListener("contextmenu", manejarEventos);
        document.removeEventListener("dragstart", manejarEventos);
        document.removeEventListener("keydown", manejarEventos);
      };
    }
  }, [pathname, closeLightbox]);

  return (
    <div className="app-container select-none h-full flex flex-col">
      <Navbar />

      {}
      <main className="flex-1 min-h-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}