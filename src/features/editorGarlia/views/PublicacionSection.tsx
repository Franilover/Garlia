"use client";

/**
 * PublicacionSection
 * ───────────────────────────────────────────────────────────────────────────
 * Tab "Publicación" del editor de mundo (junto a Línea de Tiempo). Muestra
 * TODAS las entidades del mundo (personajes, criaturas, items, reinos,
 * ciudades, hechizos, dones, runas) agrupadas por tipo, cada una con un
 * toggle "Publicar / Ocultar". Lo publicado aparece al instante (realtime)
 * en /garlia/aventura para los jugadores.
 */

import { Eye, EyeOff, Loader2, Search, Sparkles, X } from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  TIPO_LABEL,
  usePublicacionEntidades,
  type EntidadPublicable,
  type TipoEntidadPublicable,
} from "../hooks/publicacion/usePublicacionEntidades";

const TIPOS_ORDEN: TipoEntidadPublicable[] = [
  "personajes",
  "criaturas",
  "items",
  "reinos",
  "ciudades",
  "hechizos",
  "dones",
  "runas",
];

type FiltroTipo = "todos" | TipoEntidadPublicable;

export function PublicacionSection() {
  const { todas, loading, togglePublicado } = usePublicacionEntidades();
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());

  const totalPublicadas = useMemo(() => todas.filter((e) => e.publicado).length, [todas]);

  const visibles = useMemo(() => {
    const base = filtro === "todos" ? todas : todas.filter((e) => e.tabla === filtro);
    const q = busqueda.trim().toLowerCase();
    const filtradas = q ? base.filter((e) => e.nombre.toLowerCase().includes(q)) : base;
    return filtradas.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [todas, filtro, busqueda]);

  const handleToggle = async (entidad: EntidadPublicable) => {
    const key = `${entidad.tabla}:${entidad.id}`;
    setPendientes((prev) => new Set(prev).add(key));
    try {
      await togglePublicado(entidad);
    } finally {
      setPendientes((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* ── Cabecera ─────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-primary/10">
        <Sparkles size={13} className="text-primary/50" />
        <h2 className="text-xs font-black uppercase tracking-widest text-primary/70">
          Publicación
        </h2>
        <span className="text-micro font-bold text-primary/35">
          {totalPublicadas} publicada{totalPublicadas === 1 ? "" : "s"} de {todas.length}
        </span>
        <div className="flex-1" />
      </div>

      {/* ── Búsqueda ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-primary/10">
        <div
          className="flex items-center gap-2 px-3 rounded-lg border border-primary/10 bg-primary/[0.03] focus-within:border-primary/30 transition-colors"
          style={{ height: "34px" }}
        >
          <Search size={13} className="text-primary/35 shrink-0" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre…"
            className="flex-1 bg-transparent outline-none text-xs text-primary/80 placeholder:text-primary/30"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              className="shrink-0 p-0.5 rounded-full hover:bg-primary/10 transition-colors"
            >
              <X size={12} className="text-primary/40" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros por tipo ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 border-b border-primary/10 overflow-x-auto">
        <FiltroChip active={filtro === "todos"} label="Todos" onClick={() => setFiltro("todos")} />
        {TIPOS_ORDEN.map((t) => (
          <FiltroChip
            key={t}
            active={filtro === t}
            label={TIPO_LABEL[t].plural}
            onClick={() => setFiltro(t)}
          />
        ))}
        <div className="flex-1" />
        {busqueda && (
          <span className="shrink-0 text-micro font-bold text-primary/35 whitespace-nowrap">
            {visibles.length} resultado{visibles.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading && todas.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-primary/30">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : visibles.length === 0 ? (
          <div className="py-16 text-center text-xs text-primary/30">
            {busqueda ? `Sin resultados para "${busqueda}".` : "No hay entidades de este tipo todavía."}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {visibles.map((entidad) => {
              const key = `${entidad.tabla}:${entidad.id}`;
              const isPending = pendientes.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggle(entidad)}
                  className={`group relative flex flex-col text-left overflow-hidden rounded-xl border transition-all disabled:opacity-60 ${
                    entidad.publicado
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-primary/10 bg-primary/[0.02] hover:border-primary/25"
                  }`}
                >
                  <div className="w-full h-20 shrink-0 overflow-hidden relative bg-primary/5">
                    {entidad.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entidad.imagen_url}
                        alt={entidad.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-primary/15 text-micro font-black uppercase">
                        {TIPO_LABEL[entidad.tabla].singular}
                      </div>
                    )}
                    <div
                      className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center ${
                        entidad.publicado
                          ? "bg-primary text-white"
                          : "bg-black/30 text-white/70"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : entidad.publicado ? (
                        <Eye size={11} />
                      ) : (
                        <EyeOff size={11} />
                      )}
                    </div>
                  </div>
                  <div className="p-2 flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-primary/80 truncate">
                      {entidad.nombre}
                    </span>
                    <span className="text-micro font-bold uppercase tracking-wide text-primary/35">
                      {entidad.publicado ? "Publicado" : "Oculto"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FiltroChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1 rounded-full text-micro font-bold uppercase tracking-wide transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-primary/40 hover:bg-primary/5 hover:text-primary/70"
      }`}
    >
      {label}
    </button>
  );
}
