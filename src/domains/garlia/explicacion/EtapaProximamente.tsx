"use client";

import React from "react";
import { Hourglass } from "lucide-react";

import type { EtapaInfo } from "./etapas";

/** Placeholder liviano para un tramo del recorrido que todavía no tiene
 *  gráficos propios — mismo tratamiento visual que el resto (borde sutil,
 *  tono sepia), pero sin prometer contenido con un componente vacío. */
export default function EtapaProximamente({ etapa }: { etapa: EtapaInfo }) {
  return (
    <section id={etapa.id} className="scroll-mt-20 px-1">
      <div
        className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-5"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "color-mix(in srgb, var(--primary) 55%, transparent)",
          }}
        >
          <Hourglass size={15} />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide">{etapa.titulo}</h2>
          <p
            className="text-micro"
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
          >
            {etapa.resumen} · Próximamente en este recorrido.
          </p>
        </div>
      </div>
    </section>
  );
}
