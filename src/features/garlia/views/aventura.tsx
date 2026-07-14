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
import { ArrowLeft, BookOpen, Check, ChevronDown, Loader2, Pencil, Plus, Scroll, Sparkles, Swords, X } from "lucide-react";
import React, { useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { Text } from "@/components/ui/Tipografia";
import { useAuth } from "@/providers/AuthProvider";

import {
  TABLA_LABEL,
  useAventuraEntidades,
  useAventurasList,
  type Aventura as AventuraType,
  type AventuraEntidad,
} from "@/features/editorGarlia/hooks/aventuras/useAventuras";
import { useFichasDnd } from "../hooks/useFichasDnd";
import { FichaDetalle, ModalCrearFicha } from "./fichaComponents";
import Misiones, { FichaStatsPanel } from "./misiones";

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

export default function Aventura() {
  const [aventuraId, setAventuraId] = useState<string | null>(null);
  const { perfil } = useAuth();
  const { activa } = useFichasDnd(perfil?.id ?? null);

  return (
    <div
      className="relative flex flex-col p-4 md:p-8 gap-6"
      style={{ minHeight: "calc(100svh - 64px)" }}
    >
      <SelectorIdentidadFlotante />
      <BotonMisionesFlotante />

      {/* ── Dos columnas: 70% contenido (selector o feed, con scroll propio) /
          30% ficha activa (fija) ── */}
      <div className="flex-1 w-full flex flex-col md:flex-row gap-6 items-start min-h-0">
        <div
          className="w-full md:w-[70%] flex flex-col gap-6 overflow-y-auto"
          style={{ maxHeight: "calc(100svh - 140px)" }}
        >
          {aventuraId ? (
            <AventuraFeed aventuraId={aventuraId} onVolver={() => setAventuraId(null)} />
          ) : (
            <SelectorAventuras onSeleccionar={setAventuraId} />
          )}
        </div>

        <div className="w-full md:w-[30%] shrink-0 md:sticky md:top-4">
          {activa ? (
            <FichaStatsPanel ficha={activa} />
          ) : (
            <div
              className="p-5 text-center"
              style={{
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              <Swords size={18} className="mx-auto mb-2 text-primary/20" />
              <p className="text-micro font-black uppercase tracking-wider text-primary/40">
                Elegí una identidad para ver su ficha
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Botón de misiones (esquina superior izquierda) ───────────────────────
// Usa la identidad activa (ficha) en vez del perfil: el progreso y las
// recompensas de misiones ahora viven en fichas_dnd, no en perfiles.

function BotonMisionesFlotante() {
  const { perfil } = useAuth();
  const { activa, loading, refetch } = useFichasDnd(perfil?.id ?? null);
  const [abierto, setAbierto] = useState(false);

  if (!perfil || loading || !activa) return null;

  return (
    <div className="absolute top-4 left-4 z-30">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full border transition-colors"
        style={{
          background: "var(--white-custom)",
          borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
        }}
      >
        <Scroll size={12} className="text-primary/50" />
        <span className="text-xs font-bold text-primary/70">Misiones</span>
      </button>

      <AnimatePresence>
        {abierto && (
          <ModalFichaOverlay onClose={() => setAbierto(false)}>
            <Misiones
              ficha={activa}
              variant="modal"
              onClose={() => setAbierto(false)}
              onFichaActualizada={refetch}
            />
          </ModalFichaOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Selector de identidad activa (esquina superior derecha) ─────────────

function SelectorIdentidadFlotante() {
  const { perfil } = useAuth();
  const { fichas, activa, loading, crear, actualizar, eliminar, elegirActiva } = useFichasDnd(
    perfil?.id ?? null,
  );
  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const fichaEditando = fichas.find((f) => f.id === editandoId) ?? null;

  if (!perfil || loading) return null;
  if (fichas.length === 0 && !creando) {
    return (
      <div className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full border transition-colors"
          style={{
            background: "var(--white-custom)",
            borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          <Plus size={12} className="text-primary/50" />
          <span className="text-xs font-bold text-primary/70">Crear ficha</span>
        </button>

        <AnimatePresence>
          {creando && (
            <ModalCrearFicha
              onClose={() => setCreando(false)}
              onCrear={async (datos) => {
                const nueva = await crear(datos);
                setCreando(false);
                setEditandoId(nueva.id);
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {fichaEditando && (
            <ModalFichaOverlay onClose={() => setEditandoId(null)}>
              <FichaDetalle
                variant="modal"
                ficha={fichaEditando}
                esActiva={fichaEditando.activa}
                onVolver={() => setEditandoId(null)}
                onActualizar={actualizar}
                onEliminar={async (id) => {
                  await eliminar(id);
                  setEditandoId(null);
                }}
                onElegirActiva={elegirActiva}
              />
            </ModalFichaOverlay>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-30">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-colors"
        style={{
          background: "var(--white-custom)",
          borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
        }}
      >
        <div className="w-6 h-6 shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {activa?.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activa.imagen_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Swords size={11} className="text-primary/40" />
          )}
        </div>
        <span className="text-xs font-bold text-primary/70 max-w-[100px] truncate">
          {activa?.nombre ?? "Elegir identidad"}
        </span>
        <ChevronDown size={12} className="text-primary/30 shrink-0" />
      </button>

      <AnimatePresence>
        {abierto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAbierto(false)} />
            <MotionDiv
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-xl border overflow-hidden shadow-lg"
              exit={{ opacity: 0, y: -6 }}
              initial={{ opacity: 0, y: -6 }}
              style={{
                background: "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              {fichas.map((f) => (
                <div
                  key={f.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!f.activa) elegirActiva(f.id);
                      setAbierto(false);
                    }}
                    className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                  >
                    <div className="w-6 h-6 shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                      {f.imagen_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.imagen_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Swords size={11} className="text-primary/40" />
                      )}
                    </div>
                    <span className="flex-1 min-w-0 text-xs text-primary/80 truncate">{f.nombre}</span>
                    {f.activa && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditandoId(f.id);
                      setAbierto(false);
                    }}
                    className="shrink-0 p-1 rounded-full text-primary/30 hover:bg-primary/10 hover:text-primary/70 transition-colors"
                    title="Editar ficha"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setCreando(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/5 transition-colors"
                style={{
                  borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center bg-primary/5">
                  <Plus size={12} className="text-primary/50" />
                </div>
                <span className="flex-1 text-xs font-bold text-primary/60">Nueva ficha</span>
              </button>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creando && (
          <ModalCrearFicha
            onClose={() => setCreando(false)}
            onCrear={async (datos) => {
              const nueva = await crear(datos);
              setCreando(false);
              setEditandoId(nueva.id);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fichaEditando && (
          <ModalFichaOverlay onClose={() => setEditandoId(null)}>
            <FichaDetalle
              variant="modal"
              ficha={fichaEditando}
              esActiva={fichaEditando.activa}
              onVolver={() => setEditandoId(null)}
              onActualizar={actualizar}
              onEliminar={async (id) => {
                await eliminar(id);
                setEditandoId(null);
              }}
              onElegirActiva={elegirActiva}
            />
          </ModalFichaOverlay>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Overlay genérico para la edición de una ficha (modal encima de /aventura) ──

function ModalFichaOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <MotionDiv
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <MotionDiv
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
        exit={{ opacity: 0, scale: 0.96 }}
        initial={{ opacity: 0, scale: 0.96 }}
        style={{ background: "var(--white-custom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </MotionDiv>
    </MotionDiv>
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
          <Text as="span" variant="cap">
            Diario de
          </Text>
        </div>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-primary italic">
          Aventuras
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
          <Text as="span" variant="cap">
            Diario de la Campaña
          </Text>
        </div>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary italic">
          {aventura?.nombre ?? "Aventura"}
        </h1>
      </MotionDiv>

      <div className="flex-1 w-full">
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
