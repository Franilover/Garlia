"use client";

/**
 * BloqueRamasParalelas.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque especial post-Partículas: dos columnas corriendo lado a lado,
 * cada una con su propio progreso interno de click-to-reveal
 * (ColumnaParalela) — sin sincronización entre ellas:
 *
 *   Columna izquierda: Elementos → Compuestos → Estructuras → Materiales → Objetos
 *   Columna derecha:   Iums → Oris
 *
 * Materiales y Objetos son continuación de la cadena de Elementos (una
 * Estructura con propiedades físicas propias, y luego una cosa del
 * mundo hecha con esos Materiales) — NO dependen de la rama Iums para
 * nada, así que viven como pasos 4 y 5 de la columna de Elementos, no
 * como tramos separados después de este bloque.
 *
 * A efectos del orquestador global (ExplicacionPage), este bloque entero
 * cuenta como UN tramo: recibe `desbloqueado`/`onCompletado` con la misma
 * forma que BloqueEtapaClickeable, y llama a onCompletado() una sola vez
 * cuando AMBAS columnas terminan (sin importar el orden en que el
 * usuario las complete) — en la práctica esto ya es el final del
 * recorrido "construido hasta ahora", así que onCompletado no desbloquea
 * ningún tramo visible todavía, pero mantiene el mismo contrato que el
 * resto de los tramos por si se agrega algo después.
 *
 * Cada columna termina por su cuenta, sin depender de la otra: no hay
 * botón "ir a la siguiente" entre columnas — cada una simplemente llega
 * a su propio final (Objetos / Oris) y queda ahí.
 */

import React, { useRef, useState } from "react";

import { ColumnaParalela, type PasoColumna } from "./ColumnaParalela";
import EtapaElementos from "./EtapaElementos";
import EtapaCompuestos from "./EtapaCompuestos";
import EtapaEstructuras from "./EtapaEstructuras";
import EtapaMateriales from "./EtapaMateriales";
import EtapaObjetos from "./EtapaObjetos";
import EtapaIums from "./EtapaIums";
import EtapaOris from "./EtapaOris";

const PASOS_ELEMENTOS: PasoColumna[] = [
  { id: "elementos", titulo: "Elementos", Componente: EtapaElementos },
  { id: "compuestos", titulo: "Compuestos", Componente: EtapaCompuestos },
  { id: "estructuras", titulo: "Estructuras", Componente: EtapaEstructuras },
  { id: "materiales", titulo: "Materiales", Componente: EtapaMateriales },
  { id: "objetos", titulo: "Objetos", Componente: EtapaObjetos },
];

const PASOS_IUMS: PasoColumna[] = [
  { id: "iums", titulo: "Iums", Componente: EtapaIums },
  { id: "oris", titulo: "Oris", Componente: EtapaOris },
];

export function BloqueRamasParalelas({
  desbloqueado,
  onCompletado,
}: {
  desbloqueado: boolean;
  /** Se llama una sola vez, cuando AMBAS columnas terminaron. */
  onCompletado: () => void;
}) {
  const [elementosListo, setElementosListo] = useState(false);
  const [iumsListo, setIumsListo] = useState(false);
  const avisadoRef = useRef(false);

  const marcarElementosListo = () => setElementosListo(true);
  const marcarIumsListo = () => setIumsListo(true);

  const ambasListas = elementosListo && iumsListo;
  if (ambasListas && !avisadoRef.current) {
    avisadoRef.current = true;
    // Se dispara en el próximo tick, fuera del render, para no llamar a
    // setState del padre en medio del render de este componente.
    queueMicrotask(onCompletado);
  }

  if (!desbloqueado) {
    return (
      <div
        className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          opacity: 0.55,
        }}
      >
        <span className="font-black leading-none" style={{ fontSize: 64, color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
          4
        </span>
        <span className="text-micro font-black uppercase tracking-[0.2em]" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
          Material / Energética
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-60">
          Completa el tramo anterior
        </span>
      </div>
    );
  }

  return (
    <div id="ramas-paralelas" className="scroll-mt-20 px-1">
      <div className="mb-6 text-center">
        <p className="text-micro" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
          Desde acá, dos caminos en paralelo: la materia y las fuerzas funcionales.
        </p>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-8">
        <div className="lg:min-w-0 lg:flex-1">
          <ColumnaParalela
            encabezado="Material"
            pasos={PASOS_ELEMENTOS}
            onColumnaCompleta={marcarElementosListo}
            mostrarBoton={false}
          />
        </div>

        <div
          className="hidden self-stretch lg:block"
          style={{ width: 1, background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
        />

        <div className="lg:min-w-0 lg:flex-1">
          <ColumnaParalela
            encabezado="Energética"
            pasos={PASOS_IUMS}
            onColumnaCompleta={marcarIumsListo}
            mostrarBoton={false}
          />
        </div>
      </div>
    </div>
  );
}
