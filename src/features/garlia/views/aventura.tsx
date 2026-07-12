"use client";

/**
 * Aventura
 * ───────────────────────────────────────────────────────────────────────────
 * Feed público único para /garlia/aventura: mezcla personajes, criaturas,
 * items, reinos, ciudades, hechizos, dones y runas que el DM haya marcado
 * como "publicado" desde myself/garlia → tab Publicación. Orden: más
 * reciente primero (publicado_at desc). Tarjeta compacta; click para ver
 * el detalle completo en un modal.
 *
 * Realtime gratis: usePublicacionEntidades usa useSupabaseData por tabla,
 * que ya está suscrito a postgres_changes — al publicar algo desde el
 * admin, este feed se actualiza solo, sin recargar.
 */

import { AnimatePresence } from "framer-motion";
import { BookOpen, Compass, Loader2, Sparkles, X } from "lucide-react";
import React, { useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { Text } from "@/components/ui/Tipografia";

import {
  TIPO_LABEL,
  usePublicacionEntidades,
  type EntidadPublicable,
} from "@/features/editorGarlia/hooks/publicacion/usePublicacionEntidades";

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

export default function Aventura() {
  const { publicadas, loading } = usePublicacionEntidades();
  const [seleccion, setSeleccion] = useState<EntidadPublicable | null>(null);

  return (
    <div
      className="flex flex-col p-4 md:p-8 gap-6"
      style={{ minHeight: "calc(100svh - 64px)" }}
    >
      <MotionDiv
        animate={{ opacity: 1, y: 0 }}
        className="text-center shrink-0"
        initial={{ opacity: 0, y: -20 }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Compass className="text-primary/50" size={18} />
          <Text as="span" variant="cap">
            Diario de la Campaña
          </Text>
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-primary italic">
          Aventura
        </h1>
      </MotionDiv>

      <div className="flex-1 max-w-3xl w-full mx-auto">
        {loading && publicadas.length === 0 ? (
          <div className="py-24 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : publicadas.length === 0 ? (
          <div className="py-24 text-center">
            <Sparkles className="mx-auto mb-3 text-primary/20" size={28} />
            <Text as="p" variant="md" className="text-primary/40">
              Todavía no hay nada publicado. Vuelve pronto — el DM irá
              revelando el mundo a medida que lo descubráis.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {publicadas.map((entidad, i) => (
                <MotionDiv
                  key={`${entidad.tabla}:${entidad.id}`}
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 12 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <button
                    type="button"
                    onClick={() => setSeleccion(entidad)}
                    className="group w-full flex items-center gap-3 p-3 text-left rounded-xl border transition-all"
                    style={{
                      background: "var(--white-custom)",
                      borderColor:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "color-mix(in srgb, var(--primary) 28%, transparent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "color-mix(in srgb, var(--primary) 10%, transparent)";
                    }}
                  >
                    <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden relative bg-primary/5">
                      {entidad.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entidad.imagen_url}
                          alt={entidad.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen size={16} className="text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                          {TIPO_LABEL[entidad.tabla].singular}
                        </span>
                      </div>
                      <h3 className="font-serif italic text-base text-primary truncate">
                        {entidad.nombre}
                      </h3>
                      {entidad.publicado_at && (
                        <span className="text-micro text-primary/30">
                          {formatFecha(entidad.publicado_at)}
                        </span>
                      )}
                    </div>
                  </button>
                </MotionDiv>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Modal de detalle ─────────────────────────────────────────── */}
      <AnimatePresence>
        {seleccion && (
          <MotionDiv
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSeleccion(null)}
          >
            <MotionDiv
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6"
              exit={{ opacity: 0, scale: 0.96 }}
              initial={{ opacity: 0, scale: 0.96 }}
              style={{ background: "var(--white-custom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSeleccion(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <X size={14} className="text-primary/60" />
              </button>

              {seleccion.imagen_url && (
                <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-primary/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={seleccion.imagen_url}
                    alt={seleccion.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                {TIPO_LABEL[seleccion.tabla].singular}
              </span>
              <h2 className="font-serif italic text-2xl text-primary mb-3">
                {seleccion.nombre}
              </h2>

              {seleccion.descripcion ? (
                <p className="text-sm text-primary/70 whitespace-pre-wrap leading-relaxed">
                  {seleccion.descripcion}
                </p>
              ) : (
                <p className="text-sm text-primary/30 italic">Sin descripción todavía.</p>
              )}

              {seleccion.publicado_at && (
                <p className="mt-4 text-micro text-primary/30">
                  Publicado el {formatFecha(seleccion.publicado_at)}
                </p>
              )}
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
