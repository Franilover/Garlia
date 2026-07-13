"use client";

/**
 * Aventura (público)
 * ───────────────────────────────────────────────────────────────────────────
 * /garlia/aventura — el jugador primero ve una lista de aventuras
 * existentes (ej "El Bosque Sombrío"), elige una, y entra a su feed: solo
 * las entidades que el DM haya marcado como publicadas dentro de ESA
 * aventura, más reciente primero. Realtime: al publicar algo en admin,
 * este feed se actualiza solo.
 */

import { AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Compass, Loader2, Sparkles, X } from "lucide-react";
import React, { useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { Text } from "@/components/ui/Tipografia";

import {
  TABLA_LABEL,
  useAventuraEntidades,
  useAventurasList,
  type Aventura as AventuraType,
  type AventuraEntidad,
} from "@/features/editorGarlia/hooks/aventuras/useAventuras";

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

export default function Aventura() {
  const [aventuraId, setAventuraId] = useState<string | null>(null);

  return (
    <div className="flex flex-col p-4 md:p-8 gap-6" style={{ minHeight: "calc(100svh - 64px)" }}>
      {aventuraId ? (
        <AventuraFeed aventuraId={aventuraId} onVolver={() => setAventuraId(null)} />
      ) : (
        <SelectorAventuras onSeleccionar={setAventuraId} />
      )}
    </div>
  );
}

// ── Selector de aventuras ────────────────────────────────────────────────

function SelectorAventuras({ onSeleccionar }: { onSeleccionar: (id: string) => void }) {
  const { aventuras, loading } = useAventurasList();

  return (
    <>
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
        {loading && aventuras.length === 0 ? (
          <div className="py-24 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : aventuras.length === 0 ? (
          <div className="py-24 text-center">
            <Sparkles className="mx-auto mb-3 text-primary/20" size={28} />
            <Text as="p" variant="md" className="text-primary/40">
              Todavía no hay ninguna aventura creada. Vuelve pronto.
            </Text>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {aventuras.map((a, i) => (
              <MotionDiv
                key={a.id}
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 12 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
              >
                <button
                  type="button"
                  onClick={() => onSeleccionar(a.id)}
                  className="group w-full flex flex-col text-left p-5 rounded-2xl border transition-all"
                  style={{
                    background: "var(--white-custom)",
                    borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
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
                  <BookOpen size={18} className="text-primary/30 mb-3" />
                  <h3 className="font-serif italic text-xl text-primary mb-1">{a.nombre}</h3>
                  {a.descripcion && (
                    <p className="text-xs text-primary/50 line-clamp-2">{a.descripcion}</p>
                  )}
                </button>
              </MotionDiv>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Feed de una aventura ─────────────────────────────────────────────────

function AventuraFeed({ aventuraId, onVolver }: { aventuraId: string; onVolver: () => void }) {
  const { aventuras } = useAventurasList();
  const { entidades, loading } = useAventuraEntidades(aventuraId);
  const aventura = aventuras.find((a) => a.id === aventuraId) as AventuraType | undefined;
  const [seleccion, setSeleccion] = useState<AventuraEntidad | null>(null);

  const publicadas = entidades
    .filter((e) => e.publicado)
    .sort((a, b) => {
      const ta = a.publicado_at ? new Date(a.publicado_at).getTime() : 0;
      const tb = b.publicado_at ? new Date(b.publicado_at).getTime() : 0;
      return tb - ta;
    });

  return (
    <>
      <MotionDiv
        animate={{ opacity: 1, y: 0 }}
        className="text-center shrink-0 relative"
        initial={{ opacity: 0, y: -20 }}
      >
        <button
          type="button"
          onClick={onVolver}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-primary/40 hover:text-primary/70 transition-colors"
        >
          <ArrowLeft size={14} />
          Aventuras
        </button>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Compass className="text-primary/50" size={18} />
          <Text as="span" variant="cap">
            Diario de la Campaña
          </Text>
        </div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary italic">
          {aventura?.nombre ?? "Aventura"}
        </h1>
      </MotionDiv>

      <div className="flex-1 max-w-3xl w-full mx-auto">
        {loading && entidades.length === 0 ? (
          <div className="py-24 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : publicadas.length === 0 ? (
          <div className="py-24 text-center">
            <Sparkles className="mx-auto mb-3 text-primary/20" size={28} />
            <Text as="p" variant="md" className="text-primary/40">
              Todavía no hay nada revelado en esta aventura. El DM irá
              publicando cosas a medida que las descubráis.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {publicadas.map((entidad, i) => (
                <MotionDiv
                  key={entidad.id}
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
                      borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
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
                      <span className="text-micro font-black uppercase tracking-widest text-primary/35">
                        {TABLA_LABEL[entidad.tabla].singular}
                      </span>
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
                {TABLA_LABEL[seleccion.tabla].singular}
              </span>
              <h2 className="font-serif italic text-2xl text-primary mb-3">{seleccion.nombre}</h2>

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
    </>
  );
}
