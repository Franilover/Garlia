"use client";

import { AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  Award,
  Backpack,
  Ban,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  CircleOff,
  Clock,
  Coins,
  Dice6,
  EarOff,
  EyeOff,
  Ghost,
  Hand,
  Heart,
  Languages,
  Link2,
  Loader2,
  Maximize2,
  Minus,
  Moon,
  Mountain,
  Plus,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sword,
  Target,
  Trash2,
  Wand2,
  Wrench,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MotionDiv } from "@/components/ui/Motion";
import {
  invalidateSessionCache,
  loadMisiones,
  loadMisionesUsuario,
  reclamarMisionOffline,
} from "@/lib/api/client/syncEngine";

import type {
  CampoFichaValor,
  ConjuroFicha,
  FichaDnd,
  ItemInventarioFicha,
  RasgoEspecial,
  TipoMoneda,
} from "../hooks/useFichasDnd";
import {
  bonoAtaqueConjuros,
  bonusCompetencia,
  buscarCriaturas,
  buscarItems,
  cdSalvacionConjuros,
  percepcionPasiva,
  statMod,
  useClasesDisponibles,
  useInventarioFicha,
  useSubclasesDisponibles,
  useTiposMoneda,
  useTrasfondosDisponibles,
} from "../hooks/useFichasDnd";
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

// Las 18 habilidades (skills) oficiales de D&D, agrupadas por la stat de la
// que dependen. Constitución no tiene skills asociadas, por eso no aparece
// ninguna fila para esa stat.
const SKILLS_POR_STAT: Record<string, Array<{ id: string; nombre: string }>> = {
  fuerza: [{ id: "atletismo", nombre: "Atletismo" }],
  destreza: [
    { id: "acrobacias", nombre: "Acrobacias" },
    { id: "juego_de_manos", nombre: "Juego de manos" },
    { id: "sigilo", nombre: "Sigilo" },
  ],
  constitucion: [],
  inteligencia: [
    { id: "arcanos", nombre: "Arcanos" },
    { id: "historia", nombre: "Historia" },
    { id: "investigacion", nombre: "Investigación" },
    { id: "naturaleza", nombre: "Naturaleza" },
    { id: "religion", nombre: "Religión" },
  ],
  sabiduria: [
    { id: "trato_con_animales", nombre: "Trato con animales" },
    { id: "perspicacia", nombre: "Perspicacia" },
    { id: "medicina", nombre: "Medicina" },
    { id: "percepcion", nombre: "Percepción" },
    { id: "supervivencia", nombre: "Supervivencia" },
  ],
  carisma: [
    { id: "engano", nombre: "Engaño" },
    { id: "intimidacion", nombre: "Intimidación" },
    { id: "interpretacion", nombre: "Interpretación" },
    { id: "persuasion", nombre: "Persuasión" },
  ],
};

// Las 14 condiciones oficiales de D&D 5e. Íconos Lucide en vez de emoji:
// consistentes con el resto de la estética de la app (los emoji desentonaban
// con el lenguaje visual de la ficha).
const CONDICIONES_DND: Array<{ id: string; nombre: string; Icon: React.ElementType }> = [
  { id: "cegado", nombre: "Cegado", Icon: EyeOff },
  { id: "aturdido", nombre: "Aturdido", Icon: CircleDashed },
  { id: "ensordecido", nombre: "Ensordecido", Icon: EarOff },
  { id: "asustado", nombre: "Asustado", Icon: Ghost },
  { id: "agarrado", nombre: "Agarrado", Icon: Hand },
  { id: "incapacitado", nombre: "Incapacitado", Icon: Ban },
  { id: "invisible", nombre: "Invisible", Icon: CircleOff },
  { id: "paralizado", nombre: "Paralizado", Icon: Zap },
  { id: "petrificado", nombre: "Petrificado", Icon: Mountain },
  { id: "envenenado", nombre: "Envenenado", Icon: Skull },
  { id: "derribado", nombre: "Derribado", Icon: ArrowDown },
  { id: "apresado", nombre: "Apresado", Icon: Link2 },
  { id: "atontado", nombre: "Atontado (stunned)", Icon: Sparkles },
  { id: "inconsciente", nombre: "Inconsciente", Icon: Moon },
];

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

// Variante textarea de CampoEditable, para textos largos de rol-play
// (rasgos, ideales, vínculos, defectos). Mismo patrón: solo se ve como
// input cuando `editable`, si no es texto plano.
function CampoEditableTextarea({
  valor,
  editable,
  onCommit,
  placeholder,
}: {
  valor: string | null;
  editable: boolean;
  onCommit: (valor: string) => void;
  placeholder?: string;
}) {
  if (!editable) {
    return (
      <p className="text-xs leading-relaxed text-primary/70 whitespace-pre-wrap">
        {valor?.trim() ? valor : "—"}
      </p>
    );
  }
  return (
    <textarea
      defaultValue={valor ?? ""}
      onBlur={(e) => onCommit(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="w-full bg-transparent outline-none resize-none text-xs leading-relaxed text-primary/70 placeholder:text-primary/25"
      style={{
        border: "none",
        borderBottom: "1px dashed color-mix(in srgb, var(--primary) 25%, transparent)",
        padding: 0,
      }}
    />
  );
}

// Editor de listas cortas de texto libre (idiomas, herramientas): se ven
// como chips; en modo editable cada chip tiene una X para quitarlo y hay
// un input al final para escribir uno nuevo y confirmarlo con Enter.
function EditorListaTags({
  valores,
  editable,
  onCambiar,
  placeholder,
}: {
  valores: string[];
  editable: boolean;
  onCambiar: (siguientes: string[]) => void;
  placeholder: string;
}) {
  const [nuevo, setNuevo] = useState("");

  const agregar = () => {
    const v = nuevo.trim();
    if (!v) return;
    if (valores.some((existente) => existente.toLowerCase() === v.toLowerCase())) {
      setNuevo("");
      return;
    }
    onCambiar([...valores, v]);
    setNuevo("");
  };

  if (valores.length === 0 && !editable) {
    return <p className="text-xs text-primary/30">—</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {valores.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 px-2 py-1 text-micro font-semibold rounded-full"
          style={{
            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
            color: "color-mix(in srgb, var(--primary) 70%, transparent)",
          }}
        >
          {v}
          {editable && (
            <span
              role="button"
              onClick={() => onCambiar(valores.filter((x) => x !== v))}
              className="cursor-pointer hover:text-red-500 transition-colors"
            >
              <X size={9} />
            </span>
          )}
        </span>
      ))}
      {editable && (
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          onBlur={agregar}
          placeholder={placeholder}
          className="min-w-[90px] flex-1 bg-transparent outline-none text-micro text-primary/60 placeholder:text-primary/25 px-1 py-1"
        />
      )}
    </div>
  );
}
// ─── Panel flotante expandido: idiomas, herramientas y trasfondo ──────────
// Se abre con el botón de expandir del header y cubre el tablero mientras
// está abierta (overlay fixed a pantalla completa, panel horizontal ancho
// centrado). Pensado para leer/editar esos campos con más aire que en la
// columna lateral angosta de /aventura.

// ── Campo simple de identidad (label + valor/select), sin caja ni borde —
// el look minimalista se apoya en el grid y el espaciado, no en tarjetas. ──
function CampoIdentidad({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="text-micro font-black uppercase tracking-wider"
        style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

// ── Bloque de texto de rasgo (dentro de "Ver rasgos"), sin caja propia. ──
function RasgoTexto({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-micro font-black uppercase tracking-wider"
        style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
      >
        {titulo}
      </span>
      <span className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--primary)" }}>
        {texto}
      </span>
    </div>
  );
}

function PanelExpandidoFicha({
  ficha,
  editable,
  editableStats,
  clasesDisponibles,
  subclasesDisponibles,
  trasfondosDisponibles,
  onEditarCampo,
  onCerrar,
  anclaRef,
}: {
  ficha: FichaDnd;
  editable: boolean;
  /** Solo admin/DM (o el dueño mientras la ficha no esté confirmada):
   *  controla espacios de conjuro y otros números "de combate" dentro del
   *  panel expandido (conjuros). */
  editableStats: boolean;
  clasesDisponibles: Array<{ id: string; nombre: string; descripcion?: string | null }>;
  subclasesDisponibles: Array<{ id: string; nombre: string; descripcion?: string | null }>;
  trasfondosDisponibles: Array<{ id: string; nombre: string; descripcion?: string | null }>;
  onEditarCampo?: (
    campo: keyof FichaDnd,
    valor: CampoFichaValor,
  ) => void;
  onCerrar: () => void;
  /** Ref al contenedor del panel principal — el flotante se ancla a su
      borde, como si el panel "se estirara" hacia el costado. */
  anclaRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ANCHO_PANEL = 560;
  const MARGEN = 16;
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    height: number;
    lado: "derecha" | "izquierda";
  } | null>(null);

  useEffect(() => {
    const calcular = () => {
      const el = anclaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cabeHaDerecha = rect.right + MARGEN + ANCHO_PANEL <= vw - MARGEN;
      const lado: "derecha" | "izquierda" = cabeHaDerecha ? "derecha" : "izquierda";
      const left = cabeHaDerecha
        ? rect.right + MARGEN
        : Math.max(MARGEN, rect.left - MARGEN - ANCHO_PANEL);
      // Misma altura que el panel ancla, pero nunca se sale de la pantalla
      // ni se corta: se clampea entre el margen superior/inferior de la
      // ventana, conservando el top del ancla como referencia.
      const top = Math.max(MARGEN, Math.min(rect.top, vh - MARGEN - 200));
      const height = Math.min(rect.height, vh - top - MARGEN);
      setPos({ left, top, height, lado });
    };
    calcular();
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", calcular, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", calcular, true);
    };
  }, [anclaRef]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCerrar]);

  // Portal a document.body: el panel es "fixed", pero si se queda anidado
  // dentro de la tarjeta de ficha (que tiene overflow-hidden y, por los
  // motion.div con transform, su propio stacking context) el navegador lo
  // recorta o lo deja detrás de otros elementos con z-index propio, como
  // las tarjetas del tablero. Portal lo saca de ese árbol por completo.
  if (typeof document === "undefined") return null;
  if (!pos) return null;

  // En mobile (pantalla angosta) no hay lugar al costado: cae a un panel
  // centrado clásico, más ancho, igual sin overlay oscuro pesado.
  const esMobile = typeof window !== "undefined" && window.innerWidth < 860;

  return createPortal(
    <>
      {/* Capa invisible solo para detectar el click-afuera; no oscurece,
          para que el panel se sienta "conectado" y no como un modal aparte. */}
      <div className="fixed inset-0 z-[60]" onClick={onCerrar} />
      <MotionDiv
        animate={{ opacity: 1, x: 0 }}
        className="fixed z-[61] overflow-y-auto"
        exit={{ opacity: 0, x: pos.lado === "derecha" ? -8 : 8 }}
        initial={{ opacity: 0, x: pos.lado === "derecha" ? -8 : 8 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={
          esMobile
            ? {
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(94vw, 560px)",
                maxHeight: "86vh",
                background: "var(--white-custom)",
                borderRadius: "var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                boxShadow: "0 20px 60px color-mix(in srgb, black 25%, transparent)",
              }
            : {
                left: pos.left,
                top: pos.top,
                width: ANCHO_PANEL,
                height: pos.height,
                background: "var(--white-custom)",
                // Esquinas rectas del lado que "conecta" con el panel
                // principal, redondeadas del otro — da la sensación de
                // que es una extensión de la misma tarjeta, no un panel
                // separado flotando encima.
                borderRadius:
                  pos.lado === "derecha"
                    ? "0 var(--radius-card) var(--radius-card) 0"
                    : "var(--radius-card) 0 0 var(--radius-card)",
                border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
                borderLeft:
                  pos.lado === "derecha"
                    ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
                    : undefined,
                borderRight:
                  pos.lado === "izquierda"
                    ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)"
                    : undefined,
                boxShadow: "0 12px 32px color-mix(in srgb, black 16%, transparent)",
              }
        }
      >
        {/* ── Header con nombre + cerrar ── */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between gap-3"
          style={{
            background: "var(--white-custom)",
            borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <div className="min-w-0">
            <p
              className="font-serif italic text-lg leading-tight truncate capitalize"
              style={{ color: "var(--primary)" }}
            >
              {ficha.nombre}
            </p>
            <p
              className="text-micro font-black uppercase tracking-wider"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              Clase · Trasfondo · Rasgos · Conjuros · Inventario
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="shrink-0 flex items-center justify-center transition-colors"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Cuerpo: idiomas y herramientas lado a lado arriba, trasfondo
            abajo — pensado para el ancho angosto del panel anexo (560px),
            no para un modal ancho centrado. ── */}
        <div className="p-6 flex flex-col gap-6">
          {/* ── Identidad: Clase/Subclase y Trasfondo/Especie en 2 columnas,
              Alineamiento debajo ocupando todo el ancho. Los rasgos largos de
              cada elección van colapsados en "Ver rasgos" para no inflar el
              panel — minimalista, solo lo esencial a la vista. ── */}
          <div
            className="flex flex-col gap-3 pb-4"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <CampoIdentidad label="Clase">
                {editable ? (
                  <select
                    value={ficha.clase ?? ""}
                    onChange={(e) => {
                      const nombreElegido = e.target.value;
                      const elegido = clasesDisponibles.find((c) => c.nombre === nombreElegido);
                      onEditarCampo?.("clase", nombreElegido);
                      onEditarCampo?.("rasgo_clase", elegido?.descripcion?.trim() || null);
                    }}
                    className="text-sm font-semibold bg-transparent outline-none w-full"
                    style={{ color: "var(--primary)" }}
                  >
                    <option value="">—</option>
                    {clasesDisponibles.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                    {ficha.clase ?? "—"}
                  </span>
                )}
              </CampoIdentidad>

              <CampoIdentidad label="Subclase">
                {editable ? (
                  <select
                    value={ficha.subclase ?? ""}
                    onChange={(e) => {
                      const nombreElegido = e.target.value;
                      const elegido = subclasesDisponibles.find((s) => s.nombre === nombreElegido);
                      onEditarCampo?.("subclase", nombreElegido);
                      onEditarCampo?.("rasgo_subclase", elegido?.descripcion?.trim() || null);
                    }}
                    className="text-sm font-semibold bg-transparent outline-none w-full"
                    style={{ color: "var(--primary)" }}
                  >
                    <option value="">—</option>
                    {subclasesDisponibles.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                    {ficha.subclase ?? "—"}
                  </span>
                )}
              </CampoIdentidad>

              <CampoIdentidad label="Trasfondo">
                {editable ? (
                  <select
                    value={ficha.trasfondo_mecanico ?? ""}
                    onChange={(e) => {
                      const nombreElegido = e.target.value;
                      const elegido = trasfondosDisponibles.find((t) => t.nombre === nombreElegido);
                      onEditarCampo?.("trasfondo_mecanico", nombreElegido);
                      onEditarCampo?.("rasgo_trasfondo", elegido?.descripcion?.trim() || null);
                    }}
                    className="text-sm font-semibold bg-transparent outline-none w-full"
                    style={{ color: "var(--primary)" }}
                  >
                    <option value="">—</option>
                    {trasfondosDisponibles.map((t) => (
                      <option key={t.id} value={t.nombre}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                    {ficha.trasfondo_mecanico ?? "—"}
                  </span>
                )}
              </CampoIdentidad>

              <CampoIdentidad label="Especie">
                {editable ? (
                  <SelectorEntidad
                    placeholder="Elegir especie…"
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
              </CampoIdentidad>
            </div>

            <CampoIdentidad label="Alineamiento">
              <CampoEditable
                valor={ficha.alineamiento ?? "—"}
                editable={editable}
                onCommit={(v) => onEditarCampo?.("alineamiento", v)}
                className="text-sm font-semibold"
                style={{ color: "var(--primary)" }}
              />
            </CampoIdentidad>

            {(ficha.rasgo_clase ||
              ficha.rasgo_subclase ||
              ficha.rasgo_trasfondo ||
              ficha.especie?.descripcion_dnd) && (
              <details className="group mt-0.5">
                <summary
                  className="cursor-pointer list-none flex items-center gap-1 text-micro font-black uppercase tracking-wider select-none"
                  style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                >
                  <span className="inline-block transition-transform group-open:rotate-90">›</span>
                  Ver rasgos
                </summary>
                <div className="flex flex-col gap-2.5 mt-2.5">
                  {ficha.rasgo_clase && (
                    <RasgoTexto titulo={`Rasgo de ${ficha.clase ?? "clase"}`} texto={ficha.rasgo_clase} />
                  )}
                  {ficha.rasgo_subclase && (
                    <RasgoTexto titulo={`Rasgo de ${ficha.subclase ?? "subclase"}`} texto={ficha.rasgo_subclase} />
                  )}
                  {ficha.rasgo_trasfondo && (
                    <RasgoTexto
                      titulo={`Rasgo de ${ficha.trasfondo_mecanico ?? "trasfondo"}`}
                      texto={ficha.rasgo_trasfondo}
                    />
                  )}
                  {ficha.especie?.descripcion_dnd && (
                    <RasgoTexto titulo={`Rasgos de ${ficha.especie.nombre}`} texto={ficha.especie.descripcion_dnd} />
                  )}
                </div>
              </details>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <span
                className="flex items-center gap-1.5 text-micro font-black uppercase tracking-wider mb-2"
                style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              >
                <Languages size={11} />
                Idiomas
              </span>
              <EditorListaTags
                valores={ficha.idiomas ?? []}
                editable={editable}
                onCambiar={(siguientes) => onEditarCampo?.("idiomas", siguientes)}
                placeholder="Agregar idioma…"
              />
            </div>
            <div>
              <span
                className="flex items-center gap-1.5 text-micro font-black uppercase tracking-wider mb-2"
                style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
              >
                <Wrench size={11} />
                Herramientas
              </span>
              <EditorListaTags
                valores={ficha.herramientas ?? []}
                editable={editable}
                onCambiar={(siguientes) => onEditarCampo?.("herramientas", siguientes)}
                placeholder="Agregar herramienta…"
              />
            </div>
          </div>
          <div
            className="flex flex-col gap-4 pt-1"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <span
              className="flex items-center gap-1.5 text-micro font-black uppercase tracking-wider pt-3"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Scroll size={11} />
              Trasfondo
            </span>
            <div>
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              >
                Rasgos de personalidad
              </span>
              <CampoEditableTextarea
                valor={ficha.rasgos_personalidad}
                editable={editable}
                onCommit={(v) => onEditarCampo?.("rasgos_personalidad", v || null)}
                placeholder="¿Qué lo hace distinto a cualquier otro aventurero?"
              />
            </div>
            <div>
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              >
                Ideales
              </span>
              <CampoEditableTextarea
                valor={ficha.ideales}
                editable={editable}
                onCommit={(v) => onEditarCampo?.("ideales", v || null)}
                placeholder="¿Qué principios lo guían?"
              />
            </div>
            <div>
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              >
                Vínculos
              </span>
              <CampoEditableTextarea
                valor={ficha.vinculos}
                editable={editable}
                onCommit={(v) => onEditarCampo?.("vinculos", v || null)}
                placeholder="¿A quién o qué está atado?"
              />
            </div>
            <div>
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
              >
                Defectos
              </span>
              <CampoEditableTextarea
                valor={ficha.defectos}
                editable={editable}
                onCommit={(v) => onEditarCampo?.("defectos", v || null)}
                placeholder="¿Qué punto débil podrían explotar en su contra?"
              />
            </div>
          </div>

          {/* ── Rasgos y habilidades especiales (+ dotes), conjuros e
              inventario/ataques: viven acá, en el panel expandido, para
              dejar el panel lateral por defecto compacto con solo lo que se
              consulta todo el tiempo en mesa (combate, stats, habilidades). ── */}
          <div className="flex flex-col gap-1 -mx-6">
            <PanelRasgosEspeciales
              rasgos={ficha.rasgos_especiales ?? []}
              editable={editable}
              onCambiar={(siguientes) => onEditarCampo?.("rasgos_especiales", siguientes)}
            />
            <PanelConjuros
              ficha={ficha}
              editable={editable}
              editableStats={editableStats}
              onEditarCampo={onEditarCampo}
            />
            <PanelInventarioFicha
              fichaId={ficha.id}
              editable={editable}
              bonoCompetencia={bonusCompetencia(ficha.nivel ?? 1)}
              fuerza={ficha.fuerza ?? 10}
              destreza={ficha.destreza ?? 10}
            />
          </div>
        </div>
      </MotionDiv>
    </>,
    document.body,
  );
}

export function FichaStatsPanel({
  ficha,
  headerAction,
  editable = false,
  editableStats = false,
  editableCondiciones = false,
  mostrarCondiciones = true,
  onEditarCampo,
}: {
  ficha: FichaDnd;
  headerAction?: React.ReactNode;
  /** El dueño de la ficha: puede editar nombre y clase. */
  editable?: boolean;
  /** Solo admin/DM: además puede editar nivel, stats, HP, CA y velocidad. */
  editableStats?: boolean;
  /** Solo admin/DM, siempre: controla condiciones activas y HP actual en vivo. */
  editableCondiciones?: boolean;
  /** Si el bloque de condiciones/estado aparece en esta vista. En /aventura
      se oculta por completo — el DM lo maneja desde su panel aparte. */
  mostrarCondiciones?: boolean;
  onEditarCampo?: (
    campo: keyof FichaDnd,
    valor: CampoFichaValor,
  ) => void;
}) {
  const hpMax = ficha.hp_max ?? 0;
  const hpActual = ficha.hp_actual ?? 0;
  const hpTemporal = ficha.hp_temporal ?? 0;
  const iniciativa = statMod(ficha.destreza ?? 10);
  const danioCuerpoACuerpo = statMod(ficha.fuerza ?? 10);
  const bonoCompetencia = bonusCompetencia(ficha.nivel ?? 1);
  const percepcion = percepcionPasiva(ficha);
  const { tipos: tiposMoneda } = useTiposMoneda();
  const { clases: clasesDisponibles } = useClasesDisponibles();
  const { subclases: subclasesDisponibles } = useSubclasesDisponibles();
  const { trasfondos: trasfondosDisponibles } = useTrasfondosDisponibles();
  const [expandido, setExpandido] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
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
      ref={panelRef}
      className="overflow-hidden"
      style={{
        background: "var(--white-custom)",
        borderRadius: "var(--radius-card)",
        border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
      }}
    >
      {/* ── Panel anexo: se abre pegado al costado de esta tarjeta, como si
          se estirara hacia el lado, con idiomas, herramientas y trasfondo
          con más espacio para leer/editar. Cierra con la X, clic afuera,
          o Escape. ── */}
      <AnimatePresence>
        {expandido && (
          <PanelExpandidoFicha
            ficha={ficha}
            editable={editable}
            editableStats={editableStats}
            clasesDisponibles={clasesDisponibles}
            subclasesDisponibles={subclasesDisponibles}
            trasfondosDisponibles={trasfondosDisponibles}
            onEditarCampo={onEditarCampo}
            onCerrar={() => setExpandido(false)}
            anclaRef={panelRef}
          />
        )}
      </AnimatePresence>

      {/* ── Encabezado: botón expandir + nombre + clase/nivel ── */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpandido(true)}
          title="Ver idiomas, herramientas y trasfondo en grande"
          className="relative shrink-0 flex items-center justify-center transition-colors"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--primary) 8%, var(--bg-main))",
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "color-mix(in srgb, var(--primary) 14%, transparent)";
            (e.currentTarget as HTMLElement).style.color = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "color-mix(in srgb, var(--primary) 8%, var(--bg-main))";
            (e.currentTarget as HTMLElement).style.color =
              "color-mix(in srgb, var(--primary) 40%, transparent)";
          }}
        >
          <Maximize2 size={18} />
        </button>
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
                  <select
                    value={ficha.clase ?? ""}
                    onChange={(e) => onEditarCampo?.("clase", e.target.value)}
                    className="text-micro font-black uppercase tracking-wider bg-transparent outline-none"
                    style={{
                      color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                      borderBottom: "1px dashed color-mix(in srgb, var(--primary) 25%, transparent)",
                      maxWidth: 90,
                    }}
                  >
                    <option value="">Clase…</option>
                    {clasesDisponibles.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
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
          {(editable || ficha.inspiracion) && (
            <button
              type="button"
              disabled={!editable}
              title={
                ficha.inspiracion
                  ? "Tiene inspiración: puede gastarla para tener ventaja en una tirada."
                  : "Sin inspiración."
              }
              onClick={() => editable && onEditarCampo?.("inspiracion", !ficha.inspiracion)}
              className="shrink-0 flex items-center justify-center transition-all disabled:cursor-default"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: ficha.inspiracion
                  ? "1px solid color-mix(in srgb, var(--primary) 40%, transparent)"
                  : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                background: ficha.inspiracion
                  ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                  : "transparent",
              }}
            >
              <Sparkles
                size={13}
                fill={ficha.inspiracion ? "var(--primary)" : "none"}
                style={{
                  color: ficha.inspiracion
                    ? "var(--primary)"
                    : "color-mix(in srgb, var(--primary) 30%, transparent)",
                }}
              />
            </button>
          )}
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </div>

      {/* ── Avatar de estado: condiciones activas, siempre visibles como chips.
          Solo admin/DM puede tildar/destildar (editableCondiciones), nunca el
          dueño de la ficha — el estado de juego en vivo lo controla el DM. ── */}
      {mostrarCondiciones && (ficha.condiciones?.length > 0 || editableCondiciones) && (
        <div
          className="px-5 pb-4 flex flex-wrap gap-1.5"
          style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", paddingTop: 12 }}
        >
          {CONDICIONES_DND.filter(
            (c) => editableCondiciones || ficha.condiciones?.includes(c.id),
          ).map((c) => {
            const condicionActiva = ficha.condiciones?.includes(c.id) ?? false;
            const Icon = c.Icon;
            return (
              <button
                key={c.id}
                type="button"
                disabled={!editableCondiciones}
                title={c.nombre}
                onClick={() => {
                  if (!editableCondiciones) return;
                  const actuales = ficha.condiciones ?? [];
                  const siguientes = condicionActiva
                    ? actuales.filter((id) => id !== c.id)
                    : [...actuales, c.id];
                  onEditarCampo?.("condiciones", siguientes);
                }}
                className="flex items-center justify-center transition-all disabled:cursor-default"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: condicionActiva
                    ? "1px solid color-mix(in srgb, var(--primary) 35%, transparent)"
                    : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  background: condicionActiva
                    ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                    : "color-mix(in srgb, var(--primary) 3%, transparent)",
                  opacity: condicionActiva || editableCondiciones ? 1 : 0.3,
                }}
              >
                <Icon
                  size={13}
                  style={{
                    color: condicionActiva
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 50%, transparent)",
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
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
              className="text-sm font-black tabular-nums flex items-center gap-1.5"
              style={{ color: "var(--primary)" }}
            >
              {(editableStats || editableCondiciones) ? (
                <span className="inline-flex items-center gap-1">
                  <CampoEditable
                    valor={hpActual}
                    editable={editableCondiciones}
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
                    editable={editableStats}
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
              {/* ── PG temporales: absorben daño antes que los reales.
                  Se muestran como un chip "+N" aparte de la barra normal
                  porque NO se suman al máximo (regla 2024: no se acumulan,
                  el mayor de los dos reemplaza al otro). ── */}
              {(editableCondiciones || hpTemporal > 0) && (
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-micro font-black tabular-nums"
                  style={{
                    background: "color-mix(in srgb, #60a5fa 15%, transparent)",
                    color: "#3b82f6",
                  }}
                  title="Puntos de golpe temporales: absorben daño antes que los reales."
                >
                  +
                  <CampoEditable
                    valor={hpTemporal}
                    editable={editableCondiciones}
                    tipo="number"
                    align="right"
                    width={18}
                    onCommit={(v) => onEditarCampo?.("hp_temporal", Number(v) || 0)}
                    className="text-micro font-black tabular-nums"
                    style={{ color: "#3b82f6" }}
                  />
                </span>
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

        {/* ── Salvaciones contra muerte: solo aparecen a 0 HP. 3 éxitos
            estabilizan, 3 fracasos matan. Las marca el DM en vivo, igual
            que HP actual (editableCondiciones), nunca el dueño. ── */}
        {hpActual <= 0 && (
          <div className="mb-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, #22c55e 60%, transparent)" }}
              >
                Éxitos
              </span>
              {[0, 1, 2].map((i) => {
                const marcado = i < (ficha.muerte_exitos ?? 0);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!editableCondiciones}
                    onClick={() => onEditarCampo?.("muerte_exitos", marcado ? i : i + 1)}
                    className="rounded-full transition-colors disabled:cursor-default"
                    style={{
                      width: 12,
                      height: 12,
                      border: "1.5px solid #22c55e",
                      background: marcado ? "#22c55e" : "transparent",
                    }}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-micro font-black uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, #ef4444 60%, transparent)" }}
              >
                Fracasos
              </span>
              {[0, 1, 2].map((i) => {
                const marcado = i < (ficha.muerte_fracasos ?? 0);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!editableCondiciones}
                    onClick={() => onEditarCampo?.("muerte_fracasos", marcado ? i : i + 1)}
                    className="rounded-full transition-colors disabled:cursor-default"
                    style={{
                      width: 12,
                      height: 12,
                      border: "1.5px solid #ef4444",
                      background: marcado ? "#ef4444" : "transparent",
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">

          <div
            className="flex-1 flex items-center justify-between px-2.5 py-1.5"
            style={{
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "2px",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
            title="Iniciativa = modificador de Destreza."
          >
            <span
              className="flex items-center gap-1 text-micro font-black uppercase tracking-wider"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Zap size={9} />
              Iniciativa
            </span>
            <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
              {iniciativa >= 0 ? `+${iniciativa}` : iniciativa}
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
          <div
            className="flex-1 flex items-center justify-between px-2.5 py-1.5"
            style={{
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              borderRadius: "2px",
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
            title="Se calcula solo según el nivel: base de habilidades, salvaciones y ataques."
          >
            <span
              className="flex items-center gap-1 text-micro font-black uppercase tracking-wider"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
            >
              <Star size={9} />
              Compet.
            </span>
            <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
              +{bonoCompetencia}
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
        <div className="grid grid-cols-2 gap-2 items-start">
          {stats.map(([key, valor]) => {
            const mod = statMod(valor);
            const skills = SKILLS_POR_STAT[key] ?? [];
            const salvacionCompetente = ficha.salvaciones_competentes?.includes(key) ?? false;
            const salvacionBonus =
              mod + (salvacionCompetente ? bonusCompetencia(ficha.nivel ?? 1) : 0);
            return (
              <div
                key={key}
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "2px",
                  background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}
              >
                {/* Fila de la stat: abreviatura, valor editable y modificador. */}
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span
                    className="w-8 shrink-0 text-micro font-black uppercase tracking-wider"
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
                    ({mod >= 0 ? `+${mod}` : mod})
                  </span>
                </div>

                {/* Salvación de esta stat, anidada justo debajo — mismo
                    patrón visual que las skills, para que quede claro que
                    es otra "sub-fila" de la característica. */}
                <div
                  style={{
                    borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  }}
                >
                  <button
                    type="button"
                    disabled={!editableStats}
                    onClick={() => {
                      if (!editableStats) return;
                      const actuales = ficha.salvaciones_competentes ?? [];
                      const siguientes = salvacionCompetente
                        ? actuales.filter((k) => k !== key)
                        : [...actuales, key];
                      onEditarCampo?.("salvaciones_competentes", siguientes);
                    }}
                    className="w-full flex items-center justify-between pl-6 pr-2.5 py-1 transition-all disabled:cursor-default"
                  >
                    <span
                      className="flex items-center gap-1.5 text-micro"
                      style={{
                        color: salvacionCompetente
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 45%, transparent)",
                        fontWeight: salvacionCompetente ? 700 : 500,
                      }}
                    >
                      <span
                        className="shrink-0"
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: salvacionCompetente
                            ? "var(--primary)"
                            : "color-mix(in srgb, var(--primary) 15%, transparent)",
                        }}
                      />
                      Salvación
                    </span>
                    <span
                      className="text-micro font-black tabular-nums"
                      style={{
                        color: salvacionCompetente
                          ? "var(--primary)"
                          : "color-mix(in srgb, var(--primary) 45%, transparent)",
                      }}
                    >
                      {salvacionBonus >= 0 ? `+${salvacionBonus}` : salvacionBonus}
                    </span>
                  </button>
                </div>

                {/* Habilidades asociadas a esta stat, anidadas debajo. */}
                {skills.length > 0 && (
                  <div
                    className="flex flex-col"
                    style={{
                      borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                  >
                    {skills.map((skill) => {
                      const competente =
                        ficha.habilidades_competentes?.includes(skill.id) ?? false;
                      const bonus =
                        mod + (competente ? bonusCompetencia(ficha.nivel ?? 1) : 0);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          disabled={!editableStats}
                          onClick={() => {
                            if (!editableStats) return;
                            const actuales = ficha.habilidades_competentes ?? [];
                            const siguientes = competente
                              ? actuales.filter((s) => s !== skill.id)
                              : [...actuales, skill.id];
                            onEditarCampo?.("habilidades_competentes", siguientes);
                          }}
                          className="flex items-center justify-between pl-6 pr-2.5 py-1 transition-all disabled:cursor-default"
                          style={{
                            borderTop: "1px solid color-mix(in srgb, var(--primary) 5%, transparent)",
                          }}
                        >
                          <span
                            className="flex items-center gap-1.5 text-micro"
                            style={{
                              color: competente
                                ? "var(--primary)"
                                : "color-mix(in srgb, var(--primary) 45%, transparent)",
                              fontWeight: competente ? 700 : 500,
                            }}
                          >
                            <span
                              className="shrink-0"
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: competente
                                  ? "var(--primary)"
                                  : "color-mix(in srgb, var(--primary) 15%, transparent)",
                              }}
                            />
                            {skill.nombre}
                          </span>
                          <span
                            className="text-micro font-black tabular-nums"
                            style={{
                              color: competente
                                ? "var(--primary)"
                                : "color-mix(in srgb, var(--primary) 45%, transparent)",
                            }}
                          >
                            {bonus >= 0 ? `+${bonus}` : bonus}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
          title="10 + modificador de Sabiduría + competencia (si la tiene en Percepción)."
        >
          <span
            className="text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Percepción pasiva
          </span>
          <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
            {percepcion}
          </span>
        </div>
      </div>

      {/* ── Dados de golpe + Monedas. Los dados de golpe se gastan en
          descansos cortos: cada tap suma un "usado" (hasta el máximo del
          dado, ej. 3d8 → hasta 3), y un botón chico los resetea todos
          (descanso largo). Solo admin/DM los toca, como el resto de combate. ── */}
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
            className="flex items-center gap-1 text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            <Dice6 size={9} />
            Dados de golpe
          </span>
          <div className="flex items-center justify-between gap-1">
            <CampoEditable
              valor={ficha.dados_golpe ?? ""}
              editable={editableStats}
              onCommit={(v) => onEditarCampo?.("dados_golpe", v || null)}
              className="text-sm font-black"
              style={{ color: "var(--primary)" }}
              width={54}
            />
            {ficha.dados_golpe && (
              <span
                className="text-micro font-bold tabular-nums shrink-0"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
              >
                {ficha.dados_golpe_usados ?? 0} usados
              </span>
            )}
          </div>
          {editableStats && ficha.dados_golpe && (
            <div className="flex items-center gap-1 mt-0.5">
              <button
                type="button"
                onClick={() =>
                  onEditarCampo?.(
                    "dados_golpe_usados",
                    Math.max(0, (ficha.dados_golpe_usados ?? 0) - 1),
                  )
                }
                className="flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
                style={{ width: 18, height: 18 }}
              >
                <Minus size={10} className="text-primary/50" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onEditarCampo?.("dados_golpe_usados", (ficha.dados_golpe_usados ?? 0) + 1)
                }
                className="flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
                style={{ width: 18, height: 18 }}
              >
                <Plus size={10} className="text-primary/50" />
              </button>
              <button
                type="button"
                onClick={() => onEditarCampo?.("dados_golpe_usados", 0)}
                className="text-micro font-semibold text-primary/35 hover:text-primary/60 transition-colors ml-1"
                title="Descanso largo: restablece todos los dados de golpe"
              >
                Reset
              </button>
            </div>
          )}
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
            className="flex items-center gap-1 text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            <Coins size={9} />
            Monedas
          </span>
          {tiposMoneda.length === 0 ? (
            // Sin tipos definidos en el reino todavía (o ficha vieja migrada):
            // se muestra el total genérico bajo la clave "legado" para no
            // perder el dato, editable igual que antes.
            <CampoEditable
              valor={ficha.monedas?.legado ?? 0}
              editable={editableStats}
              tipo="number"
              onCommit={(v) =>
                onEditarCampo?.("monedas", { ...ficha.monedas, legado: Number(v) || 0 })
              }
              className="text-sm font-black tabular-nums"
              style={{ color: "var(--primary)" }}
            />
          ) : (
            <div className="flex flex-col gap-1 mt-0.5">
              {tiposMoneda.map((tipo) => (
                <div key={tipo.id} className="flex items-center justify-between gap-1">
                  <span
                    className="text-micro font-semibold truncate"
                    style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
                    title={tipo.nombre}
                  >
                    {tipo.simbolo || tipo.nombre}
                  </span>
                  <CampoEditable
                    valor={ficha.monedas?.[tipo.id] ?? 0}
                    editable={editableStats}
                    tipo="number"
                    align="right"
                    width={40}
                    onCommit={(v) =>
                      onEditarCampo?.("monedas", {
                        ...ficha.monedas,
                        [tipo.id]: Number(v) || 0,
                      })
                    }
                    className="text-sm font-black tabular-nums"
                    style={{ color: "var(--primary)" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rasgos y habilidades especiales (features de clase/raza) ──────────────
// Lista editable de {nombre, descripción}, sin ningún cálculo asociado —
// es texto de rol-play/mecánica narrativa, tipo "Visión en la oscuridad" o
// "Segundo aliento". Vive en su propio componente porque maneja su propio
// estado de "agregando nuevo rasgo".

function PanelRasgosEspeciales({
  rasgos,
  editable,
  onCambiar,
}: {
  rasgos: RasgoEspecial[];
  editable: boolean;
  onCambiar: (siguientes: RasgoEspecial[]) => void;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [descNueva, setDescNueva] = useState("");
  const [origenNuevo, setOrigenNuevo] = useState<RasgoEspecial["origen"]>("otro");

  const agregar = useCallback(() => {
    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setAgregando(false);
      return;
    }
    const rasgo: RasgoEspecial = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nombre,
      descripcion: descNueva.trim(),
      origen: origenNuevo,
    };
    onCambiar([...rasgos, rasgo]);
    setNombreNuevo("");
    setDescNueva("");
    setOrigenNuevo("otro");
    setAgregando(false);
  }, [nombreNuevo, descNueva, origenNuevo, rasgos, onCambiar]);

  const quitar = useCallback(
    (id: string) => {
      onCambiar(rasgos.filter((r) => r.id !== id));
    },
    [rasgos, onCambiar],
  );

  const dotes = rasgos.filter((r) => r.origen === "dote");
  const otrosRasgos = rasgos.filter((r) => r.origen !== "dote");

  if (!editable && rasgos.length === 0) return null;

  const listaRasgo = (r: RasgoEspecial) => (
    <div
      key={r.id}
      className="flex items-start gap-2 px-2.5 py-2"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        borderRadius: "2px",
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
    >
      {r.origen === "dote" ? (
        <Award
          size={13}
          className="shrink-0 mt-0.5"
          style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
        />
      ) : (
        <BookOpen
          size={13}
          className="shrink-0 mt-0.5"
          style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className="text-micro font-black uppercase tracking-wider"
          style={{ color: "var(--primary)" }}
        >
          {r.nombre}
        </p>
        {r.descripcion && (
          <p
            className="text-micro mt-0.5"
            style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
          >
            {r.descripcion}
          </p>
        )}
      </div>
      {editable && (
        <button
          type="button"
          onClick={() => quitar(r.id)}
          className="shrink-0 cursor-pointer hover:text-red-500 transition-colors"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );

  return (
    <div
      className="px-5 py-4 flex flex-col gap-2"
      style={{
        borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
      }}
    >
      <SeparadorLabel label="Rasgos y habilidades especiales" />

      {otrosRasgos.length === 0 && !agregando && (
        <p
          className="text-micro italic"
          style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
        >
          Sin rasgos de clase o raza registrados aún.
        </p>
      )}

      <div className="flex flex-col gap-2">{otrosRasgos.map(listaRasgo)}</div>

      {/* ── Dotes (feats): sección aparte, ej. la dote de origen del
          trasfondo o las que se ganan al subir de nivel. ── */}
      {(dotes.length > 0 || editable) && (
        <>
          <div className="mt-2">
            <SeparadorLabel label="Dotes" />
          </div>
          {dotes.length === 0 && !agregando && (
            <p
              className="text-micro italic"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
            >
              Sin dotes registradas aún.
            </p>
          )}
          <div className="flex flex-col gap-2">{dotes.map(listaRasgo)}</div>
        </>
      )}

      {editable && (
        <>
          {agregando ? (
            <div
              className="flex flex-col gap-1.5 px-2.5 py-2"
              style={{
                border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                borderRadius: "2px",
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="Nombre (ej. Visión en la oscuridad, Alerta…)"
                  className="flex-1 bg-transparent outline-none text-micro font-black uppercase tracking-wider placeholder:normal-case placeholder:font-normal"
                  style={{ color: "var(--primary)" }}
                />
                <select
                  value={origenNuevo}
                  onChange={(e) => setOrigenNuevo(e.target.value as RasgoEspecial["origen"])}
                  className="shrink-0 bg-transparent outline-none text-micro font-bold"
                  style={{
                    color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                    borderBottom: "1px dashed color-mix(in srgb, var(--primary) 25%, transparent)",
                  }}
                >
                  <option value="raza">Raza</option>
                  <option value="clase">Clase</option>
                  <option value="dote">Dote</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <textarea
                value={descNueva}
                onChange={(e) => setDescNueva(e.target.value)}
                placeholder="Descripción (opcional)"
                rows={2}
                className="bg-transparent outline-none resize-none text-micro"
                style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAgregando(false);
                    setNombreNuevo("");
                    setDescNueva("");
                    setOrigenNuevo("otro");
                  }}
                  className="text-micro font-black uppercase tracking-wider px-2 py-1"
                  style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={agregar}
                  className="text-micro font-black uppercase tracking-wider px-2 py-1"
                  style={{ color: "var(--primary)" }}
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="flex items-center gap-1.5 self-start text-micro font-black uppercase tracking-wider px-2.5 py-1.5"
              style={{
                color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
                borderRadius: "2px",
              }}
            >
              <Plus size={11} />
              Agregar rasgo o dote
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Lanzamiento de conjuros ────────────────────────────────────────────────
// Solo aparece si la ficha tiene lanzador_conjuros=true, o si es editable (el
// dueño puede activarlo). Muestra característica de conjuros, CD/bono de
// ataque derivados, espacios de conjuro por nivel y la lista de conjuros
// conocidos/preparados.

const NIVELES_CONJURO = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function PanelConjuros({
  ficha,
  editable,
  editableStats,
  onEditarCampo,
}: {
  ficha: FichaDnd;
  editable: boolean;
  editableStats: boolean;
  onEditarCampo?: (campo: keyof FichaDnd, valor: CampoFichaValor) => void;
}) {
  const [agregando, setAgregando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [nivelNuevo, setNivelNuevo] = useState(0);

  if (!ficha.lanzador_conjuros && !editable) return null;

  // ── Sin activar todavía: solo el dueño ve un botón chico para activarlo. ──
  if (!ficha.lanzador_conjuros) {
    return (
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <button
          type="button"
          onClick={() => onEditarCampo?.("lanzador_conjuros", true)}
          className="flex items-center gap-1.5 text-micro font-black uppercase tracking-wider px-2.5 py-1.5"
          style={{
            color: "color-mix(in srgb, var(--primary) 45%, transparent)",
            border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
            borderRadius: "2px",
          }}
        >
          <Wand2 size={11} />
          Es lanzador de conjuros
        </button>
      </div>
    );
  }

  const cd = cdSalvacionConjuros(ficha as unknown as Parameters<typeof cdSalvacionConjuros>[0]);
  const bonoAtaque = bonoAtaqueConjuros(ficha as unknown as Parameters<typeof bonoAtaqueConjuros>[0]);
  const espacios = ficha.espacios_conjuro ?? {};
  const conjuros = ficha.conjuros ?? [];
  const trucos = conjuros.filter((c) => c.nivel === 0);
  const conNivel = conjuros.filter((c) => c.nivel > 0).sort((a, b) => a.nivel - b.nivel);

  const actualizarEspacio = (nivel: number, cambios: Partial<{ max: number; usados: number }>) => {
    const key = String(nivel);
    const actual = espacios[key] ?? { max: 0, usados: 0 };
    onEditarCampo?.("espacios_conjuro", { ...espacios, [key]: { ...actual, ...cambios } });
  };

  const agregarConjuro = () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) {
      setAgregando(false);
      return;
    }
    const nuevo: ConjuroFicha = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nombre,
      nivel: nivelNuevo,
      preparado: true,
    };
    onEditarCampo?.("conjuros", [...conjuros, nuevo]);
    setNombreNuevo("");
    setNivelNuevo(0);
    setAgregando(false);
  };

  const quitarConjuro = (id: string) => {
    onEditarCampo?.("conjuros", conjuros.filter((c) => c.id !== id));
  };

  const togglePreparado = (id: string) => {
    onEditarCampo?.(
      "conjuros",
      conjuros.map((c) => (c.id === id ? { ...c, preparado: !c.preparado } : c)),
    );
  };

  const filaConjuro = (c: ConjuroFicha) => (
    <div
      key={c.id}
      className="flex items-center gap-2 px-2.5 py-1.5"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        borderRadius: "2px",
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
    >
      <button
        type="button"
        disabled={!editable}
        onClick={() => togglePreparado(c.id)}
        title={c.preparado ? "Preparado" : "No preparado"}
        className="shrink-0 rounded-full transition-colors disabled:cursor-default"
        style={{
          width: 10,
          height: 10,
          border: "1.5px solid var(--primary)",
          background: c.preparado ? "var(--primary)" : "transparent",
        }}
      />
      <span className="flex-1 min-w-0 text-xs font-semibold text-primary/75 truncate">
        {c.nombre}
      </span>
      <span className="shrink-0 text-micro font-bold tabular-nums text-primary/40">
        {c.nivel === 0 ? "Truco" : `Nv. ${c.nivel}`}
      </span>
      {editable && (
        <button
          type="button"
          onClick={() => quitarConjuro(c.id)}
          className="shrink-0 cursor-pointer hover:text-red-500 transition-colors"
          style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );

  return (
    <div
      className="px-5 py-4 flex flex-col gap-3"
      style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
    >
      <SeparadorLabel label="Conjuros" />

      {/* ── Característica + CD + bono de ataque ── */}
      <div className="grid grid-cols-3 gap-2">
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
            Característica
          </span>
          {editable ? (
            <select
              value={ficha.caracteristica_conjuros ?? ""}
              onChange={(e) => onEditarCampo?.("caracteristica_conjuros", e.target.value || null)}
              className="bg-transparent outline-none text-xs font-black"
              style={{
                color: "var(--primary)",
                borderBottom: "1px dashed color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            >
              <option value="">Elegir…</option>
              <option value="inteligencia">Inteligencia</option>
              <option value="sabiduria">Sabiduría</option>
              <option value="carisma">Carisma</option>
            </select>
          ) : (
            <span className="text-xs font-black capitalize" style={{ color: "var(--primary)" }}>
              {ficha.caracteristica_conjuros ?? "—"}
            </span>
          )}
        </div>
        <div
          className="flex flex-col gap-0.5 px-2.5 py-1.5"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "2px",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
          title="CD = 8 + bono de competencia + mod. de la característica de conjuros"
        >
          <span
            className="text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            CD salvación
          </span>
          <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
            {cd ?? "—"}
          </span>
        </div>
        <div
          className="flex flex-col gap-0.5 px-2.5 py-1.5"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            borderRadius: "2px",
            background: "color-mix(in srgb, var(--primary) 3%, transparent)",
          }}
          title="Bono de ataque con conjuros = bono de competencia + mod. de la característica de conjuros"
        >
          <span
            className="text-micro font-black uppercase tracking-wider"
            style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
          >
            Ataque
          </span>
          <span className="text-sm font-black tabular-nums" style={{ color: "var(--primary)" }}>
            {bonoAtaque === null ? "—" : bonoAtaque >= 0 ? `+${bonoAtaque}` : bonoAtaque}
          </span>
        </div>
      </div>

      {/* ── Espacios de conjuro por nivel: solo se muestran los niveles con
          max > 0 (o todos si editableStats, para poder configurarlos). ── */}
      <div className="flex flex-col gap-1">
        <span
          className="text-micro font-black uppercase tracking-wider"
          style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
        >
          Espacios de conjuro
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {NIVELES_CONJURO.filter((n) => editableStats || (espacios[String(n)]?.max ?? 0) > 0).map(
            (nivel) => {
              const datos = espacios[String(nivel)] ?? { max: 0, usados: 0 };
              return (
                <div
                  key={nivel}
                  className="flex flex-col items-center gap-0.5 px-1.5 py-1.5"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    borderRadius: "2px",
                    background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                  }}
                >
                  <span
                    className="text-micro font-black"
                    style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}
                  >
                    Nv. {nivel}
                  </span>
                  <span className="flex items-center gap-0.5 text-xs font-black tabular-nums" style={{ color: "var(--primary)" }}>
                    <CampoEditable
                      valor={datos.usados}
                      editable={editableStats}
                      tipo="number"
                      align="center"
                      width={16}
                      onCommit={(v) => actualizarEspacio(nivel, { usados: Number(v) || 0 })}
                      className="text-xs font-black tabular-nums"
                      style={{ color: "var(--primary)" }}
                    />
                    /
                    <CampoEditable
                      valor={datos.max}
                      editable={editableStats}
                      tipo="number"
                      align="center"
                      width={16}
                      onCommit={(v) => actualizarEspacio(nivel, { max: Number(v) || 0 })}
                      className="text-xs font-black tabular-nums"
                      style={{ color: "var(--primary)" }}
                    />
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* ── Trucos + conjuros conocidos/preparados ── */}
      <div className="flex flex-col gap-1.5">
        {trucos.length > 0 && (
          <div className="flex flex-col gap-1.5">{trucos.map(filaConjuro)}</div>
        )}
        {conNivel.length > 0 && (
          <div className="flex flex-col gap-1.5">{conNivel.map(filaConjuro)}</div>
        )}
        {conjuros.length === 0 && !agregando && (
          <p
            className="text-micro italic"
            style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
          >
            Sin conjuros anotados aún.
          </p>
        )}

        {editable && (
          <>
            {agregando ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                  borderRadius: "2px",
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarConjuro()}
                  placeholder="Nombre del conjuro"
                  className="flex-1 min-w-0 bg-transparent outline-none text-xs"
                  style={{ color: "var(--primary)" }}
                />
                <select
                  value={nivelNuevo}
                  onChange={(e) => setNivelNuevo(Number(e.target.value))}
                  className="shrink-0 bg-transparent outline-none text-micro font-bold"
                  style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
                >
                  <option value={0}>Truco</option>
                  {NIVELES_CONJURO.map((n) => (
                    <option key={n} value={n}>
                      Nv. {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={agregarConjuro}
                  className="shrink-0 text-micro font-black uppercase tracking-wider px-1.5"
                  style={{ color: "var(--primary)" }}
                >
                  Ok
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAgregando(true)}
                className="flex items-center gap-1.5 self-start text-micro font-black uppercase tracking-wider px-2.5 py-1.5"
                style={{
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                  border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
                  borderRadius: "2px",
                }}
              >
                <Plus size={11} />
                Agregar conjuro
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Inventario + ataques derivados ────────────────────────────────────────
// Vive como componente aparte porque usa su propio hook de datos
// (useInventarioFicha cargando por fichaId) — separarlo evita que
// FichaStatsPanel dispare esa consulta cuando no hace falta mostrarla.

function PanelInventarioFicha({
  fichaId,
  editable,
  bonoCompetencia,
  fuerza,
  destreza,
}: {
  fichaId: string;
  editable: boolean;
  bonoCompetencia: number;
  fuerza: number;
  destreza: number;
}) {
  const { items, loading, agregar, quitar, toggleEquipado, editarCantidad } =
    useInventarioFicha(fichaId);
  const [buscando, setBuscando] = useState(false);

  const armasEquipadas = items.filter((i) => i.equipado && i.item?.es_arma);

  return (
    <>
      {/* ── Ataques: solo aparece si hay al menos un arma equipada. ── */}
      {armasEquipadas.length > 0 && (
        <div
          className="px-5 py-4"
          style={{
            borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <SeparadorLabel label="Ataques" />
          <div className="flex flex-col gap-1.5">
            {armasEquipadas.map((fila) => {
              // Distancia (arco, ballesta…) y sutileza (arma liviana cuerpo
              // a cuerpo) usan Destreza; el resto de armas cuerpo a cuerpo
              // usan Fuerza. La sutileza además toma el mayor de los dos.
              const modStat = fila.item?.distancia
                ? statMod(destreza)
                : fila.item?.sutileza
                  ? Math.max(statMod(fuerza), statMod(destreza))
                  : statMod(fuerza);
              const bonoAtaque = modStat + bonoCompetencia;
              return (
                <div
                  key={fila.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                    borderRadius: "2px",
                    background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                  }}
                >
                  <span className="flex items-center gap-1.5 min-w-0 text-xs font-semibold text-primary/75 truncate">
                    {fila.item?.distancia ? (
                      <Target size={10} className="shrink-0 text-primary/35" />
                    ) : (
                      <Sword size={10} className="shrink-0 text-primary/35" />
                    )}
                    {fila.item?.nombre ?? "Arma"}
                  </span>
                  <span
                    className="shrink-0 text-micro font-bold tabular-nums"
                    style={{ color: "var(--primary)" }}
                  >
                    {bonoAtaque >= 0 ? `+${bonoAtaque}` : bonoAtaque}
                    {fila.item?.dado_dano
                      ? ` · ${fila.item.dado_dano}${modStat >= 0 ? `+${modStat}` : modStat}`
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Inventario completo. Cualquiera con `editable` puede agregar
          ítems del catálogo del mundo, ajustar cantidad, marcar equipado
          o quitarlos — mismo criterio que el resto de datos de rol-play. ── */}
      <div
        className="px-5 py-4"
        style={{
          borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <SeparadorLabel label="Inventario" />

        {editable && (
          <div className="mb-2">
            {buscando ? (
              <SelectorEntidad
                placeholder="Buscar ítem del mundo…"
                buscar={buscarItems}
                onSeleccionar={async (item) => {
                  await agregar(item.id);
                  setBuscando(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setBuscando(true)}
                className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider transition-colors"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
              >
                <Plus size={11} />
                Agregar ítem
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-4 flex items-center justify-center">
            <Loader2 size={14} className="animate-spin text-primary/30" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-primary/30 flex items-center gap-1.5">
            <Backpack size={12} />
            Sin ítems todavía.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((fila) => (
              <div
                key={fila.id}
                className="flex items-center gap-2 px-2.5 py-1.5"
                style={{
                  border: fila.equipado
                    ? "1px solid color-mix(in srgb, var(--primary) 30%, transparent)"
                    : "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "2px",
                  background: fila.equipado
                    ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                    : "color-mix(in srgb, var(--primary) 3%, transparent)",
                }}
              >
                <div className="w-6 h-6 shrink-0 rounded overflow-hidden bg-primary/5">
                  {fila.item?.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fila.item.imagen_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="flex-1 min-w-0 text-xs font-semibold text-primary/75 truncate">
                  {fila.item?.nombre ?? "Ítem"}
                </span>

                {editable ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => editarCantidad(fila.id, fila.cantidad - 1)}
                      disabled={fila.cantidad <= 1}
                      className="flex items-center justify-center rounded hover:bg-primary/10 transition-colors disabled:opacity-30"
                      style={{ width: 16, height: 16 }}
                    >
                      <Minus size={9} className="text-primary/50" />
                    </button>
                    <span className="text-micro font-bold tabular-nums w-4 text-center text-primary/60">
                      {fila.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => editarCantidad(fila.id, fila.cantidad + 1)}
                      className="flex items-center justify-center rounded hover:bg-primary/10 transition-colors"
                      style={{ width: 16, height: 16 }}
                    >
                      <Plus size={9} className="text-primary/50" />
                    </button>
                  </div>
                ) : (
                  <span className="shrink-0 text-micro font-bold tabular-nums text-primary/40">
                    ×{fila.cantidad}
                  </span>
                )}

                {editable && (
                  <button
                    type="button"
                    onClick={() => toggleEquipado(fila)}
                    title={fila.equipado ? "Quitar equipamiento" : "Equipar"}
                    className="shrink-0 flex items-center justify-center rounded-full transition-colors"
                    style={{
                      width: 22,
                      height: 22,
                      color: fila.equipado
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 30%, transparent)",
                    }}
                  >
                    <Shield size={12} fill={fila.equipado ? "var(--primary)" : "none"} />
                  </button>
                )}

                {editable && (
                  <button
                    type="button"
                    onClick={() => quitar(fila.id)}
                    className="shrink-0 flex items-center justify-center rounded-full hover:bg-red-500/10 hover:text-red-500 text-primary/25 transition-colors"
                    style={{ width: 22, height: 22 }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
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
