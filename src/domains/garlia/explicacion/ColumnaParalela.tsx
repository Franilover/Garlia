"use client";

/**
 * ColumnaParalela.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Una ruta del bloque de ramas (Elementos→Compuestos→Estructuras→
 * Materiales→Objetos, o Iums→Oris), a ancho completo. BloqueRamasParalelas
 * elige cuál se muestra con un selector; cada ruta conserva su propio
 * progreso aunque esté oculta. Mismo patrón de click-to-reveal que
 * BloqueEtapaClickeable (número grande → toca → se revela → desbloquea
 * el siguiente de ESTA columna), pero con:
 *
 *   - Numeración LOCAL (1, 2, 3 dentro de la columna) que no interfiere
 *     con la numeración global del recorrido — BloqueRamasParalelas es
 *     "un solo tramo" a efectos del padre (ExplicacionPage).
 *   - Al completar el último paso de la columna, aparece un botón
 *     "Ir a la siguiente" en vez de quedar simplemente revelado — avisa
 *     al padre (BloqueRamasParalelas) que esta columna terminó.
 *
 * Cada columna avanza de forma completamente independiente de la otra
 * (no hay scroll-spy ni sincronización entre ellas): el usuario puede
 * completar Elementos→Compuestos→Estructuras sin haber tocado Iums
 * todavía, o al revés, o alternando.
 */

import React, { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

export interface PasoColumna {
  id: string;
  titulo: string;
  Componente: React.ComponentType<{ replayKey: number; onReplay: () => void }>;
}

export function ColumnaParalela({
  encabezado,
  pasos,
  onColumnaCompleta,
  onIrASiguiente,
  mostrarBoton = true,
  etiquetaBoton = "Ir a la siguiente",
}: {
  /** Título de la columna entera, mostrado arriba de todo, antes del
   *  primer paso. Opcional: cuando la columna vive bajo un selector de
   *  ruta (BloqueRamasParalelas), el propio selector ya dice cuál es y
   *  el encabezado sería redundante. */
  encabezado?: string;
  pasos: PasoColumna[];
  /** Se llama una sola vez, cuando el último paso de la columna termina
   *  de revelarse por primera vez. */
  onColumnaCompleta: () => void;
  /** Click real sobre el botón final ("Ir a la siguiente") — quien
   *  compone la columna decide qué hacer (scroll, desbloqueo global). */
  onIrASiguiente?: () => void;
  /** false cuando esta columna es la última en terminar entre las dos —
   *  BloqueRamasParalelas no necesita un botón "ir a siguiente" propio
   *  ahí, porque el paso siguiente ya se desbloquea solo al completar
   *  ambas columnas. */
  mostrarBoton?: boolean;
  etiquetaBoton?: string;
}) {
  // Prefijo estricto 0..n de `pasos` YA REVELADO POR CLICK (arranca en 0:
  // ninguno revelado todavía, pero el primero SÍ está desbloqueado —
  // mismo criterio que `desbloqueados` en ExplicacionPage/
  // BloqueEtapaClickeable, donde "desbloqueado" y "revelado" son cosas
  // distintas: desbloqueado = se puede tocar; revelado = ya se tocó y
  // se está mostrando el contenido).
  const [revelados, setRevelados] = useState(0);
  const [replayKeys, setReplayKeys] = useState<number[]>(() => pasos.map(() => 0));
  const [avisoEnviado, setAvisoEnviado] = useState(false);

  const revelarSiguiente = (indice: number) => {
    setRevelados((r) => Math.max(r, indice + 1));
    if (indice === pasos.length - 1 && !avisoEnviado) {
      setAvisoEnviado(true);
      onColumnaCompleta();
    }
  };

  const onReplay = (indice: number) => {
    setReplayKeys((keys) => keys.map((k, i) => (i === indice ? k + 1 : k)));
  };

  const columnaCompleta = revelados >= pasos.length;

  return (
    <div className="flex flex-col gap-6">
      {encabezado && (
        <p
          className="text-center text-[11px] font-black uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
        >
          {encabezado}
        </p>
      )}

      {pasos.map((paso, i) => {
        // El paso i ya fue revelado (clickeado) si i < revelados. Está
        // desbloqueado (clickeable, todavía sin revelar) si es el
        // primero (i === 0) o si el paso anterior ya fue revelado.
        const revelado = i < revelados;
        const desbloqueado = i === 0 || i - 1 < revelados;
        return (
          <BloqueColumna
            key={paso.id}
            numero={i + 1}
            titulo={paso.titulo}
            desbloqueado={desbloqueado}
            revelado={revelado}
            onRevelar={() => revelarSiguiente(i)}
          >
            <paso.Componente replayKey={replayKeys[i]} onReplay={() => onReplay(i)} />
          </BloqueColumna>
        );
      })}

      {columnaCompleta && mostrarBoton && (
        <div className="flex justify-center" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
          <ColumnaBotonSiguiente etiqueta={etiquetaBoton} onClick={onIrASiguiente} />
        </div>
      )}
      {columnaCompleta && !mostrarBoton && (
        <div className="flex justify-center" style={{ animation: "explicacion-fade-in 0.4s ease-out both" }}>
          <span
            className="text-[9px] font-bold uppercase tracking-wide opacity-40"
          >
            Ruta completa
          </span>
        </div>
      )}
    </div>
  );
}

/** Envoltorio de cada paso dentro de la columna: mismo look que
 *  BloqueEtapaClickeable pero más angosto/compacto, con número local. */
function BloqueColumna({
  numero,
  titulo,
  desbloqueado,
  revelado,
  onRevelar,
  children,
}: {
  numero: number;
  titulo: string;
  desbloqueado: boolean;
  revelado: boolean;
  onRevelar: () => void;
  children: React.ReactNode;
}) {
  if (revelado) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => desbloqueado && onRevelar()}
      disabled={!desbloqueado}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border py-8 transition-colors"
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
        style={{ fontSize: 40, color: desbloqueado ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)" }}
      >
        {numero}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
        {titulo}
      </span>
      {!desbloqueado && (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide opacity-60">
          <Lock size={10} />
          Completa el paso anterior
        </span>
      )}
      {desbloqueado && <span className="text-[9px] font-bold uppercase tracking-wide opacity-50">Toca para ver</span>}
    </button>
  );
}

/** Botón "Ir a la siguiente" — el onClick real (scroll, etc.) lo decide
 *  quien compone la columna (BloqueRamasParalelas), pasado por props. */
function ColumnaBotonSiguiente({ etiqueta, onClick }: { etiqueta: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wide transition-colors"
      style={{
        background: "color-mix(in srgb, var(--primary) 10%, transparent)",
        color: "var(--primary)",
        border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {etiqueta}
      <ArrowRight size={12} />
    </button>
  );
}
