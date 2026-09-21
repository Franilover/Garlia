"use client";

/**
 * FiltroDropdown
 * ───────────────────────────────────────────────────────────────────────────
 * Dropdown de filtro compacto para barras de catálogo (ej. Estructuras:
 * Tipo / Función / Geometría / Tags). Mismo lenguaje visual que
 * GrupoFiltroDropdown (pill con chevron, panel flotante, "Todos" primero,
 * estado activo en acento — SIN color de fondo en el botón: solo borde
 * y color de letra, pedido 2026-09-20), pero con opciones planas {value, label} en vez
 * de grupos con miembros — acá el filtrado real lo hace el padre.
 *
 * Controlado: el padre guarda `value` (null = "Todos"). Cierra al hacer
 * click afuera o al elegir. Cada opción puede traer un `count` opcional
 * (cuántas entradas darían) para que el escritor vea el efecto antes de
 * elegir.
 */

import { ChevronDown } from "lucide-react";
import React, { useLayoutEffect, useRef, useState } from "react";

export interface FiltroOpcion {
  value: string;
  label: string;
  count?: number;
}

export function FiltroDropdown({
  etiqueta,
  opciones,
  value,
  onChange,
}: {
  /** Texto del botón cuando no hay nada elegido (ej. "Tipo"). */
  etiqueta: string;
  opciones: FiltroOpcion[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seleccionada = opciones.find((o) => o.value === value) ?? null;

  useLayoutEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={etiqueta}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-micro font-bold uppercase tracking-wide transition-colors max-w-[160px] cursor-pointer ${
          seleccionada
            ? "text-accent border border-accent/60"
            : "text-primary/70 hover:text-primary border border-primary/25 hover:border-primary/50"
        }`}
      >
        <span className="truncate">{seleccionada ? seleccionada.label : etiqueta}</span>
        <ChevronDown size={10} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 min-w-[180px] max-w-[260px] max-h-[320px] overflow-y-auto rounded-lg border border-primary/10 bg-[var(--card,_#1a1a1a)] shadow-lg py-1">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-micro font-semibold truncate transition-colors cursor-pointer ${
              !seleccionada ? "text-accent" : "text-primary/50 hover:text-primary"
            }`}
          >
            Todos
          </button>
          {opciones.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-micro font-semibold transition-colors cursor-pointer ${
                o.value === value
                  ? "text-accent"
                  : "text-primary/70 hover:text-primary"
              }`}
            >
              <span className="flex-1 min-w-0 truncate">{o.label}</span>
              {o.count !== undefined && (
                <span className="shrink-0 tabular-nums text-primary/30">{o.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
