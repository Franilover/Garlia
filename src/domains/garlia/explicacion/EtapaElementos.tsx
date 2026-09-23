"use client";

/**
 * EtapaElementos.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Segundo tramo: Partículas → Elemento. Mismo criterio que EtapaPolaridades:
 * un diagrama animado que explica la lógica + una galería con datos reales.
 *
 *   1. DiagramaCapas: las 27 Partículas no se mezclan al azar — se reparten
 *      en 3 capas (núcleo/media/externa) que giran a velocidades distintas:
 *      el núcleo gira lento (es la base estable), la capa externa gira
 *      rápido (es la más reactiva/expuesta) — otra vez la animación ES la
 *      explicación, no decoración. Se arma en vivo, capa por capa.
 *
 *   2. GaleriaElementosReales: usa AtomoVisual (el mismo componente que ya
 *      dibuja el átomo en el editor de Elementos) sobre useElementos() real
 *      — así la explicación queda pegada 1:1 al dato real, sin duplicar el
 *      dibujo del átomo en un componente aparte.
 */

import React, { useEffect, useState } from "react";
import { Gem, Link2, Scale, Wind, CircleOff, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { useElementos } from "@/domains/garlia/elementos/useElementos";
import { AtomoVisual } from "@/domains/garlia/elementos/ElementoEditor";
import { FAMILY_COLOR, type ElementFamily } from "@/domains/garlia/elementos/types";
import { useVisibilidadExplicacion } from "./useVisibilidadExplicacion";
import { ToggleMaestroAdmin } from "./ToggleMaestroAdmin";
import { BloqueColapsableAdmin } from "./BloqueColapsableAdmin";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

const CAPAS = [
  { id: "nucleo" as const, titulo: "Núcleo", detalle: "9 Partículas ancla — la base estable.", velocidad: "28s" },
  { id: "media" as const, titulo: "Media", detalle: "9 Partículas motor — la energía interna.", velocidad: "16s" },
  { id: "externa" as const, titulo: "Externa", detalle: "9 Partículas de contacto — lo más reactivo.", velocidad: "8s" },
];

/** Anillo simple animado con puntos girando — representa una capa
 *  llenándose de Partículas sin necesitar datos reales todavía (eso vive
 *  en el bloque 2, con AtomoVisual). La velocidad de giro es distinta por
 *  capa y coincide con `CAPAS`: núcleo lento, externa rápido. */
function AnilloCapa({
  radio,
  puntos,
  duracion,
  colorSeed,
  activa,
}: {
  radio: number;
  puntos: number;
  duracion: string;
  colorSeed: number;
  activa: boolean;
}) {
  const tonos = ["#c9a06a", "#8a5a34", "#4e3320"];
  return (
    <g
      style={{
        transformOrigin: "100px 100px",
        animation: activa ? `explicacion-girar ${duracion} linear infinite` : undefined,
        opacity: activa ? 1 : 0.15,
        transition: "opacity 0.4s ease-out",
      }}
    >
      <circle cx={100} cy={100} r={radio} fill="none" strokeDasharray="2 4" strokeWidth={1} style={{ stroke: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
      {activa &&
        Array.from({ length: puntos }).map((_, i) => {
          const angulo = (i / puntos) * Math.PI * 2;
          const x = 100 + Math.cos(angulo) * radio;
          const y = 100 + Math.sin(angulo) * radio;
          const tono = tonos[(i + colorSeed) % tonos.length];
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={5}
              style={{ fill: `color-mix(in srgb, ${tono} 65%, var(--bg-main))`, stroke: `color-mix(in srgb, ${tono} 90%, black)` }}
              strokeWidth={0.8}
            />
          );
        })}
    </g>
  );
}

function DiagramaCapas() {
  // Ciclo automático: se arma capa por capa (núcleo, luego media, luego
  // externa), se queda un momento completo (más tiempo que los pasos
  // anteriores, para que se alcance a leer el resumen final), y reinicia.
  const DURACIONES = [1600, 1600, 1600, 3200]; // ms por paso; el último (completo) dura más
  const [paso, setPaso] = useState(0); // 0=solo núcleo, 1=+media, 2=+externa, 3=completo (pausa larga)

  useEffect(() => {
    const t = setTimeout(() => setPaso((p) => (p + 1) % DURACIONES.length), DURACIONES[paso]);
    return () => clearTimeout(t);
  }, [paso]);

  const capaActiva = { nucleo: paso >= 0, media: paso >= 1, externa: paso >= 2 };

  const grafico = (
    <svg viewBox="0 0 200 200" width={240} height={240} className="shrink-0">
      <AnilloCapa radio={82} puntos={9} duracion={CAPAS[2].velocidad} colorSeed={0} activa={capaActiva.externa} />
      <AnilloCapa radio={48} puntos={9} duracion={CAPAS[1].velocidad} colorSeed={1} activa={capaActiva.media} />
      <circle cx={100} cy={100} r={12} style={{ fill: "color-mix(in srgb, var(--primary) 18%, transparent)", stroke: "var(--primary)" }} strokeWidth={1.5} opacity={capaActiva.nucleo ? 1 : 0.15} />
    </svg>
  );

  // Texto de cada capa ya alcanzada, en escalera: se van apilando hacia
  // abajo a medida que pasan los pasos (núcleo, luego +media, luego
  // +externa), sin borrar los anteriores.
  const filasCapas = CAPAS.filter((_, i) => paso >= i);

  return (
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-8">
      {grafico}

      <div className="flex w-full max-w-sm flex-col gap-3 md:w-auto md:min-w-[260px]">
        {filasCapas.map((c, i) => (
          <div
            key={c.id}
            className="text-center md:text-left"
            style={{ animation: "explicacion-fade-in 0.4s ease-out both", paddingLeft: `${i * 14}px` }}
          >
            <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
              Capa {c.titulo}
            </p>
            <p className="mx-auto mt-0.5 max-w-xs text-[11px] leading-relaxed md:mx-0" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
              {c.detalle}
            </p>
          </div>
        ))}

        {paso >= 3 && (
          <div
            className="text-center md:text-left"
            style={{ animation: "explicacion-fade-in 0.4s ease-out both", paddingLeft: `${CAPAS.length * 14}px` }}
          >
            <p className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "var(--primary)" }}>
              Un Elemento completo
            </p>
            <p className="mx-auto mt-0.5 max-w-xs text-[11px] leading-relaxed md:mx-0" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
              Las 3 capas juntas, cada una con sus 9 Partículas propias, forman un Elemento — igual que un átomo real con núcleo y electrones.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 md:hidden">
        {CAPAS.map((c, i) => (
          <div
            key={c.id}
            className="h-1 w-8 rounded-full transition-colors"
            style={{ background: paso >= i ? "var(--primary)" : "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Bloque 2: familias (clasificación derivada) ───────────────────────────

const FAMILIA_ICON: Record<ElementFamily, React.ElementType> = {
  Noble: Gem,
  Rígido: Link2,
  Intermedio: Scale,
  Reactivo: Wind,
  Inerte: CircleOff,
};

// ─── Bloque 3: resultado real desde Supabase ───────────────────────────────

function GaleriaElementosReales() {
  const { items: elementos, loading } = useElementos();
  const { perfil } = useAuth() as any;
  const isAdmin = perfil?.rol === "admin";

  const vis = useVisibilidadExplicacion("elemento");
  const elementosVisibles = isAdmin ? elementos : vis.filtrarVisibles(elementos);

  // Mismo criterio que GaleriaResultadoReal (Partículas): al público, si
  // la sección queda sin nada visible, el bloque entero desaparece en vez
  // de mostrar el título con "· 0".
  const ocultarBloquePublico = !isAdmin && !loading && elementosVisibles.length === 0;
  if (ocultarBloquePublico) return null;

  const header = (
    <p className="text-micro font-bold uppercase tracking-[0.2em] opacity-50">
      Los Elementos reales · {loading ? "…" : elementosVisibles.length}
    </p>
  );

  const grid = loading ? (
    <PlaceholderCargando />
  ) : elementosVisibles.length === 0 ? (
    <PlaceholderVacio texto="Sin Elementos cargados todavía." />
  ) : (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {elementosVisibles.map((el) => {
        const color = FAMILY_COLOR[el.familia];
        const Icon = FAMILIA_ICON[el.familia];
        const visibleItem = vis.esVisible(el.id);
        return (
          <div
            key={el.id}
            className="group relative flex flex-col items-center gap-1.5 rounded-lg p-3 text-center"
            style={{
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
              border: `1px solid ${color.border}`,
              opacity: isAdmin && !visibleItem ? 0.4 : 1,
            }}
            title={`${el.nombre} (${el.simbolo}) · ${el.familia}`}
          >
            {isAdmin && (
              <button
                type="button"
                onClick={() => vis.toggleIndividual(el.id)}
                title={visibleItem ? "Ocultar este Elemento al público" : "Mostrar este Elemento al público"}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full cursor-pointer"
                style={{
                  background: "color-mix(in srgb, var(--bg-main) 85%, transparent)",
                  color: visibleItem ? "color-mix(in srgb, var(--primary) 55%, transparent)" : "#b45309",
                }}
              >
                {visibleItem ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
            )}
                <AtomoVisual elemento={el} className="h-20 w-20 shrink-0" />
            <p className="w-full truncate text-[11px] font-black">{el.nombre}</p>
            <div className="flex items-center gap-1" style={{ color: color.text }}>
              <Icon size={10} />
              <span className="text-[9px] font-bold uppercase tracking-wide">{el.familia}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (isAdmin) {
    return (
      <BloqueColapsableAdmin
        maestroVisible={vis.maestroVisible}
        header={
          <div className="flex w-full items-center justify-between gap-2">
            {header}
            <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <ToggleMaestroAdmin visible={vis.maestroVisible} onToggle={vis.toggleMaestro} etiqueta="Elementos" />
            </span>
          </div>
        }
      >
        {grid}
      </BloqueColapsableAdmin>
    );
  }

  return (
    <div>
      <div className="mb-2">{header}</div>
      {grid}
    </div>
  );
}

function PlaceholderCargando() {
  return (
    <div className="flex h-16 items-center justify-center rounded-lg text-micro" style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)", color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
      Cargando…
    </div>
  );
}

function PlaceholderVacio({ texto }: { texto: string }) {
  return (
    <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-micro" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
      {texto}
    </div>
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaElementos() {
  return (
    <section id="elementos" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-girar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="mb-5">
        <h2 className="text-base font-black uppercase tracking-wide">Elementos</h2>
        <p className="text-micro" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
          27 Partículas no forman un caos: se reparten en 3 capas y nace un Elemento, como un átomo con núcleo y electrones.
        </p>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaCapas />
      </div>

      {/* Galería "Los Elementos reales" oculta temporalmente a pedido —
          GaleriaElementosReales queda definida más arriba, sin invocar, para
          reactivarla después sin reescribirla. */}
      {/* <div className="mt-6">
        <GaleriaElementosReales />
      </div> */}
    </section>
  );
}
