"use client";
import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLightbox } from "@/components/modal/lightbox";
import Navbar from "@/components/layout/navbar";
import { supabase } from "@/lib/api/client/supabase";

const RECONNECT_AFTER_MS = 10_000;

export default function AppLogic({ children }) {
  const pathname = usePathname();
  const { closeLightbox } = useLightbox() || {};
  const hiddenAtRef = useRef<number>(Date.now());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        // Cancelar cualquier reconexión pendiente
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      } else {
        // Volvió a ser visible
        const hiddenDuration = Date.now() - hiddenAtRef.current;

        if (hiddenDuration > RECONNECT_AFTER_MS) {
          // Estuvo suficiente tiempo oculto como para que el WS muriera
          // Pequeño delay para que el sistema operativo libere la red primero
          reconnectTimerRef.current = setTimeout(() => {
            supabase.realtime.connect();
          }, 300);
        }
      }
    };

    const handleOnline = () => {
      // Red recuperada → reconectar realtime inmediatamente
      supabase.realtime.connect();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  // ─── Scroll al top y cierre de lightbox en navegación ───────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    if (closeLightbox && typeof closeLightbox === "function") closeLightbox();
  }, [pathname, closeLightbox]);

  // ─── Protección de contenido ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const manejarEventos = (e: Event) => {
      if (e.type === "contextmenu" || e.type === "dragstart") e.preventDefault();
      const ke = e as KeyboardEvent;
      if ((ke.ctrlKey || ke.metaKey) && (ke.key === "s" || ke.key === "p" || ke.key === "u")) {
        e.preventDefault();
      }
      if (ke.key === "F12") e.preventDefault();
    };

    document.addEventListener("contextmenu", manejarEventos);
    document.addEventListener("dragstart",   manejarEventos);
    document.addEventListener("keydown",     manejarEventos);

    return () => {
      document.removeEventListener("contextmenu", manejarEventos);
      document.removeEventListener("dragstart",   manejarEventos);
      document.removeEventListener("keydown",     manejarEventos);
    };
  }, []);

  return (
    <div className="app-container select-none h-full flex flex-col">
      <Navbar />
      <main className="flex-1 min-h-0 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}