"use client";

/**
 * EtapaPolaridades.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Primer tramo del recorrido "Cómo surge cada cosa": Polaridades → TASI →
 * Partículas. Dos bloques:
 *
 *   1. DiagramaPolaridadesTASI: la lógica del "cómo surge", animada. Los +
 *      orbitan (activos, se mueven), los − están quietos (receptivos, fijos)
 *      — la animación en sí misma es la explicación, no solo decoración.
 *      Se combinan en las 4 relaciones polares, que colapsan en las 4
 *      letras T/A/S/I, que a su vez arman las 27 Partículas reales.
 *
 *   2. GaleriaResultadoReal: el resultado tal cual vive en Supabase — las
 *      27 Partículas reales (useParticulas), dibujadas con los mismos componentes visuales que
 *      ya usa el panel de Física (ParticulaVisual) para que se sientan
 *      "la misma cosa", no una reconstrucción aparte.
 *
 * No usa nada de domains/garlia/visualizador — es un componente nuevo,
 * pensado para enseñar el concepto, no para explorarlo como dato crudo.
 */

import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/providers/AuthProvider";
import { useParticulas } from "@/domains/garlia/fisica/useFisica";
import { ParticulaVisual, LETRA_COLOR, type LetraATS } from "@/domains/garlia/fisica/ParticulaVisual";
import { useVisibilidadExplicacion } from "./useVisibilidadExplicacion";
import { ToggleMaestroAdmin } from "./ToggleMaestroAdmin";
import { BloqueColapsableAdmin } from "./BloqueColapsableAdmin";

// ─── Bloque 1: diagrama animado de la lógica ───────────────────────────────

const RELACIONES: { par: string; resultado: LetraATS; nombre: string }[] = [
  { par: "+ +", resultado: "T", nombre: "Tesis" },
  { par: "− −", resultado: "A", nombre: "Antítesis" },
  { par: "+ → −", resultado: "S", nombre: "Síntesis" },
  { par: "− → +", resultado: "I", nombre: "Invertisis" },
];

/** Un polo (+ o −) dibujado como círculo simple, mismo criterio que
 *  PoloVisual en FisicaPage.tsx. El + tiene una animación de órbita sutil
 *  (representa que es el polo activo/emisor); el − queda fijo (representa
 *  que es el polo receptivo/estable) — la diferencia de movimiento ES la
 *  explicación visual de la polaridad, no un adorno. */
function Polo({ signo, size = 40, orbitando = false }: { signo: "+" | "-"; size?: number; orbitando?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background:
          signo === "+"
            ? "color-mix(in srgb, var(--primary) 16%, transparent)"
            : "color-mix(in srgb, var(--primary) 6%, transparent)",
        borderColor:
          signo === "+"
            ? "var(--primary)"
            : "color-mix(in srgb, var(--primary) 30%, transparent)",
        color: signo === "+" ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
        animation: orbitando ? "explicacion-polo-pulso 1.8s ease-in-out infinite" : undefined,
      }}
    >
      {signo}
    </div>
  );
}

/** Fila representando una Relación Polar: dos Polos combinados (par
 *  estático "+ +" / "− −" para T/A, o transición "+ → −" / "− → +" para
 *  S/I), con una flecha hacia la letra TASI resultante. Son solo 2 Polos
 *  (+/−) combinados en pares ordenados — de ahí las 4 combinaciones
 *  posibles, no 3 polos por fila. El polo activo (+) siempre orbita; el −
 *  queda quieto. */
function FilaRelacion({ rel, index }: { rel: (typeof RELACIONES)[number]; index: number }) {
  const signos = rel.par.replace("→", "").trim().split(/\s+/) as ("+" | "-")[];
  const color = LETRA_COLOR[rel.resultado];

  return (
    <div
      className="flex w-32 flex-col items-center gap-2 rounded-lg px-3 py-2.5 text-center"
      style={{
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        // Aparece escalonado — refuerza que es una secuencia, no una tabla estática.
        animation: `explicacion-fade-in 0.5s ease-out ${index * 0.12}s both`,
      }}
    >
      <div className="flex items-center gap-1">
        <Polo signo={signos[0]} size={28} orbitando={signos[0] === "+"} />
        <Polo signo={signos[1]} size={28} orbitando={signos[1] === "+"} />
      </div>
      <svg width="12" height="20" viewBox="0 0 12 20" className="shrink-0 opacity-40">
        <path d="M6 0 V16 M1 11 L6 17 L11 11" stroke="var(--primary)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-black"
        style={{ background: color.bg, borderColor: color.border, color: color.fg, fontSize: 15 }}
      >
        {rel.resultado}
      </div>
      <div className="min-w-0">
        <p className="text-micro font-black uppercase tracking-wide">{rel.nombre}</p>
        <p className="truncate text-[10px]" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
          {rel.par}
        </p>
      </div>
    </div>
  );
}

/** Diagrama completo: Polos → 4 Relaciones → TASI → una Partícula de
 *  muestra armándose en vivo (ciclo automático mostrando distintas
 *  combinaciones de 3 letras), para que se entienda que una Partícula real
 *  es "3 letras TASI juntas", no una idea abstracta. */
function DiagramaPolaridadesTASI() {
  const EJEMPLOS = ["TAS", "AAA", "SSI", "ITA", "TTT", "ASI"];
  const [ejemploIdx, setEjemploIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setEjemploIdx((i) => (i + 1) % EJEMPLOS.length), 2200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5">
      {/* Paso A: los dos polos base */}
      <div className="flex w-full flex-col items-center gap-2">
        <p className="text-micro font-bold uppercase tracking-[0.2em] opacity-50">Paso 1 · Dos polos</p>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <Polo signo="+" size={56} orbitando />
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">Activo</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Polo signo="-" size={56} />
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">Receptivo</span>
          </div>
        </div>
        <p className="max-w-xs text-center text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
          El + se mueve porque emite. El − se queda quieto porque recibe. Todo lo demás nace de cómo se combinan.
        </p>
      </div>

      <FlechaAbajo />

      {/* Paso B: las 4 relaciones polares → TASI */}
      <div className="flex w-full flex-col items-center gap-2">
        <p className="text-micro font-bold uppercase tracking-[0.2em] opacity-50">Paso 2 · Se combinan</p>
        <div className="flex w-full flex-row flex-wrap justify-center gap-2">
          {RELACIONES.map((rel, i) => (
            <FilaRelacion key={rel.resultado} rel={rel} index={i} />
          ))}
        </div>
      </div>

      <FlechaAbajo />

      {/* Paso C: una Partícula = 3 letras TASI juntas, ciclando ejemplos */}
      <div className="flex w-full flex-col items-center gap-2">
        <p className="text-micro font-bold uppercase tracking-[0.2em] opacity-50">Paso 3 · 3 letras = 1 Partícula</p>
        <div className="flex items-center gap-4">
          <div key={ejemploIdx} style={{ animation: "explicacion-pop-in 0.4s ease-out both" }}>
            <ParticulaVisual formula={EJEMPLOS[ejemploIdx]} size={96} />
          </div>
          <div>
            <p className="font-mono text-lg font-black tracking-widest">{EJEMPLOS[ejemploIdx]}</p>
            <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
              Cada letra ocupa un tercio del círculo. Cambiar el orden o las letras da una Partícula distinta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlechaAbajo() {
  return (
    <svg width="16" height="24" viewBox="0 0 16 24" className="opacity-30">
      <path d="M8 0 V18 M2 13 L8 19 L14 13" stroke="var(--primary)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Bloque 2: resultado real desde Supabase ───────────────────────────────

function GaleriaResultadoReal() {
  const { items: particulas, loading: loadingParticulas } = useParticulas();
  const { perfil } = useAuth() as any;
  const isAdmin = perfil?.rol === "admin";

  const vis = useVisibilidadExplicacion("particula");
  const particulasVisibles = isAdmin ? particulas : vis.filtrarVisibles(particulas);

  // Para el público: si la sección quedó sin nada que mostrar (maestro
  // apagado y sin excepciones visibles), el bloque completo desaparece
  // en vez de quedar con el título vacío ("· 0"). El admin sigue viendo
  // el bloque siempre — si no, no tendría desde dónde reactivarlo.
  const ocultarBloquePublico = !isAdmin && !loadingParticulas && particulasVisibles.length === 0;
  if (ocultarBloquePublico) return null;

  const header = (
    <p className="text-micro font-bold uppercase tracking-[0.2em] opacity-50">
      Las Partículas reales · {loadingParticulas ? "…" : particulasVisibles.length}
    </p>
  );

  const grid = loadingParticulas ? (
    <PlaceholderCargando />
  ) : particulasVisibles.length === 0 ? (
    <PlaceholderVacio texto="Sin Partículas cargadas todavía." />
  ) : (
    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
      {particulasVisibles.map((p) => {
        const visibleItem = vis.esVisible(p.id);
        return (
          <div
            key={p.id}
            className="group relative flex flex-col items-center gap-1.5 rounded-lg p-3 text-center"
            style={{
              background: "color-mix(in srgb, var(--primary) 3%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
              opacity: isAdmin && !visibleItem ? 0.4 : 1,
            }}
            title={`${p.nombre} (${p.formula})`}
          >
            {isAdmin && (
              <button
                type="button"
                onClick={() => vis.toggleIndividual(p.id)}
                title={visibleItem ? "Ocultar esta Partícula al público" : "Mostrar esta Partícula al público"}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full cursor-pointer"
                style={{
                  background: "color-mix(in srgb, var(--bg-main) 85%, transparent)",
                  color: visibleItem ? "color-mix(in srgb, var(--primary) 55%, transparent)" : "#b45309",
                }}
              >
                {visibleItem ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
            )}
            <ParticulaVisual formula={p.formula} size={60} />
            <p className="w-full truncate text-[10px] font-bold">{p.nombre}</p>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Las 27 Partículas reales */}
      {isAdmin ? (
        <BloqueColapsableAdmin
          maestroVisible={vis.maestroVisible}
          header={
            <div className="flex w-full items-center justify-between gap-2">
              {header}
              <span
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ToggleMaestroAdmin visible={vis.maestroVisible} onToggle={vis.toggleMaestro} etiqueta="Partículas" />
              </span>
            </div>
          }
        >
          {grid}
        </BloqueColapsableAdmin>
      ) : (
        <div>
          <div className="mb-2">{header}</div>
          {grid}
        </div>
      )}
    </div>
  );
}

function PlaceholderCargando() {
  return (
    <div
      className="flex h-16 items-center justify-center rounded-lg text-micro"
      style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)", color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
    >
      Cargando…
    </div>
  );
}

function PlaceholderVacio({ texto }: { texto: string }) {
  return (
    <div
      className="flex h-16 items-center justify-center rounded-lg border border-dashed text-micro"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
    >
      {texto}
    </div>
  );
}

// ─── Export principal de la etapa ──────────────────────────────────────────

export default function EtapaPolaridades() {
  return (
    <section id="polaridades" className="scroll-mt-20 px-1">
      <style>{`
        @keyframes explicacion-polo-pulso {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 25%, transparent); }
          50% { transform: translateY(-3px) scale(1.05); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 0%, transparent); }
        }
        @keyframes explicacion-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes explicacion-pop-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="mb-5">
        <h2 className="text-base font-black uppercase tracking-wide">Polaridades → TASI → Partículas</h2>
      </div>

      <div className="py-2 md:py-4">
        <DiagramaPolaridadesTASI />
      </div>

      <div className="mt-6">
        <GaleriaResultadoReal />
      </div>
    </section>
  );
}
