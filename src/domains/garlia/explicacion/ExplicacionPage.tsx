"use client";

/**
 * ExplicacionPage.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Reemplaza a "Teorías" en /garlia/universo. Página en scroll largo que
 * explica CÓMO SURGE cada cosa en Garlia, tramo por tramo, con gráficos
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
 * Por ahora está construido hasta Materiales (Polaridades → TASI →
 * Partículas → Elementos → Compuestos → Estructuras → Materiales).
 *
 * Rediseño "bloques numerados" (click-to-reveal, orden estricto):
 *   Al entrar, cada tramo está oculto detrás de un bloque con su número
 *   en grande (1 Polaridades, 2 TASI, 3 Partículas, 4 Elementos, 5
 *   Compuestos, 6 Estructuras, 7 Materiales). Solo el primero está
 *   clickeable; los demás están bloqueados (candado) hasta que se revela
 *   el anterior. Al tocar un bloque desbloqueado, el número desaparece y
 *   la animación de ese tramo corre UNA vez, quedando quieta en su
 *   último frame — y desbloquea el número siguiente. Tocar el gráfico ya
 *   terminado lo vuelve a reproducir desde el inicio (no desbloquea nada
 *   de nuevo, ya está desbloqueado).
 *
 *   El progreso (`desbloqueados`) vive acá, en el orquestador — cada
 *   EtapaXxx es "tonta": solo sabe reproducir su propia animación dado un
 *   replayKey, y avisar via onReplay cuando el usuario pide repetirla.
 *
 * Layout: Elementos y Compuestos en fila (desktop, lg+), el resto uno
 * debajo del otro. Contenido a la izquierda + barra lateral fija de
 * índice a la derecha (solo desktop, lg+).
 */

import React, { useState } from "react";

import EtapaPolaridadesSolo from "./EtapaPolaridadesSolo";
import EtapaTasi from "./EtapaTasi";
import EtapaParticulas from "./EtapaParticulas";
import EtapaElementos from "./EtapaElementos";
import EtapaCompuestos from "./EtapaCompuestos";
import EtapaEstructuras from "./EtapaEstructuras";
import EtapaMateriales from "./EtapaMateriales";
import { BloqueEtapaClickeable } from "./BloqueEtapaClickeable";
import { SidebarExplicacion } from "./SidebarExplicacion";

const TRAMOS = [
  { numero: 1, id: "polaridades", titulo: "Polaridades", Componente: EtapaPolaridadesSolo },
  { numero: 2, id: "tasi", titulo: "TASI", Componente: EtapaTasi },
  { numero: 3, id: "particulas", titulo: "Partículas", Componente: EtapaParticulas },
  { numero: 4, id: "elementos", titulo: "Elementos", Componente: EtapaElementos },
  { numero: 5, id: "compuestos", titulo: "Compuestos", Componente: EtapaCompuestos },
  { numero: 6, id: "estructuras", titulo: "Estructuras", Componente: EtapaEstructuras },
  { numero: 7, id: "materiales", titulo: "Materiales", Componente: EtapaMateriales },
] as const;

export default function ExplicacionPage() {
  // Cuántos tramos están desbloqueados (siempre un prefijo 1..n de
  // TRAMOS — orden estricto). Arranca en 1: solo Polaridades clickeable.
  const [desbloqueados, setDesbloqueados] = useState(1);

  const desbloquearSiguiente = (numero: number) => {
    setDesbloqueados((d) => Math.max(d, numero + 1));
  };

  const bloques = TRAMOS.map(({ numero, id, titulo, Componente }) => (
    <BloqueEtapaClickeable
      key={id}
      numero={numero}
      titulo={titulo}
      desbloqueado={numero <= desbloqueados}
      onCompletado={() => desbloquearSiguiente(numero)}
    >
      {({ replayKey, onReplay }) => <Componente replayKey={replayKey} onReplay={onReplay} />}
    </BloqueEtapaClickeable>
  ));

  // bloques[0..2] = Polaridades, TASI, Partículas — en fila (desktop, lg+).
  // bloques[3..4] = Elementos, Compuestos — en fila (desktop, lg+).
  // bloques[5..6] = Estructuras, Materiales — uno debajo del otro.
  return (
    <div className="mx-auto flex max-w-[1600px] items-start gap-10 px-2 lg:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-14 pt-4 pb-24">
          <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:gap-6">
            <div className="lg:min-w-0 lg:flex-1">{bloques[0]}</div>
            <div className="lg:min-w-0 lg:flex-1">{bloques[1]}</div>
            <div className="lg:min-w-0 lg:flex-1">{bloques[2]}</div>
          </div>

          <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:gap-6">
            <div className="lg:min-w-0 lg:flex-1">{bloques[3]}</div>
            <div className="lg:min-w-0 lg:flex-1">{bloques[4]}</div>
          </div>

          {bloques[5]}
          {bloques[6]}
        </div>
      </div>

      <SidebarExplicacion />
    </div>
  );
}
