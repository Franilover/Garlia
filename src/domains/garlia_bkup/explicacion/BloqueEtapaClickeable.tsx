"use client";

/**
 * BloqueEtapaClickeable.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Envoltorio reutilizable para cada tramo numerado del recorrido de
 * Explicación (Polaridades, TASI, Partículas, Elementos, Compuestos,
 * Estructuras, Materiales…).
 *
 * Tres estados visuales:
 *   - "bloqueado": el contenido real está oculto detrás de un bloque con
 *     el número en grande, sin poder abrirse todavía (el tramo anterior
 *     no se completó). No es clickeable.
 *   - "bloque" (desbloqueado, no visto): mismo bloque con el número, pero
 *     clickeable — invita a tocarlo.
 *   - "revelado": el bloque desaparece, se monta el contenido (la
 *     animación corre una vez de punta a punta) y se llama a
 *     onCompletado cuando termina, para desbloquear el siguiente tramo.
 *     Tras terminar, el gráfico queda quieto en su último frame; tocarlo
 *     de nuevo la vuelve a reproducir desde el inicio (remount vía key).
 *
 * El componente NO sabe nada del contenido interno de cada animación —
 * solo decide cuándo montarla (revelado) y le pasa un replayKey que el
 * padre incrementa en cada click sobre el gráfico ya revelado, para
 * forzar que React la remonte y el ciclo arranque de cero.
 */

import React, { useState } from "react";
import { Lock } from "lucide-react";

export function BloqueEtapaClickeable({
  numero,
  titulo,
  desbloqueado,
  onCompletado,
  children,
}: {
  numero: number;
  titulo: string;
  desbloqueado: boolean;
  /** Se llama una vez, cuando el usuario revela el bloque por primera
   *  vez — el padre lo usa para desbloquear el número siguiente. */
  onCompletado: () => void;
  /** Recibe replayKey (para forzar remount al pedir repetición) y
   *  onReplay (el propio contenido debe llamarlo al detectar un click
   *  sobre el gráfico ya revelado y terminado). */
  children: (args: { replayKey: number; onReplay: () => void }) => React.ReactNode;
}) {
  const [revelado, setRevelado] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const abrir = () => {
    if (!desbloqueado || revelado) return;
    setRevelado(true);
    onCompletado();
  };

  const onReplay = () => setReplayKey((k) => k + 1);

  if (!revelado) {
    return (
      <button
        type="button"
        onClick={abrir}
        disabled={!desbloqueado}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border py-14 transition-colors"
        style={{
          borderColor: desbloqueado
            ? "color-mix(in srgb, var(--primary) 25%, transparent)"
            : "color-mix(in srgb, var(--primary) 10%, transparent)",
          background: desbloqueado
            ? "color-mix(in srgb, var(--primary) 4%, transparent)"
            : "color-mix(in srgb, var(--primary) 2%, transparent)",
          borderStyle: desbloqueado ? "solid" : "dashed",
          cursor: desbloqueado ? "pointer" : "not-allowed",
          opacity: desbloqueado ? 1 : 0.55,
        }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: 64,
            color: desbloqueado ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          {numero}
        </span>
        <span
          className="text-micro font-black uppercase tracking-[0.2em]"
          style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
        >
          {titulo}
        </span>
        {!desbloqueado && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide opacity-60">
            <Lock size={11} />
            Completa el tramo anterior
          </span>
        )}
        {desbloqueado && (
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-50">Toca para ver</span>
        )}
      </button>
    );
  }

  return <>{children({ replayKey, onReplay })}</>;
}
