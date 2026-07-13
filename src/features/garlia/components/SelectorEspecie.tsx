"use client";

/**
 * SelectorEspecie.tsx
 * ───────────────────────
 * Selector de "especie/raza" para las fichas D&D: SOLO permite elegir entre
 * las criaturas ya creadas en Garlia (no admite texto libre). Reemplaza al
 * input de texto de "raza" del formulario de ficha.
 *
 * Reutiliza el catálogo global de criaturas (mismo cache que alimenta el
 * selector "Criatura" en Items, Runas, Hechizos y Dones).
 */

import { ChevronDown, Loader2, PawPrint, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { useEspeciesCatalogo } from "@/features/garlia/hooks/useFichasDnd";

export function SelectorEspecie({
  value,
  onChange,
  label = "Especie",
  placeholder = "Elegir especie…",
}: {
  value: string | null; // especie_id
  onChange: (especieId: string | null) => void;
  label?: string;
  placeholder?: string;
}) {
  const { especies, loading } = useEspeciesCatalogo();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const actual = especies.find((e) => e.id === value) ?? null;
  const disponibles = especies.filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  const border = "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";
  const borderFocus = "1px solid color-mix(in srgb, var(--primary) 35%, transparent)";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={containerRef} className="space-y-1 relative">
      <div className="flex items-center gap-1.5">
        <PawPrint size={9} style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }} />
        <span
          className="text-micro font-black uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}
        >
          {label}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--radius-btn)] text-xs transition-all"
        style={{
          background: "color-mix(in srgb, var(--primary) 5%, transparent)",
          border: open ? borderFocus : border,
          color: actual ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
        }}
      >
        <span className="flex items-center gap-2 truncate">
          {actual?.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={actual.imagen_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
          )}
          <span className="truncate font-bold">{actual ? actual.nombre : placeholder}</span>
        </span>
        {loading ? (
          <Loader2 className="animate-spin text-primary/30 shrink-0" size={12} />
        ) : (
          <ChevronDown
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            size={12}
            style={{ opacity: 0.5 }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute z-20 mt-1 w-full rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            border,
            background: "var(--bg-main)",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-micro font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
              placeholder="Buscar especie…"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setOpen(false), setSearch(""))}
            />
            {search && (
              <button type="button" className="opacity-30 hover:opacity-70 transition-opacity" onClick={() => setSearch("")}>
                <X size={10} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto">
            {actual && (
              <button
                type="button"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-micro font-bold uppercase transition-all hover:bg-primary/5"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
                onMouseDown={() => {
                  onChange(null);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <X className="opacity-50" size={9} />
                </span>
                Sin especie
              </button>
            )}

            {loading ? (
              <div className="flex items-center gap-2 px-4 py-3">
                <Loader2 className="animate-spin text-primary/30" size={12} />
                <span className="text-micro text-primary/30">Cargando…</span>
              </div>
            ) : especies.length === 0 ? (
              <p className="text-micro text-primary/30 px-4 py-3 font-bold uppercase">
                Todavía no hay criaturas creadas en Garlia
              </p>
            ) : disponibles.length === 0 ? (
              <p className="text-micro text-primary/30 px-4 py-3 font-bold uppercase">
                Sin resultados para &quot;{search}&quot;
              </p>
            ) : (
              disponibles.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-micro font-bold uppercase transition-all hover:bg-primary/6"
                  style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
                  onMouseDown={() => {
                    onChange(e.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {e.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.imagen_url} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  )}
                  <span className="truncate">{e.nombre}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
