"use client";

import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Dice6,
  Heart,
  Loader2,
  Scroll,
  Shield,
  Star,
  Sword,
  WifiOff,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { MotionDiv } from "@/components/ui/Motion";
import {
  invalidateSessionCache,
  loadMisiones,
  loadMisionesUsuario,
  reclamarMisionOffline,
} from "@/lib/api/client/syncEngine";

import type { FichaDnd } from "../hooks/useFichasDnd";
import { buscarCriaturas, statMod } from "../hooks/useFichasDnd";
import { SelectorEntidad } from "./fichaComponents";
import {
  ModalMision,
  type Dificultad,
  type MisionConProgreso,
} from "../components/MisionesComponents";

// Mapa de dificultad → número de estrellas (solo iconos, sin fondo ni texto).
const ESTRELLAS_POR_DIFICULTAD: Record<Dificultad, number> = {
  facil: 1,
  media: 2,
  dificil: 3,
} as Record<Dificultad, number>;

function EstrellasDificultad({ dificultad }: { dificultad: Dificultad }) {
  const total = ESTRELLAS_POR_DIFICULTAD[dificultad] ?? 1;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <Star
          key={i}
          fill={i < total ? "var(--primary)" : "none"}
          size={11}
          style={{
            color:
              i < total
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Panel de ficha (nombre, vida, daño y stats D&D) ───────────────────────
// Reutiliza el mismo lenguaje visual que el panel "Registro" de misiones:
// mismo card, mismo separador con label, mismas barras de 10 segmentos.

const ABREVIATURA_STAT: Record<string, string> = {
  fuerza: "FUE",
  destreza: "DES",
  constitucion: "CON",
  inteligencia: "INT",
  sabiduria: "SAB",
  carisma: "CAR",
};

function SeparadorLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="flex-1 h-px"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      />
      <p
        className="text-micro font-black uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}
      >
        {label}
      </p>
      <div
        className="flex-1 h-px"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      />
    </div>
  );
}

function CampoEditable({
  valor,
  editable,
  onCommit,
  tipo = "text",
  className,
  style,
  align = "left",
  width,
}: {
  valor: string | number;
  editable: boolean;
  onCommit: (valor: string) => void;
  tipo?: "text" | "number";
  className: string;
  style: React.CSSProperties;
  align?: "left" | "right" | "center";
  width?: number;
}) {
  if (!editable) return <>{valor}</>;
  return (
    <input
      type="text"
      inputMode={tipo === "number" ? "numeric" : undefined}
      defaultValue={valor}
      onBlur={(e) => {
        const v = tipo === "number" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value;
        onCommit(v);
      }}
      onChange={
        tipo === "number"
          ? (e) => {
              const filtered = e.target.value.replace(/[^0-9]/g, "");
              if (filtered !== e.target.value) e.target.value = filtered;
            }
          : undefined
      }
      className={`${className} bg-transparent outline-none`}
      style={{
        ...style,
        width: width ?? "100%",
        textAlign: align,
        border: "none",
        borderBottom: "1px dashed color-mix(in srgb, var(--primary) 25%, transparent)",
        padding: 0,
      }}
    />
  );
}

export function FichaStatsPanel({
  ficha,
  headerAction,
  editable = false,
  editableStats = false,
  onEditarCampo,
}: {
  ficha: FichaDnd;
  headerAction?: React.ReactNode;
  /** El dueño de la ficha: puede editar nombre y clase. */
  editable?: boolean;
  /** Solo admin/DM: además puede editar nivel, stats, HP, CA y velocidad. */
  editableStats?: boolean;
  onEditarCampo?: (campo: keyof FichaDnd, valor: string | number | null) => void;
}) {
  const hpMax = ficha.hp_max ?? 0;
  const hpActual = ficha.hp_actual ?? 0;
  const danioCuerpoACuerpo = statMod(ficha.fuerza ?? 10);
  const stats: Array<[string, number]> = [
    ["fuerza", ficha.fuerza ?? 10],
    ["destreza", ficha.destreza ?? 10],
    ["constitucion", ficha.constitucion ?? 10],
    ["inteligencia", ficha.inteligencia ?? 10],
    ["sabiduria", ficha.sabiduria ?? 10],
    ["carisma", ficha.carisma ?? 10],
  ];

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--white-custom)",
        borderRadius: "var(--radius-card)",
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
      }}
    >
      {/* ── Encabezado: retrato + nombre + clase/nivel ── */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div
          className="relative shrink-0 overflow-hidden flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--primary) 8%, var(--bg-main))",
          }}
        >
          {ficha.imagen_url ? (
            <img
              alt={ficha.nombre}
              className="w-full h-full object-cover"
              src={ficha.imagen_url}
            />
          ) : (
            <Sword
              size={18}
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p
              className="font-serif italic text-base leading-tight truncate capitalize"
              style={{ color: "var(--primary)" }}
            >
              <CampoEditable
                valor={ficha.nombre}
                editable={editable}
                onCommit={(v) => onEditarCampo?.("nombre", v)}
                className="font-serif italic text-base leading-tight capitalize"
                style={{ color: "var(--primary)" }}
              />
            </p>
            <p
              className="text-micro font-black uppercase tracking-wider truncate"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              {editable ? (
                <span className="inline-flex items-center gap-1">
                  <CampoEditable
                    valor={ficha.clase ?? ""}
                    editable
                    onCommit={(v) => onEditarCampo?.("clase", v)}
                    className="text-micro font-black uppercase tracking-wider"
                    style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                    width={70}
                  />
                  · Nivel{" "}
                  <CampoEditable
                    valor={ficha.nivel ?? 1}
                    editable={editableStats}
                    tipo="number"
                    onCommit={(v) => onEditarCampo?.("nivel", Number(v) || 1)}
                    className="text-micro font-black uppercase tracking-wider"
                    style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                    width={28}
                  />
                </span>
              ) : (
                <>
                  {ficha.clase ?? "Aventurero"} · Nivel {ficha.nivel ?? 1}
                </>
              )}
            </p>
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </div>

      {/* ── Vida y daño ── */}
      <div
        className="px-5 pt-4 pb-4"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <SeparadorLabel label="Combate" />

        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <div
              className="flex items-center gap-1.5"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Heart size={9} />
              <span className="text-micro font-black uppercase tracking-wider">Vida</span>
            </div>
            <span
              className="text-sm font-black tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              {editableStats ? (
                <span className="inline-flex items-center gap-1">
                  <CampoEditable
                    valor={hpActual}
                    editable
                    tipo="number"
                    align="right"
                    width={32}
                    onCommit={(v) => onEditarCampo?.("hp_actual", Number(v) || 0)}
                    className="text-sm font-black tabular-nums"
                    style={{ color: "var(--primary)" }}
                  />
                  /
                  <CampoEditable
                    valor={hpMax}
                    editable
                    tipo="number"
                    width={32}
                    onCommit={(v) => onEditarCampo?.("hp_max", Number(v) || 0)}
                    className="text-sm font-black tabular-nums"
                    style={{ color: "var(--primary)" }}
                  />
                </span>
              ) : (
                <>
                  {hpActual}/{hpMax || "—"}
                </>
              )}
            </span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 transition-all duration-700"
                style={{
                  background:
                    hpMax > 0 && i < Math.round((hpActual / hpMax) * 10)
                      ? "color-mix(in srgb, var(--primary) 55%, transparent)"
                      : "color-mix(in srgb, var(--primary) 8%, transparent)",
                  borderRadius: "1px",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex-1 flex items-center justify-between px-2.5 py-1.5"
            style={{
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "2px",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
          >
            <span
              className="flex items-center gap-1 text-micro font-black uppercase tracking-wider"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Shield size={9} />
              Defensa
            </span>
            <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
              <CampoEditable
                valor={ficha.ca ?? 10}
                editable={editableStats}
                tipo="number"
                align="right"
                width={28}
                onCommit={(v) => onEditarCampo?.("ca", Number(v) || 0)}
                className="text-sm font-black tabular-nums"
                style={{ color: "var(--primary)" }}
              />
            </span>
          </div>
          <div
            className="flex-1 flex items-center justify-between px-2.5 py-1.5"
            style={{
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "2px",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
          >
            <span
              className="flex items-center gap-1 text-micro font-black uppercase tracking-wider"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Sword size={9} />
              Daño
            </span>
            <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
              {danioCuerpoACuerpo >= 0 ? `+${danioCuerpoACuerpo}` : danioCuerpoACuerpo}
            </span>
          </div>
        </div>
      </div>

      {/* ── Estadísticas D&D ── */}
      <div
        className="px-5 py-4"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <SeparadorLabel label="Estadísticas" />
        <div className="grid grid-cols-3 gap-2">
          {stats.map(([key, valor]) => {
            const mod = statMod(valor);
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-0.5 py-2"
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "2px",
                  background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}
              >
                <span
                  className="text-micro font-black uppercase tracking-wider"
                  style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                >
                  {ABREVIATURA_STAT[key]}
                </span>
                <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
                  <CampoEditable
                    valor={valor}
                    editable={editableStats}
                    tipo="number"
                    align="center"
                    width={26}
                    onCommit={(v) =>
                      onEditarCampo?.(key as keyof FichaDnd, Number(v) || 10)
                    }
                    className="text-sm font-black tabular-nums"
                    style={{ color: "var(--primary)" }}
                  />
                </span>
                <span
                  className="text-micro font-black tabular-nums"
                  style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
                >
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Datos extra: siempre visibles (velocidad, alineamiento, raza).
          Velocidad es una stat de combate: solo admin (o el dueño mientras
          la ficha no esté confirmada). Alineamiento y raza son de rol-play
          y las puede tocar el dueño de la ficha en cualquier momento. ── */}
      <div
        className="px-5 py-4 grid grid-cols-2 gap-2"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <div
          className="flex flex-col gap-0.5 px-2.5 py-1.5"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "2px",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <span
            className="text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Velocidad
          </span>
          <CampoEditable
            valor={ficha.velocidad ?? 30}
            editable={editableStats}
            tipo="number"
            onCommit={(v) => onEditarCampo?.("velocidad", Number(v) || 0)}
            className="text-sm font-black tabular-nums"
            style={{ color: "var(--primary)" }}
          />
        </div>
        <div
          className="flex flex-col gap-0.5 px-2.5 py-1.5"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "2px",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <span
            className="text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Alineamiento
          </span>
          <CampoEditable
            valor={ficha.alineamiento ?? "—"}
            editable={editable}
            onCommit={(v) => onEditarCampo?.("alineamiento", v)}
            className="text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          />
        </div>
        <div
          className="col-span-2 flex flex-col gap-0.5 px-2.5 py-1.5"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "2px",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
        >
          <span
            className="text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Especie / Raza
          </span>
          {editable ? (
            <SelectorEntidad
              placeholder="Elegir especie del mundo…"
              buscar={buscarCriaturas}
              seleccionActual={ficha.especie ?? null}
              onSeleccionar={(c) => onEditarCampo?.("especie_id", c.id)}
              onQuitar={() => onEditarCampo?.("especie_id", null)}
            />
          ) : (
            <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
              {ficha.especie?.nombre ?? ficha.raza ?? "—"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tirada de dados ────────────────────────────────────────────────────────
// Set clásico de D&D (D4/D6/D8/D10/D12/D20/D100). Cada tap tira y anima el
// resultado; guarda las últimas tiradas en una lista corta. Sin persistencia
// en base — es solo una herramienta de mesa, vive en el estado del cliente.

const CARAS_DADO = [4, 6, 8, 10, 12, 20, 100] as const;
type CaraDado = (typeof CARAS_DADO)[number];

interface TiradaHistorial {
  id: string;
  caras: CaraDado;
  resultado: number;
}

function DadoBoton({
  caras,
  onTirar,
  activo,
}: {
  caras: CaraDado;
  onTirar: (caras: CaraDado) => void;
  activo: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onTirar(caras)}
      disabled={activo}
      className="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border transition-all disabled:opacity-60"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
        background: activo
          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
          : "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
    >
      <Dice6
        size={13}
        className={activo ? "animate-spin" : ""}
        style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
      />
      <span
        className="text-micro font-black uppercase tracking-wider"
        style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
      >
        d{caras}
      </span>
    </button>
  );
}

export function TiradaDados() {
  const [tirando, setTirando] = useState<CaraDado | null>(null);
  const [ultima, setUltima] = useState<TiradaHistorial | null>(null);
  const [historial, setHistorial] = useState<TiradaHistorial[]>([]);

  const tirar = useCallback((caras: CaraDado) => {
    setTirando(caras);
    // Pequeña animación antes de revelar el resultado — se siente más a
    // "tirar el dado" que a que el número aparezca instantáneo.
    window.setTimeout(() => {
      const resultado = 1 + Math.floor(Math.random() * caras);
      const nueva: TiradaHistorial = { id: `${Date.now()}-${caras}`, caras, resultado };
      setUltima(nueva);
      setHistorial((prev) => [nueva, ...prev].slice(0, 6));
      setTirando(null);
    }, 420);
  }, []);

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--white-custom)",
        borderRadius: "var(--radius-card)",
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
      }}
    >
      <div className="px-5 pt-4 pb-3 min-h-[28px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {ultima && !tirando && (
            <MotionDiv
              key={ultima.id}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              className="flex items-baseline gap-1"
            >
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              >
                d{ultima.caras}
              </span>
              <span className="text-xl font-black tabular-nums" style={{ color: "var(--primary)" }}>
                {ultima.resultado}
              </span>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 pb-4 flex gap-1.5">
        {CARAS_DADO.map((caras) => (
          <DadoBoton key={caras} caras={caras} activo={tirando === caras} onTirar={tirar} />
        ))}
      </div>

      {historial.length > 1 && (
        <div
          className="px-5 py-2.5 flex items-center gap-1.5 flex-wrap"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
        >
          {historial.slice(1).map((t) => (
            <span
              key={t.id}
              className="text-micro font-bold tabular-nums px-1.5 py-0.5 rounded-full"
              style={{
                color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              }}
            >
              d{t.caras}: {t.resultado}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fila de misiones aceptadas ─────────────────────────────────────────────
// Ya no es un botón que abre un panel aparte: se muestra directo, en fila,
// debajo de la info del personaje. Solo lista lo que la identidad activa ya
// aceptó (en curso o lista para reclamar) — para nada de "tablón" acá.

interface MisionesProps {
  /** Identidad activa (ficha D&D) para la que se cargan/actualizan misiones. */
  ficha: FichaDnd;
  /** Se dispara tras reclamar una recompensa, para refrescar la ficha en el padre. */
  onFichaActualizada?: () => void;
}

const ICONO_ESTADO: Record<string, typeof Clock> = {
  en_curso: Clock,
  completada: CheckCircle2,
};

const LABEL_ESTADO: Record<string, string> = {
  en_curso: "En curso",
  completada: "Lista para reclamar",
};

export default function Misiones({ ficha, onFichaActualizada }: MisionesProps) {
  const [misionModal, setMisionModal] = useState<MisionConProgreso | null>(null);
  const [misiones, setMisiones] = useState<MisionConProgreso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [reclamandoId, setReclamandoId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const showAviso = (msg: string) => {
    setAviso(msg);
    setTimeout(() => setAviso(null), 3500);
  };

  // Combina catálogo + progreso del usuario en una sola lista para la UI.
  const combinarMisiones = useCallback(
    (catalogo: any[], progresoRows: any[]): MisionConProgreso[] => {
      const progresoPorMision = new Map(progresoRows.map((p: any) => [p.mision_id, p]));
      return catalogo.map((m: any) => {
        const prog = progresoPorMision.get(m.id);
        return {
          id: m.id,
          titulo: m.titulo,
          descripcion: m.descripcion,
          dificultad: (m.dificultad as Dificultad) ?? "facil",
          categoria: m.categoria,
          imagen_url: m.imagen_url,
          requisitos: m.requisitos,
          vence_en: m.vence_en,
          recompensa: {
            xp: m.recompensa_xp ?? 0,
            monedas: m.recompensa_monedas ?? undefined,
            item_nombre: m.recompensa_item_nombre ?? undefined,
            item_imagen_url: m.recompensa_item_imagen_url ?? undefined,
          },
          recompensa_item_id: m.recompensa_item_id ?? null,
          user_estado: prog?.estado ?? null,
          progreso: prog?.progreso ?? 0,
        };
      });
    },
    [],
  );

  // ── Carga inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    async function cargarTodo() {
      setCargando(true);
      try {
        const [catalogo, progresoRows] = await Promise.all([
          loadMisiones((catalogoActualizado) => {
            setMisiones((prev) => {
              const progresoActual = prev.map((m) => ({
                mision_id: m.id,
                estado: m.user_estado,
                progreso: m.progreso,
              }));
              return combinarMisiones(catalogoActualizado, progresoActual);
            });
          }),
          loadMisionesUsuario(ficha.id, (progresoActualizado) => {
            setMisiones((prev) => {
              const catalogoActual = prev.map((m) => ({
                id: m.id,
                titulo: m.titulo,
                descripcion: m.descripcion,
                dificultad: m.dificultad,
                categoria: m.categoria,
                imagen_url: m.imagen_url,
                requisitos: m.requisitos,
                vence_en: m.vence_en,
                recompensa_xp: m.recompensa.xp,
                recompensa_monedas: m.recompensa.monedas,
                recompensa_item_nombre: m.recompensa.item_nombre,
                recompensa_item_imagen_url: m.recompensa.item_imagen_url,
                recompensa_item_id: m.recompensa_item_id ?? null,
              }));
              return combinarMisiones(catalogoActual, progresoActualizado);
            });
          }),
        ]);

        setMisiones(combinarMisiones(catalogo, progresoRows));
      } catch (err) {
        console.error("[Misiones] Error inesperado:", err);
      } finally {
        setCargando(false);
      }
    }

    void cargarTodo();
  }, [combinarMisiones, ficha.id]);

  // ── Reclamar recompensa ───────────────────────────────────────────────
  const handleReclamarMision = async (mision: MisionConProgreso) => {
    setReclamandoId(mision.id);
    try {
      // El reclamo NUNCA se aplica de forma optimista: la suma de XP/monedas
      // solo la valida y ejecuta la función reclamar_mision en Supabase.
      // Sin conexión, esto devuelve ok:false con reason "offline" en vez de
      // fingir éxito — evitamos que el cliente decida cuánto XP otorgarse.
      const resultado = await reclamarMisionOffline(mision.id, ficha.id);

      if (resultado.ok) {
        setMisiones((prev) =>
          prev.map((m) => (m.id === mision.id ? { ...m, user_estado: "reclamada" } : m)),
        );
        setMisionModal(null);
        await invalidateSessionCache(`misiones_usuario:${ficha.id}`);
        // El XP/monedas/item se entregaron en el servidor — notificamos al
        // padre para que refresque la ficha (y su panel de stats).
        onFichaActualizada?.();
      } else if (resultado.reason === "offline") {
        setOffline(true);
        showAviso("Necesitas conexión a internet para reclamar la recompensa.");
      } else {
        console.warn("[Misiones] Error reclamando misión:", resultado.message);
        showAviso("No se pudo reclamar la recompensa. Intenta de nuevo.");
      }
    } finally {
      setReclamandoId(null);
    }
  };

  // Solo lo que la identidad ya aceptó: en curso o completada (lista para
  // reclamar). Lo reclamado ya no aporta nada nuevo, se deja de mostrar.
  const misionesAceptadas = misiones.filter(
    (m) => m.user_estado === "en_curso" || m.user_estado === "completada",
  );

  if (cargando) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2
          className="animate-spin"
          size={14}
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        />
        <span
          className="text-micro font-black uppercase tracking-[0.2em]"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        >
          Cargando misiones…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <AnimatePresence>
        {misionModal && (
          <ModalMision
            aceptando={false}
            mision={misionModal}
            reclamando={reclamandoId === misionModal.id}
            onClose={() => setMisionModal(null)}
            onReclamar={handleReclamarMision}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Scroll size={11} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
          <span
            className="text-micro font-black uppercase tracking-[0.22em]"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Misiones aceptadas
          </span>
        </div>
        {offline && (
          <div className="flex items-center gap-1 shrink-0">
            <WifiOff size={9} style={{ color: "#d97706" }} />
            <span className="text-micro font-black uppercase tracking-wider" style={{ color: "#d97706" }}>
              Sin conexión
            </span>
          </div>
        )}
      </div>

      {aviso && (
        <div
          className="px-2.5 py-1.5 text-micro font-bold"
          style={{
            borderRadius: "2px",
            border: "1px solid color-mix(in srgb, #d97706 30%, transparent)",
            background: "color-mix(in srgb, #d97706 8%, var(--white-custom))",
            color: "#d97706",
          }}
        >
          {aviso}
        </div>
      )}

      {misionesAceptadas.length === 0 ? (
        <div
          className="px-3 py-3 text-center"
          style={{
            borderRadius: "2px",
            border: "1px dashed color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          <p
            className="text-micro font-bold"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
          >
            Todavía no aceptaste ninguna misión.
          </p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {misionesAceptadas.map((mision) => {
            const IconoEstado = ICONO_ESTADO[mision.user_estado ?? "en_curso"] ?? Clock;
            const lista = mision.user_estado === "completada";
            return (
              <button
                key={mision.id}
                type="button"
                onClick={() => setMisionModal(mision)}
                className="shrink-0 flex flex-col gap-1.5 px-3 py-2.5 text-left transition-colors"
                style={{
                  width: 168,
                  borderRadius: "2px",
                  border: lista
                    ? "1px solid color-mix(in srgb, var(--primary) 30%, transparent)"
                    : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  background: lista
                    ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                    : "color-mix(in srgb, var(--primary) 2%, transparent)",
                }}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <EstrellasDificultad dificultad={mision.dificultad} />
                  <IconoEstado
                    size={11}
                    style={{
                      color: lista
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 40%, transparent)",
                    }}
                  />
                </div>
                <p
                  className="text-xs font-bold leading-tight line-clamp-2"
                  style={{ color: "var(--primary)" }}
                >
                  {mision.titulo}
                </p>
                <span
                  className="text-micro font-black uppercase tracking-wider"
                  style={{
                    color: lista
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}
                >
                  {LABEL_ESTADO[mision.user_estado ?? "en_curso"]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
