"use client";

/**
 * BreadcrumbJerarquia.tsx
 * ───────────────────────────────────────────────────────────────────────────
 * Fila horizontal "Célula > Tejido > Órgano" para mostrar arriba del nombre
 * en cada panel flotante de Biología (PanelEditorCelula/Tejido/Organo).
 * El nivel actual va resaltado y no es clickeable; los otros dos SÍ son
 * clickeables y abren un popover con la lista de items relacionados en esa
 * dirección — hacia arriba (quién me usa) o hacia abajo (de qué estoy
 * hecho) según corresponda:
 *
 *   Parado en Tejido → click "Célula" abre popover con las Células que
 *     componen ESE tejido (useTejidoCelulas, dirección abajo).
 *   Parado en Tejido → click "Órgano" abre popover con los Órganos que
 *     usan ESE tejido (useOrganosDeUnTejido, dirección arriba).
 *   Parado en Célula → click "Tejido" abre popover con los Tejidos que
 *     usan ESA célula (useTejidosDeUnaCelula, dirección arriba).
 *   Parado en Órgano → click "Tejido" abre popover con los Tejidos que
 *     componen ESE órgano (useOrganoTejidos, dirección abajo).
 *
 * Click en un item del popover navega: delega en el callback onNavegar del
 * nivel correspondiente, que el padre (BiologiaPage/CatalogoTejidosBiologia/
 * PanelEditorOrgano) resuelve cerrando el panel actual y abriendo el editor
 * flotante del elegido — mismo patrón que onAbrirCelula ya existente.
 *
 * Genérico y sin conocimiento de Supabase: recibe los items ya resueltos
 * (o un loader) por nivel vía props, así que el mismo componente sirve para
 * el espejo en Física (Grano > Veta > Formación) pasando otros labels/data.
 *
 * FIX: PopoverNivel se renderiza via createPortal al document.body con
 * position:fixed para escapar del overflow:hidden de los paneles padre.
 * Sin esto los popovers de Tejido/Célula/Organismo quedaban clippeados
 * dentro del marco del editor en vez de flotar sobre todo.
 */

import { ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface NivelBreadcrumb {
  /** Label del nivel, ej. "Célula" / "Tejido" / "Órgano". */
  label: string;
  /** Ícono chico del nivel (mismo que usa el panel editor correspondiente). */
  icono?: React.ReactNode;
  /** true si este es el nivel del panel abierto actualmente (no clickeable, resaltado). */
  activo: boolean;
  /**
   * Items relacionados a mostrar en el popover cuando se clickea este nivel
   * desde OTRO nivel activo. Si es null/undefined mientras loading=true,
   * el popover muestra "Cargando…". Si es [] con loading=false, muestra
   * "Sin vínculos".
   */
  items?: { id: string; nombre: string }[];
  loading?: boolean;
  /** Navegar al item elegido: cierra el panel actual y abre el de destino. */
  onNavegar?: (id: string) => void;
}

interface Props {
  niveles: NivelBreadcrumb[];
}

export function BreadcrumbJerarquia({ niveles }: Props) {
  const [abiertoIdx, setAbiertoIdx] = useState<number | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abiertoIdx === null) return;
    function onClickFuera(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbiertoIdx(null);
        setAnchorRect(null);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbiertoIdx(null);
        setAnchorRect(null);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickFuera);
      document.removeEventListener("keydown", onEsc);
    };
  }, [abiertoIdx]);

  function handleToggle(idx: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (abiertoIdx === idx) {
      setAbiertoIdx(null);
      setAnchorRect(null);
    } else {
      setAbiertoIdx(idx);
      setAnchorRect(e.currentTarget.getBoundingClientRect());
    }
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1 flex-wrap">
      {niveles.map((nivel, idx) => (
        <React.Fragment key={nivel.label}>
          {idx > 0 && <ChevronRight size={11} className="text-primary/20 shrink-0" />}
          <div className="relative">
            <button
              type="button"
              disabled={nivel.activo}
              onClick={(e) => handleToggle(idx, e)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-micro font-black uppercase tracking-widest transition-colors ${
                nivel.activo
                  ? "text-primary cursor-default"
                  : "text-primary/40 hover:text-primary hover:bg-primary/6 cursor-pointer"
              }`}
              title={nivel.activo ? undefined : `Ver ${nivel.label.toLowerCase()}s relacionados`}
            >
              {nivel.icono}
              {nivel.label}
            </button>
          </div>
        </React.Fragment>
      ))}

      {/* Portal: renderiza el popover directamente en document.body con
          position:fixed para escapar del overflow:hidden del panel padre.
          Sin esto los popovers de Tejido/Célula/Organismo quedaban
          clippeados adentro del marco del editor flotante. */}
      {abiertoIdx !== null &&
        anchorRect !== null &&
        !niveles[abiertoIdx].activo &&
        typeof document !== "undefined" &&
        createPortal(
          <PopoverNivel
            nivel={niveles[abiertoIdx]}
            anchorRect={anchorRect}
            onElegir={(id) => {
              setAbiertoIdx(null);
              setAnchorRect(null);
              niveles[abiertoIdx].onNavegar?.(id);
            }}
            onClose={() => {
              setAbiertoIdx(null);
              setAnchorRect(null);
            }}
          />,
          document.body,
        )}
    </div>
  );
}

function PopoverNivel({
  nivel,
  anchorRect,
  onElegir,
  onClose,
}: {
  nivel: NivelBreadcrumb;
  /** Bounding rect del botón que disparó el popover — usado para posicionarlo. */
  anchorRect: DOMRect;
  onElegir: (id: string) => void;
  onClose: () => void;
}) {
  const items = nivel.items ?? [];

  // Posición fija bajo el botón anchor, escapando del overflow:hidden del padre.
  const style: React.CSSProperties = {
    position: "fixed",
    top: anchorRect.bottom + 4,
    left: anchorRect.left,
    minWidth: "11rem",
    maxWidth: "16rem",
    maxHeight: "14rem",
    overflowY: "auto",
    zIndex: 99999,
    background: "var(--bg-main)",
    borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
    animation: "popIn 120ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  };

  return (
    <div
      className="rounded-lg border shadow-xl py-1"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="px-2.5 pb-1 text-[0.6rem] font-black uppercase tracking-[0.2em] text-primary/30 border-b border-primary/8 mb-1">
        {nivel.label}s
      </p>

      {nivel.loading && items.length === 0 ? (
        <p className="px-2.5 py-1.5 text-micro text-primary/25 italic">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="px-2.5 py-1.5 text-micro text-primary/25 italic">
          Sin {nivel.label.toLowerCase()}s vinculados
        </p>
      ) : (
        items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onElegir(it.id)}
            className="w-full text-left px-2.5 py-1.5 text-micro font-bold text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer"
          >
            {it.nombre || "(sin nombre)"}
          </button>
        ))
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full text-left px-2.5 pt-1 mt-1 border-t border-primary/8 text-[0.6rem] font-black uppercase tracking-widest text-primary/25 hover:text-primary/50 transition-colors cursor-pointer"
      >
        Cerrar
      </button>
    </div>
  );
}
