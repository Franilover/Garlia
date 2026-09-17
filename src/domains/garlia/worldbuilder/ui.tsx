"use client";

/**
 * ui.ts — dominio Worldbuilder
 * ───────────────────────────────────────────────────────────────────────────
 * Primitivos visuales mínimos, calcados de los ya usados en
 * visualizador/VisualizadorPage.tsx (SelectDropdown/EmptyRow/LoadingRow/
 * StatusPill) para que Worldbuilder tenga el mismo lenguaje minimalista sin
 * crear una dependencia entre dominios — Worldbuilder es una pestaña de
 * nivel superior propia (junto a Runas/Química/Visualizador), no vive
 * dentro de VisualizadorPage.
 */

import React from "react";

export function SelectDropdown<T>({
  items,
  active,
  getKey,
  getLabel,
  onSelect,
  placeholder = "Seleccioná un elemento…",
}: {
  items: T[];
  active: T | null;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={active ? getKey(active) : ""}
      onChange={(e) => {
        const found = items.find((item) => getKey(item) === e.target.value);
        if (found) onSelect(found);
      }}
      className="w-full max-w-sm rounded-lg border border-primary/15 bg-transparent px-3.5 py-2.5 text-xs font-black text-primary/85 outline-none transition-colors hover:border-primary/30 focus:border-primary/40"
    >
      {!active ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {items.map((item) => (
        <option key={getKey(item)} value={getKey(item)} className="bg-[var(--bg-main)] text-primary">
          {getLabel(item)}
        </option>
      ))}
    </select>
  );
}

export function LoadingRow({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 p-5 text-xs font-bold text-primary/35">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
      {children ?? "Cargando datos reales desde Supabase…"}
    </div>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-primary/15 p-5 text-xs leading-5 text-primary/40">
      {children}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/25 text-emerald-500"
      : tone === "warning"
        ? "border-amber-500/25 text-amber-500"
        : "border-primary/10 text-primary/50";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${toneClass}`}
    >
      {children}
    </span>
  );
}
