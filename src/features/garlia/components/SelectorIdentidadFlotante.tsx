"use client";

/**
 * SelectorIdentidadFlotante.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Botón fijo en la esquina superior derecha de /garlia/aventura. Muestra
 * la ficha D&D "activa" del usuario (si tiene una) y permite abrir un
 * dropdown para elegir/cambiar cuál está usando ahora mismo mientras
 * navega el diario de la campaña. Reutiliza el mismo campo `activa` que
 * ya gestiona Mis Fichas (fichas_dnd.activa, único-activo por perfil).
 *
 * Si el usuario no tiene sesión o no tiene fichas creadas, muestra un
 * botón que invita a crear una en Mis Fichas.
 */

import { AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Loader2, Plus, Swords } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { useFichasDnd } from "@/features/garlia/hooks/useFichasDnd";
import { useAuth } from "@/providers/AuthProvider";

export function SelectorIdentidadFlotante() {
  const { perfil, loading: authLoading } = useAuth();
  const { fichas, activa, loading, elegirActiva } = useFichasDnd(perfil?.id ?? null);
  const [open, setOpen] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Sin sesión: no mostramos nada (el diario es público, no forzamos login).
  if (!authLoading && !perfil) return null;

  const elegir = async (id: string) => {
    setCambiando(id);
    try {
      await elegirActiva(id);
      setOpen(false);
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border shadow-sm transition-all"
        style={{
          background: "var(--white-custom)",
          borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
        }}
      >
        <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden bg-primary/10 relative">
          {activa?.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activa.imagen_url} alt={activa.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Swords size={12} className="text-primary/30" />
            </div>
          )}
        </div>
        <span className="text-xs font-bold text-primary/80 max-w-[120px] truncate">
          {authLoading || loading ? "Cargando…" : activa ? activa.nombre : "Elegir identidad"}
        </span>
        {authLoading || loading ? (
          <Loader2 size={12} className="animate-spin text-primary/30" />
        ) : (
          <ChevronDown
            size={12}
            className={`text-primary/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <MotionDiv
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -6 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden"
            style={{
              background: "var(--white-custom)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              boxShadow: "0 12px 32px color-mix(in srgb, var(--primary) 14%, transparent)",
            }}
          >
            <div
              className="px-3 py-2"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
            >
              <span className="text-micro font-black uppercase tracking-widest text-primary/40">
                Jugando como
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-4">
                  <Loader2 className="animate-spin text-primary/30" size={14} />
                  <span className="text-xs text-primary/30">Cargando fichas…</span>
                </div>
              ) : fichas.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <p className="text-xs text-primary/40 mb-2">
                    Todavía no tienes fichas de personaje.
                  </p>
                  <Link
                    href="/garlia/personal/identidades"
                    className="inline-flex items-center gap-1 text-micro font-bold uppercase text-primary/70 hover:text-primary transition-colors"
                  >
                    <Plus size={11} />
                    Crear ficha
                  </Link>
                </div>
              ) : (
                fichas.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    disabled={cambiando === f.id}
                    onClick={() => elegir(f.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/5 disabled:opacity-50 transition-colors"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-primary/5 relative">
                      {f.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.imagen_url} alt={f.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Swords size={12} className="text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-primary/80 truncate">{f.nombre}</div>
                      {f.clase && (
                        <div className="text-micro text-primary/35 truncate">
                          {[f.clase, `Nv. ${f.nivel}`].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    {cambiando === f.id ? (
                      <Loader2 size={12} className="animate-spin text-primary/40 shrink-0" />
                    ) : f.activa ? (
                      <Check size={13} className="text-primary shrink-0" />
                    ) : null}
                  </button>
                ))
              )}
            </div>

            {fichas.length > 0 && (
              <div
                className="px-3 py-2"
                style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
              >
                <Link
                  href="/garlia/personal/identidades"
                  className="flex items-center gap-1.5 text-micro font-bold uppercase text-primary/40 hover:text-primary/70 transition-colors"
                >
                  <Plus size={11} />
                  Gestionar mis fichas
                </Link>
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
