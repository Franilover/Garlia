"use client";

/**
 * BloqueRamasParalelas.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Bloque especial post-Partículas: dos rutas posibles, elegidas con un
 * selector "Material | Energética". Se muestra UNA sola ruta a la vez, a
 * ancho completo (antes eran dos columnas lado a lado, cada una a medio
 * ancho):
 *
 *   Material:   Elementos → Compuestos → Estructuras → Materiales → Objetos
 *   Energética: Iums → Oris
 *
 * Materiales y Objetos son continuación de la cadena de Elementos (una
 * Estructura con propiedades físicas propias, y luego una cosa del
 * mundo hecha con esos Materiales) — NO dependen de la rama Iums para
 * nada, así que viven como pasos 4 y 5 de la ruta Material, no como
 * tramos separados después de este bloque.
 *
 * Las dos rutas siguen siendo independientes entre sí: cada una lleva su
 * propio progreso interno de click-to-reveal (ColumnaParalela). Las DOS
 * quedan siempre montadas y la inactiva solo se oculta (`hidden`), no se
 * desmonta — así, cambiar de ruta no pierde lo que ya se reveló ni
 * reinicia sus animaciones.
 *
 * A efectos del orquestador global (ExplicacionPage), este bloque entero
 * cuenta como UN tramo: recibe `desbloqueado`/`onCompletado` con la misma
 * forma que BloqueEtapaClickeable, y llama a onCompletado() una sola vez
 * cuando AMBAS rutas terminan (sin importar el orden ni cuál se eligió
 * primero) — en la práctica esto ya es el final del recorrido "construido
 * hasta ahora", así que onCompletado no desbloquea ningún tramo visible
 * todavía, pero mantiene el mismo contrato que el resto de los tramos por
 * si se agrega algo después.
 *
 * Cada ruta termina por su cuenta (Objetos / Oris); no hay botón "ir a la
 * siguiente" entre ellas. Una ruta ya completada se marca con un check en
 * su pestaña del selector.
 *
 * Anclas del sidebar (#iums, #oris, #elementos…): si el destino está en la
 * ruta oculta, el navegador no puede desplazarse a un elemento con
 * display:none. Por eso este bloque escucha `hashchange` y, si el ancla
 * pertenece a la otra ruta, la activa y recién entonces hace el scroll.
 */

import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

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

type Ruta = "material" | "energetica";

const RUTAS: { id: Ruta; etiqueta: string; pasos: PasoColumna[] }[] = [
  { id: "material", etiqueta: "Material", pasos: PASOS_ELEMENTOS },
  { id: "energetica", etiqueta: "Energética", pasos: PASOS_IUMS },
];

/** Selector de ruta: control segmentado "Material | Energética". */
function SelectorRuta({
  ruta,
  listas,
  onElegir,
}: {
  ruta: Ruta;
  listas: Record<Ruta, boolean>;
  onElegir: (r: Ruta) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Ruta"
      className="mx-auto mb-8 flex w-fit rounded-full p-1"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
        background: "color-mix(in srgb, var(--primary) 4%, transparent)",
      }}
    >
      {RUTAS.map((r) => {
        const activa = r.id === ruta;
        return (
          <button
            key={r.id}
            type="button"
            role="tab"
            id={`tab-ruta-${r.id}`}
            aria-selected={activa}
            aria-controls={`panel-ruta-${r.id}`}
            onClick={() => onElegir(r.id)}
            className="flex items-center gap-1.5 rounded-full px-5 py-2 text-micro font-black uppercase tracking-[0.2em] transition-colors"
            style={{
              background: activa ? "var(--primary)" : "transparent",
              color: activa ? "var(--bg-main)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
              cursor: activa ? "default" : "pointer",
            }}
          >
            {r.etiqueta}
            {listas[r.id] && <Check size={12} strokeWidth={3} aria-label="Completada" />}
          </button>
        );
      })}
    </div>
  );
}

export function BloqueRamasParalelas({
  desbloqueado,
  onCompletado,
}: {
  desbloqueado: boolean;
  /** Se llama una sola vez, cuando AMBAS rutas terminaron. */
  onCompletado: () => void;
}) {
  const [ruta, setRuta] = useState<Ruta>("material");
  const [listas, setListas] = useState<Record<Ruta, boolean>>({ material: false, energetica: false });
  const avisadoRef = useRef(false);

  // Ruta actual accesible desde el listener de hashchange sin re-suscribirlo.
  const rutaRef = useRef<Ruta>(ruta);
  rutaRef.current = ruta;

  const marcarLista = (r: Ruta) => setListas((prev) => (prev[r] ? prev : { ...prev, [r]: true }));

  const ambasListas = listas.material && listas.energetica;
  if (ambasListas && !avisadoRef.current) {
    avisadoRef.current = true;
    // Se dispara en el próximo tick, fuera del render, para no llamar a
    // setState del padre en medio del render de este componente.
    queueMicrotask(onCompletado);
  }

  // Ancla del sidebar que apunta a la ruta oculta → activar esa ruta y
  // recién entonces desplazarse (un display:none no se puede scrollear).
  useEffect(() => {
    const alCambiarHash = () => {
      const id = window.location.hash.slice(1);
      const destino = RUTAS.find((r) => r.pasos.some((p) => p.id === id));
      if (!destino || destino.id === rutaRef.current) return;
      setRuta(destino.id);
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("hashchange", alCambiarHash);
    return () => window.removeEventListener("hashchange", alCambiarHash);
  }, []);

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
          Desde acá, dos caminos: la materia y las fuerzas funcionales.
        </p>
      </div>

      <SelectorRuta ruta={ruta} listas={listas} onElegir={setRuta} />

      {/* Una sola ruta visible, a ancho completo. Las dos quedan montadas:
          la inactiva solo se oculta, para no perder su progreso. */}
      {RUTAS.map((r) => (
        <div key={r.id} role="tabpanel" id={`panel-ruta-${r.id}`} aria-labelledby={`tab-ruta-${r.id}`} hidden={ruta !== r.id} className="w-full">
          <ColumnaParalela pasos={r.pasos} onColumnaCompleta={() => marcarLista(r.id)} mostrarBoton={false} />
        </div>
      ))}
    </div>
  );
}
