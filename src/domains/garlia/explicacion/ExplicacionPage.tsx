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
 *   → [ Elementos → Compuestos → Estructuras → Materiales → Objetos
 *       | Iums → Formas → Oris ]  (en paralelo, cada columna con su propia cadena)
 *   → Células → Tejidos → Órganos → Sistemas → Organismos → Criaturas
 *
 * Por ahora está construido hasta el final de ambas columnas paralelas
 * (Objetos en la columna de Elementos, Oris en la de Iums). Materiales y
 * Objetos son continuación de la cadena de Elementos — no un tramo
 * global aparte — así que viven DENTRO de esa columna (ver
 * BloqueRamasParalelas.tsx), no como bloques sueltos acá.
 *
 * Rediseño "bloques numerados" (click-to-reveal, orden estricto):
 *   Al entrar, cada tramo está oculto detrás de un bloque con su número
 *   en grande (1 Polaridades, 2 TASI, 3 Partículas, 4 Elementos/Iums en
 *   paralelo). Solo el primero está clickeable; los demás están
 *   bloqueados (candado) hasta que se revela el anterior. Al tocar un
 *   bloque desbloqueado, el número desaparece y la animación de ese
 *   tramo corre UNA vez, quedando quieta en su último frame — y
 *   desbloquea el número siguiente. Tocar el gráfico ya terminado lo
 *   vuelve a reproducir desde el inicio (no desbloquea nada de nuevo, ya
 *   está desbloqueado).
 *
 *   El tramo 4 (Elementos/Iums) es especial: no es un solo componente
 *   sino BloqueRamasParalelas, que internamente maneja DOS columnas
 *   (Elementos→Compuestos→Estructuras→Materiales→Objetos, e
 *   Iums→Formas→Oris) corriendo en paralelo e independiente entre sí —
 *   ver BloqueRamasParalelas.tsx y ColumnaParalela.tsx. A ojos de este
 *   orquestador, el tramo 4 se comporta igual que cualquier otro: recibe
 *   desbloqueado/onCompletado y avisa una sola vez cuando termina (acá,
 *   cuando AMBAS columnas terminan) — por ahora no hay tramo 5 que
 *   desbloquear, pero se mantiene el mismo contrato por si se agrega
 *   algo después (ej. la rama de Biología).
 *
 *   El progreso (`desbloqueados`) vive acá, en el orquestador — cada
 *   EtapaXxx es "tonta": solo sabe reproducir su propia animación dado un
 *   replayKey, y avisar via onReplay cuando el usuario pide repetirla.
 *
 * Layout: Polaridades, TASI y Partículas en fila (desktop, lg+); el
 * bloque de ramas paralelas ocupa el ancho completo. Contenido a la
 * izquierda + barra lateral fija de índice a la derecha (solo desktop,
 * lg+).
 */

import React, { useState } from "react";

import EtapaPolaridadesSolo from "./EtapaPolaridadesSolo";
import EtapaTasi from "./EtapaTasi";
import EtapaParticulas from "./EtapaParticulas";
import { BloqueEtapaClickeable } from "./BloqueEtapaClickeable";
import { BloqueRamasParalelas } from "./BloqueRamasParalelas";
import { SidebarExplicacion } from "./SidebarExplicacion";

const TRAMOS_SIMPLES_INICIALES = [
  { numero: 1, id: "polaridades", titulo: "Polaridades", Componente: EtapaPolaridadesSolo },
  { numero: 2, id: "tasi", titulo: "TASI", Componente: EtapaTasi },
  { numero: 3, id: "particulas", titulo: "Partículas", Componente: EtapaParticulas },
] as const;

// El tramo 4 (Elementos/Iums en paralelo, con Materiales/Objetos dentro
// de la columna de Elementos) no está en esta lista — se renderiza
// aparte con BloqueRamasParalelas, ver más abajo. No hay tramos
// posteriores todavía.

export default function ExplicacionPage() {
  // Cuántos tramos están desbloqueados (siempre un prefijo 1..n sobre la
  // numeración global 1..4 — orden estricto). Arranca en 1: solo
  // Polaridades clickeable.
  const [desbloqueados, setDesbloqueados] = useState(1);

  const desbloquearSiguiente = (numero: number) => {
    setDesbloqueados((d) => Math.max(d, numero + 1));
  };

  const bloquesIniciales = TRAMOS_SIMPLES_INICIALES.map(({ numero, id, titulo, Componente }) => (
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

  // bloquesIniciales[0..2] = Polaridades, TASI, Partículas — en fila (desktop, lg+).
  // BloqueRamasParalelas = tramo 4, Elementos(→Materiales→Objetos)/Iums(→Formas→Oris)
  // en paralelo, ancho completo — último tramo construido hasta ahora.
  return (
    <div className="mx-auto max-w-[1400px] px-2 lg:px-6">
      <div className="flex flex-col gap-14 pt-4 pb-24">
        <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:gap-6">
          <div className="lg:min-w-0 lg:flex-1">{bloquesIniciales[0]}</div>
          <div className="lg:min-w-0 lg:flex-1">{bloquesIniciales[1]}</div>
          <div className="lg:min-w-0 lg:flex-1">{bloquesIniciales[2]}</div>
        </div>

        <BloqueRamasParalelas
          desbloqueado={4 <= desbloqueados}
          onCompletado={() => desbloquearSiguiente(4)}
        />
      </div>

      {/* Panel lateral: oculto por defecto, fixed, se abre con el botón toggle */}
      <SidebarExplicacion />
    </div>
  );
}
