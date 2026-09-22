"use client";

/**
 * ExplicacionPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza a "Teorías" en /garlia/universo. Página única en scroll largo
 * que explica CÓMO SURGE cada cosa en Garlia, tramo por tramo, con gráficos
 * animados reales (no el flujo del Visualizador — este es un componente
 * nuevo e independiente, pensado para enseñar, no para explorar datos).
 *
 * Ruta completa (documentada, construida en etapas):
 *   Polaridades → TASI → Partículas
 *   → Elementos → Compuestos → Estructuras
 *   → Materiales → Objetos
 *   → Células → Tejidos → Órganos → Sistemas → Organismos → Criaturas
 *   → Iums → Oris
 *
 * Por ahora solo está construido el primer tramo (Polaridades → Objetos es
 * el pedido explícito del usuario para la primera pasada, empezando por
 * Polaridades → TASI → Partículas), que es el que tiene datos reales
 * completos en Supabase y frontend. El resto queda como placeholder "Próximamente"
 * para no prometer contenido que aún no existe.
 */

import React from "react";
import { Sparkles } from "lucide-react";

import EtapaPolaridades from "./EtapaPolaridades";
import EtapaProximamente from "./EtapaProximamente";
import { ETAPAS } from "./etapas";

export default function ExplicacionPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="px-1 pt-2 pb-6 text-center">
        <div
          className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "var(--primary)",
          }}
        >
          <Sparkles size={18} strokeWidth={2} />
        </div>
        <h1 className="text-lg font-black uppercase tracking-wide">Cómo surge cada cosa</h1>
        <p
          className="mx-auto mt-1.5 max-w-md text-micro leading-relaxed"
          style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
        >
          Desde la primera diferencia entre + y − hasta las criaturas que caminan por Garlia.
          Un recorrido visual, paso a paso.
        </p>
      </header>

      {/* Índice rápido — misma barra de tabs/pills que el resto del Universo */}
      <nav
        aria-label="Índice del recorrido"
        className="mb-8 flex flex-wrap items-center justify-center gap-1.5 px-1"
      >
        {ETAPAS.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            className="rounded-full px-2.5 py-1 text-micro font-bold uppercase tracking-wide transition-colors"
            style={{
              background: e.disponible
                ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                : "transparent",
              color: e.disponible
                ? "var(--primary)"
                : "color-mix(in srgb, var(--primary) 30%, transparent)",
              border: `1px solid ${
                e.disponible
                  ? "color-mix(in srgb, var(--primary) 20%, transparent)"
                  : "color-mix(in srgb, var(--primary) 10%, transparent)"
              }`,
            }}
          >
            {e.titulo}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-14 pb-24">
        <EtapaPolaridades />

        {ETAPAS.filter((e) => !e.disponible).map((e) => (
          <EtapaProximamente key={e.id} etapa={e} />
        ))}
      </div>
    </div>
  );
}
