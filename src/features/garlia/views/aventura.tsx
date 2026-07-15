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
import { ArrowLeft, Check, Loader2, Maximize2, MoreVertical, Pencil, Plus, Sparkles, Swords, Trash2, X } from "lucide-react";
import React, { useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import { Text } from "@/components/ui/Tipografia";
import { useAuth } from "@/providers/AuthProvider";

import { TableroAventura, TABLERO_CARD_SIZE, type TableroItem } from "@/features/editorGarlia/components/aventuras/TableroAventura";
import {
  TABLA_LABEL,
  useAventuraEntidades,
  useAventurasList,
  type Aventura as AventuraType,
  type AventuraEntidad,
} from "@/features/editorGarlia/hooks/aventuras/useAventuras";
import { useFichasDnd, type FichaDnd, type NuevaFicha, type RasgoEspecial } from "../hooks/useFichasDnd";
import { CARD_SCALE_MAX, CARD_SCALE_MIN, useTableroEscala } from "../hooks/useTableroEscala";
import Misiones, { FichaStatsPanel, TiradaDados } from "./misiones";

// Valores por defecto para una ficha recién creada: se crea directo (sin
// modal) y el jugador la termina de completar editando en el panel lateral.
const FICHA_DEFAULT: NuevaFicha = {
  nombre: "Nuevo aventurero",
  clase: null,
  raza: null,
  alineamiento: null,
  nivel: 1,
  fuerza: 10,
  destreza: 10,
  constitucion: 10,
  inteligencia: 10,
  sabiduria: 10,
  carisma: 10,
  hp_max: 10,
  hp_actual: 10,
  ca: 10,
  velocidad: 30,
};

function formatFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

export default function Aventura() {
  const [aventuraId, setAventuraId] = useState<string | null>(null);

  return (
    <div
      className="relative flex flex-col p-4 md:p-8 gap-6"
      style={{ minHeight: "calc(100svh - 64px)" }}
    >
      {/* ── Dos columnas: 70% contenido (selector o feed, con scroll propio) /
          30% identidad activa + misiones (fija) — el panel de identidad
          solo aparece una vez adentro de una aventura, no en el selector.
          En mobile (flex-col) va primero arriba del feed; en desktop vuelve
          a la derecha con order-none. ── */}
      <div className="flex-1 w-full flex flex-col md:flex-row gap-6 items-start min-h-0">
        <div
          className={`w-full flex flex-col gap-6 overflow-y-auto order-2 md:order-none ${
            aventuraId ? "md:w-[70%]" : ""
          }`}
          style={{ maxHeight: "calc(100svh - 140px)" }}
        >
          {aventuraId ? (
            <AventuraFeed aventuraId={aventuraId} onVolver={() => setAventuraId(null)} />
          ) : (
            <SelectorAventuras onSeleccionar={setAventuraId} />
          )}
        </div>

        {aventuraId && (
          <div className="w-full md:w-[30%] shrink-0 md:sticky md:top-4 flex flex-col gap-3 order-1 md:order-none">
            <PanelIdentidad />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel de identidad: ficha activa (con menú de tres puntos para
// cambiar/crear/editar identidades) + botón de Misiones debajo ──────────────

function PanelIdentidad() {
  const { perfil, isAdmin } = useAuth();
  const { fichas, activa, loading, crear, actualizar, eliminar, elegirActiva, refetch } =
    useFichasDnd(perfil?.id ?? null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  if (!perfil || loading) return null;

  // Crea la ficha directo con valores por defecto (sin modal) y deja al
  // jugador terminándola de completar en modo edición en el panel lateral.
  const handleCrearFicha = async () => {
    setCreando(true);
    try {
      await crear(FICHA_DEFAULT);
      setEditando(true);
    } finally {
      setCreando(false);
    }
  };

  // Sin identidades todavía: tarjeta simple invitando a crear una.
  if (fichas.length === 0) {
    return (
      <div
        className="p-5 text-center"
        style={{
          background: "var(--white-custom)",
          borderRadius: "var(--radius-card)",
          border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
        }}
      >
        <Swords size={18} className="mx-auto mb-2 text-primary/20" />
        <p className="text-micro font-black uppercase tracking-wider text-primary/40 mb-3">
          Todavía no tenés ninguna identidad
        </p>
        <button
          type="button"
          onClick={handleCrearFicha}
          disabled={creando}
          className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full border transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          {creando ? (
            <Loader2 size={12} className="animate-spin" style={{ color: "var(--btn-text)" }} />
          ) : (
            <Plus size={12} style={{ color: "var(--btn-text)" }} />
          )}
          <span className="text-xs font-bold" style={{ color: "var(--btn-text)" }}>
            Crear ficha
          </span>
        </button>
      </div>
    );
  }

  const handleEditarCampo = async (
    campo: keyof FichaDnd,
    valor: string | number | boolean | string[] | RasgoEspecial[] | Record<string, number> | null,
  ) => {
    if (!activa) return;
    setGuardando(true);
    try {
      await actualizar(activa.id, { [campo]: valor } as Partial<FichaDnd>);
    } finally {
      setGuardando(false);
    }
  };

  // El dueño puede tocar stats de combate SOLO mientras la ficha no esté
  // confirmada (recién creada, todavía armándola). Admin siempre puede.
  const puedeEditarStats = activa
    ? isAdmin || (editando && !activa.stats_confirmadas)
    : false;

  // Al salir del modo edición, si la ficha era del dueño y no estaba
  // confirmada todavía, se confirma acá: de ahora en más el trigger del
  // servidor bloquea las stats para siempre (salvo que un admin las toque).
  const handleToggleEditar = async () => {
    if (editando && activa && !isAdmin && !activa.stats_confirmadas) {
      setGuardando(true);
      try {
        await actualizar(activa.id, { stats_confirmadas: true });
      } finally {
        setGuardando(false);
      }
    }
    setEditando((v) => !v);
  };

  return (
    <>
      {activa && (
        <FichaStatsPanel
          ficha={activa}
          editable={editando}
          editableStats={puedeEditarStats}
          editableCondiciones={false}
          mostrarCondiciones={false}
          onEditarCampo={handleEditarCampo}
          headerAction={
            <div className="relative flex items-center gap-1">
              {editando && guardando && (
                <Loader2 size={12} className="animate-spin text-primary/30" />
              )}
              <button
                type="button"
                onClick={handleToggleEditar}
                className={`p-1 rounded-full transition-colors ${
                  editando
                    ? "bg-primary text-white"
                    : "text-primary/30 hover:bg-primary/10 hover:text-primary/70"
                }`}
                title={
                  editando
                    ? !isAdmin && !activa.stats_confirmadas
                      ? "Listo — esto confirma tus stats, después no vas a poder cambiarlas"
                      : "Listo"
                    : "Editar esta ficha"
                }
              >
                {editando ? <Check size={16} /> : <Pencil size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setMenuAbierto((v) => !v)}
                className="p-1 rounded-full text-primary/30 hover:bg-primary/10 hover:text-primary/70 transition-colors"
                title="Cambiar o crear identidad"
              >
                <MoreVertical size={16} />
              </button>

              <AnimatePresence>
                {menuAbierto && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
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
                              setEditando(false);
                              setMenuAbierto(false);
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
                            <span className="flex-1 min-w-0 text-xs text-primary/80 truncate">
                              {f.nombre}
                            </span>
                            {f.activa && <Check size={13} className="text-primary shrink-0" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Eliminar a ${f.nombre}? Esto no se puede deshacer.`)) {
                                eliminar(f.id);
                              }
                              setMenuAbierto(false);
                            }}
                            className="shrink-0 p-1 rounded-full text-primary/30 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                            title="Eliminar ficha"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={async () => {
                          setMenuAbierto(false);
                          await handleCrearFicha();
                        }}
                        disabled={creando}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-primary/5 transition-colors disabled:opacity-50"
                        style={{
                          borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                        }}
                      >
                        <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center bg-primary/5">
                          {creando ? (
                            <Loader2 size={12} className="animate-spin text-primary/50" />
                          ) : (
                            <Plus size={12} className="text-primary/50" />
                          )}
                        </div>
                        <span className="flex-1 text-xs font-bold text-primary/60">Nueva ficha</span>
                      </button>
                    </MotionDiv>
                  </>
                )}
              </AnimatePresence>
            </div>
          }
        />
      )}

      {/* ── Tirada de dados: debajo de las stats, arriba de misiones ── */}
      {activa && <TiradaDados />}

      {/* ── Misiones aceptadas: en fila, debajo del bloque de identidad ── */}
      {activa && <Misiones ficha={activa} onFichaActualizada={refetch} />}
    </>
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
  const { escala, actualizar: actualizarEscala } = useTableroEscala(aventuraId);

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
          <span className="hidden sm:inline">Aventuras</span>
        </button>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary italic">
          {aventura?.nombre ?? "Aventura"}
        </h1>
      </MotionDiv>

      <div className="flex-1 w-full">
        {!loading && publicadas.length > 0 && (
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-1.5">
              <Maximize2 size={11} className="text-primary/35" />
              <input
                type="range"
                min={CARD_SCALE_MIN}
                max={CARD_SCALE_MAX}
                step={0.05}
                value={escala}
                onChange={(e) => actualizarEscala(Number(e.target.value))}
                className="w-24 accent-[var(--primary)]"
                title="Tamaño de las tarjetas (solo en tu vista)"
              />
              <span className="text-micro font-bold tabular-nums text-primary/40 w-9">
                {Math.round(escala * 100)}%
              </span>
            </div>
          </div>
        )}
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
          <TableroAventura
            editable={false}
            items={publicadas.map(
              (entidad): TableroItem => ({
                id: entidad.id,
                nombre: entidad.nombre,
                imagen_url: entidad.imagen_url,
                subtitulo: TABLA_LABEL[entidad.tabla].singular,
                pos_x: entidad.pos_x,
                pos_y: entidad.pos_y,
              }),
            )}
            cardWidth={Math.round(TABLERO_CARD_SIZE.width * escala)}
            cardHeight={Math.round(TABLERO_CARD_SIZE.height * escala)}
            imageWidth={Math.round(TABLERO_CARD_SIZE.imageWidth * escala)}
            onClickItem={(id) => {
              const entidad = publicadas.find((e) => e.id === id);
              if (entidad) setSeleccion(entidad);
            }}
          />
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
