"use client";

import { AnimatePresence } from "framer-motion";
import {
  Award,
  Check,
  Clock,
  Coins,
  Loader2,
  Lock,
  Scroll,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import React from "react";

import { MotionDiv } from "@/components/ui/Motion";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type Dificultad = "facil" | "media" | "dificil" | "epica";

export interface RecompensaMision {
  xp: number;
  monedas?: number;
  item_nombre?: string;
  item_imagen_url?: string;
}

export interface Mision {
  id: string;
  titulo: string;
  descripcion?: string;
  dificultad: Dificultad;
  categoria?: string;
  imagen_url?: string;
  recompensa: RecompensaMision;
  requisitos?: string; // texto libre, ej. "Nivel 5+"
  vence_en?: string | null; // ISO date, null = sin vencimiento
  bloqueada?: boolean;
}

export type EstadoMisionUsuario = "en_curso" | "completada" | "reclamada";

export interface MisionUsuario {
  mision_id: string;
  estado: EstadoMisionUsuario;
  progreso: number; // 0-100
  fecha_aceptada?: string;
  fecha_completada?: string | null;
}

export interface MisionConProgreso extends Mision {
  user_estado?: EstadoMisionUsuario | null;
  progreso?: number;
}

// ─── Constantes visuales ───────────────────────────────────────────────────

export const DIFICULTAD_LABEL: Record<Dificultad, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
  epica: "Épica",
};

// Cada dificultad pinta sobre --primary con distinta intensidad, manteniendo
// una sola fuente de verdad de color para que todo el módulo respete el tema
// activo del usuario (igual que en personal.tsx).
export const DIFICULTAD_INTENSIDAD: Record<Dificultad, number> = {
  facil: 35,
  media: 55,
  dificil: 75,
  epica: 95,
};

// ─── EmptyTab equivalente ───────────────────────────────────────────────────

export function EmptyMisiones({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Scroll
        size={26}
        style={{
          color: "color-mix(in srgb, var(--primary) 16%, transparent)",
        }}
      />
      <p
        className="font-serif italic text-[11px] text-center"
        style={{
          color: "color-mix(in srgb, var(--primary) 30%, transparent)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

// ─── Barra de progreso de misión ───────────────────────────────────────────

export function BarraProgreso({ progreso }: { progreso: number }) {
  const pct = Math.max(0, Math.min(100, progreso));
  return (
    <div
      className="w-full h-1.5 overflow-hidden"
      style={{
        borderRadius: "2px",
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
      }}
    >
      <div
        className="h-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: "color-mix(in srgb, var(--primary) 55%, transparent)",
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

// ─── Pastilla de dificultad ─────────────────────────────────────────────────

export function PastillaDificultad({ dificultad }: { dificultad: Dificultad }) {
  const intensidad = DIFICULTAD_INTENSIDAD[dificultad];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em]"
      style={{
        borderRadius: "2px",
        color: `color-mix(in srgb, var(--primary) ${intensidad}%, transparent)`,
        border: `1px solid color-mix(in srgb, var(--primary) ${Math.min(intensidad, 30)}%, transparent)`,
        background: `color-mix(in srgb, var(--primary) ${Math.round(intensidad / 10)}%, transparent)`,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Star
          key={i}
          size={6}
          fill={
            i < Math.ceil((intensidad / 100) * 4)
              ? "currentColor"
              : "transparent"
          }
          strokeWidth={1.5}
        />
      ))}
      {DIFICULTAD_LABEL[dificultad]}
    </span>
  );
}

// ─── Modal de detalle de misión ────────────────────────────────────────────

interface ModalMisionProps {
  mision: MisionConProgreso;
  onClose: () => void;
  onAceptar?: (mision: MisionConProgreso) => void;
  onReclamar?: (mision: MisionConProgreso) => void;
  aceptando?: boolean;
  reclamando?: boolean;
}

export function ModalMision({
  mision,
  onClose,
  onAceptar,
  onReclamar,
  aceptando,
  reclamando,
}: ModalMisionProps) {
  const estado = mision.user_estado;
  const progreso = mision.progreso ?? 0;

  return (
    <AnimatePresence>
      <MotionDiv
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-40 backdrop-blur-sm"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />
      <MotionDiv
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 md:inset-x-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[28rem]"
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        style={{
          background: "var(--white-custom)",
          borderRadius: "var(--radius-card)",
          border:
            "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
          boxShadow:
            "0 24px 64px color-mix(in srgb, var(--primary) 18%, transparent), 0 4px 16px color-mix(in srgb, var(--primary) 10%, transparent)",
          maxHeight: "88dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        {/* Hero */}
        <div
          className="w-full shrink-0 overflow-hidden relative"
          style={{
            height: mision.imagen_url ? "200px" : "72px",
            background: "color-mix(in srgb, var(--primary) 6%, var(--bg-main))",
          }}
        >
          {mision.imagen_url && (
            <img
              alt={mision.titulo}
              className="w-full h-full object-cover"
              src={mision.imagen_url}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--white-custom) 0%, color-mix(in srgb, var(--white-custom) 30%, transparent) 45%, transparent 100%)",
            }}
          />
          <button
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
            style={{
              color: "var(--primary)",
              background:
                "color-mix(in srgb, var(--white-custom) 85%, transparent)",
              borderRadius: "var(--radius-btn)",
              border:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              backdropFilter: "blur(6px)",
            }}
            onClick={onClose}
          >
            <X size={13} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 flex flex-col gap-1.5">
            <PastillaDificultad dificultad={mision.dificultad} />
            <h2
              className="font-serif italic capitalize leading-tight"
              style={{
                fontSize: "1.5rem",
                color: "var(--primary)",
                lineHeight: 1.15,
              }}
            >
              {mision.titulo}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          {mision.descripcion && (
            <p
              className="font-serif italic leading-relaxed mb-5"
              style={{
                fontSize: "0.88rem",
                color: "color-mix(in srgb, var(--foreground) 68%, transparent)",
                lineHeight: 1.7,
              }}
            >
              {mision.descripcion}
            </p>
          )}

          {mision.requisitos && (
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2"
              style={{
                borderRadius: "var(--radius-btn)",
                background:
                  "color-mix(in srgb, var(--primary) 4%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            >
              <Lock
                size={11}
                style={{
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-wider"
                style={{
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
              >
                {mision.requisitos}
              </span>
            </div>
          )}

          {/* Progreso si está en curso */}
          {estado === "en_curso" && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}
                >
                  Progreso
                </span>
                <span
                  className="text-[10px] font-black tabular-nums"
                  style={{ color: "var(--primary)" }}
                >
                  {progreso}%
                </span>
              </div>
              <BarraProgreso progreso={progreso} />
            </div>
          )}

          {/* Recompensas */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex-1 h-px"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            />
            <div className="flex items-center gap-1.5">
              <Award
                size={10}
                style={{
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              />
              <span
                className="font-serif italic text-[9px] font-black uppercase tracking-widest"
                style={{
                  color: "color-mix(in srgb, var(--primary) 28%, transparent)",
                }}
              >
                Recompensa
              </span>
            </div>
            <div
              className="flex-1 h-px"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5"
              style={{
                borderRadius: "var(--radius-btn)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                background:
                  "color-mix(in srgb, var(--primary) 3%, transparent)",
              }}
            >
              <Sparkles
                size={11}
                style={{
                  color:
                    "color-mix(in srgb, var(--accent) 70%, var(--primary))",
                }}
              />
              <span
                className="text-[11px] font-black tabular-nums"
                style={{ color: "var(--primary)" }}
              >
                {mision.recompensa.xp} XP
              </span>
            </div>

            {!!mision.recompensa.monedas && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  borderRadius: "var(--radius-btn)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  background:
                    "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}
              >
                <Coins
                  size={11}
                  style={{
                    color:
                      "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                />
                <span
                  className="text-[11px] font-black tabular-nums"
                  style={{ color: "var(--primary)" }}
                >
                  {mision.recompensa.monedas}
                </span>
              </div>
            )}

            {mision.recompensa.item_nombre && (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5"
                style={{
                  borderRadius: "var(--radius-btn)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  background:
                    "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}
              >
                {mision.recompensa.item_imagen_url ? (
                  <img
                    alt={mision.recompensa.item_nombre}
                    className="w-4 h-4 object-contain"
                    src={mision.recompensa.item_imagen_url}
                  />
                ) : null}
                <span
                  className="font-serif italic text-[10px]"
                  style={{ color: "var(--primary)" }}
                >
                  {mision.recompensa.item_nombre}
                </span>
              </div>
            )}
          </div>

          {/* Acción */}
          {mision.bloqueada ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 py-3 cursor-not-allowed"
              style={{
                borderRadius: "var(--radius-btn)",
                background:
                  "color-mix(in srgb, var(--primary) 5%, transparent)",
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            >
              <Lock size={12} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Bloqueada
              </span>
            </button>
          ) : estado === "completada" ? (
            <button
              disabled={reclamando}
              className="w-full flex items-center justify-center gap-2 py-3 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                borderRadius: "var(--radius-btn)",
                background: "var(--primary)",
                color: "var(--btn-text)",
              }}
              onClick={() => onReclamar?.(mision)}
            >
              {reclamando ? (
                <Loader2 className="animate-spin" size={13} />
              ) : (
                <Check size={13} />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider">
                Reclamar recompensa
              </span>
            </button>
          ) : estado === "en_curso" ? (
            <div
              className="w-full flex items-center justify-center gap-2 py-3"
              style={{
                borderRadius: "var(--radius-btn)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                color: "color-mix(in srgb, var(--primary) 50%, transparent)",
              }}
            >
              <Clock size={12} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Misión en curso
              </span>
            </div>
          ) : estado === "reclamada" ? (
            <div
              className="w-full flex items-center justify-center gap-2 py-3"
              style={{
                borderRadius: "var(--radius-btn)",
                background:
                  "color-mix(in srgb, var(--primary) 5%, transparent)",
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              <Check size={12} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Completada
              </span>
            </div>
          ) : (
            <button
              disabled={aceptando}
              className="w-full flex items-center justify-center gap-2 py-3 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{
                borderRadius: "var(--radius-btn)",
                background: "var(--primary)",
                color: "var(--btn-text)",
              }}
              onClick={() => onAceptar?.(mision)}
            >
              {aceptando ? (
                <Loader2 className="animate-spin" size={13} />
              ) : (
                <Scroll size={13} />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider">
                Aceptar misión
              </span>
            </button>
          )}
        </div>
      </MotionDiv>
    </AnimatePresence>
  );
}
