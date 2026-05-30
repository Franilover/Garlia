"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Check, Loader2, ChevronDown } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   SeccionEntidad — sección de barra lateral con mini combo multi-selector
   ─────────────────────────────────────────────────────────────────────────────
   Reemplaza el botón "+" por un combo inline con búsqueda, flechas y Tab,
   diseñado para caber en barras de ~180px de ancho.

   Props:
   - label          etiqueta de la sección (ej: "Reinos")
   - icon           ReactNode del icono junto al label
   - fallbackIcon   icono cuando una entidad no tiene imagen
   - emptyLabel     texto cuando no hay entidades disponibles
   - allEntities    lista completa de entidades { id, nombre, imagen_url? }
   - selectedIds    ids actualmente seleccionados
   - loading        mostrar spinner de carga
   - saving         mostrar spinner de guardado junto al label
   - onToggle       callback(id, add: boolean)
   - onEntityClick  callback al hacer click en una entidad seleccionada
   ───────────────────────────────────────────────────────────────────────────── */

type EntidadBase = {
  id: string;
  nombre: string;
  imagen_url?: string | null;
};

type SeccionEntidadProps = {
  label: string;
  icon: React.ReactNode;
  fallbackIcon: React.ReactNode;
  emptyLabel: string;
  /** No se usa en la UI pero se mantiene por compatibilidad */
  capId?: string;
  allEntities: EntidadBase[];
  selectedIds: string[];
  loading: boolean;
  saving: boolean;
  onToggle: (id: string, add: boolean) => void;
  onEntityClick?: (id: string) => void;
};

export const SeccionEntidad = ({
  label,
  icon,
  fallbackIcon,
  emptyLabel,
  allEntities,
  selectedIds,
  loading,
  saving,
  onToggle,
  onEntityClick,
}: SeccionEntidadProps) => {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const [cursor, setCursor] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLDivElement>(null);

  // ── Entidades ──────────────────────────────────────────────────────────────
  const selected  = allEntities.filter(e => selectedIds.includes(e.id));
  const available = allEntities.filter(e => !selectedIds.includes(e.id));

  // ── Filtrado por búsqueda (sobre todas las entidades, marcando las ya seleccionadas) ─
  const filtered = useMemo(() => {
    const pool = allEntities; // buscamos sobre todas para poder des-seleccionar también
    if (!query.trim()) return pool;
    const q = query.toLowerCase();
    return pool
      .filter(e =>
        e.nombre.toLowerCase().startsWith(q) ||
        e.nombre.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aS = a.nombre.toLowerCase().startsWith(q);
        const bS = b.nombre.toLowerCase().startsWith(q);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        return 0;
      });
  }, [allEntities, query]);

  // ── Cerrar al click fuera ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setCursor(-1);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // ── Focus al abrir ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery("");
      setCursor(-1);
    }
  }, [open]);

  // ── Scroll del cursor ─────────────────────────────────────────────────────
  useEffect(() => {
    if (cursor < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback((id: string) => {
    const add = !selectedIds.includes(id);
    onToggle(id, add);
    setQuery("");
    setCursor(-1);
    inputRef.current?.focus();
  }, [selectedIds, onToggle]);

  // ── Teclado ───────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const max = filtered.length - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const idx = cursor < 0 ? 0 : cursor;
      const item = filtered[idx];
      if (item) toggle(item.id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ── Estilos reutilizables ─────────────────────────────────────────────────
  const border      = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";
  const borderFocus = "1px solid color-mix(in srgb, var(--primary) 28%, transparent)";

  return (
    <div className="shrink-0 flex flex-col" ref={containerRef}>

      {/* ── Cabecera ── */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
      >
        <span
          className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"
          style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}
        >
          {icon}
          {label}
          {saving && <Loader2 size={8} className="animate-spin opacity-50" />}
        </span>

        {/* Trigger del mini-combo */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          title={`Añadir ${label.toLowerCase()}`}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md transition-all"
          style={{
            border: open ? borderFocus : border,
            background: open
              ? "color-mix(in srgb, var(--primary) 6%, transparent)"
              : "transparent",
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          {/* Contador de seleccionados */}
          {selectedIds.length > 0 && (
            <span
              className="text-[7px] font-black tabular-nums"
              style={{ color: "var(--primary)" }}
            >
              {selectedIds.length}
            </span>
          )}
          <ChevronDown
            size={9}
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* ── Dropdown mini-combo ── */}
      {open && (
        <div
          className="mx-2 mb-1.5 rounded-lg overflow-hidden"
          style={{
            border: borderFocus,
            background: "var(--bg-main)",
            boxShadow: "0 6px 20px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Búsqueda */}
          <div
            className="flex items-center gap-1.5 px-2 py-1.5"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }}
          >
            <Search
              size={9}
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setCursor(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar…"
              className="flex-1 bg-transparent outline-none text-[9px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal placeholder:opacity-50"
              style={{
                color: "var(--primary)",
                caretColor: "var(--primary)",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setCursor(-1); inputRef.current?.focus(); }}
                className="opacity-30 hover:opacity-70 transition-opacity"
              >
                <X size={8} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-36 overflow-y-auto" ref={listRef}>
            {loading ? (
              <div className="flex items-center justify-center py-3 text-primary/20">
                <Loader2 size={11} className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-[8px] font-black uppercase text-primary/25 px-3 py-2.5 text-center tracking-widest">
                {query ? `Sin resultados` : emptyLabel}
              </p>
            ) : (
              filtered.map((e, i) => {
                const sel       = selectedIds.includes(e.id);
                const isCursor  = cursor === i;
                return (
                  <button
                    key={e.id}
                    type="button"
                    data-idx={i}
                    onClick={() => toggle(e.id)}
                    onMouseEnter={() => setCursor(i)}
                    onMouseLeave={() => setCursor(-1)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-all"
                    style={{
                      background: isCursor
                        ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                        : "transparent",
                      color: sel
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 50%, transparent)",
                    }}
                  >
                    {/* Avatar / imagen */}
                    {e.imagen_url ? (
                      <img
                        src={e.imagen_url}
                        alt={e.nombre}
                        className="w-4 h-4 rounded-full shrink-0 object-cover border"
                        style={{
                          borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                          background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                        }}
                      />
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[6px] font-black uppercase"
                        style={{
                          background: sel
                            ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                            : "color-mix(in srgb, var(--primary) 8%, transparent)",
                          color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                        }}
                      >
                        {e.nombre.charAt(0)}
                      </div>
                    )}

                    <span className="flex-1 min-w-0 text-[9px] font-black uppercase tracking-wide truncate">
                      {e.nombre}
                    </span>

                    {sel && (
                      <Check
                        size={9}
                        className="shrink-0"
                        style={{ color: "var(--primary)" }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pie de teclado */}
          <div
            className="flex items-center gap-2 px-2.5 py-1"
            style={{
              borderTop: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
              background: "color-mix(in srgb, var(--primary) 2%, transparent)",
            }}
          >
            {[
              { key: "↑↓", label: "nav" },
              { key: "Tab", label: "sel" },
              { key: "Esc", label: "cerrar" },
            ].map(({ key, label: kl }) => (
              <span key={key} className="flex items-center gap-0.5">
                <kbd
                  className="text-[6px] font-black uppercase px-1 py-0.5 rounded"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  }}
                >
                  {key}
                </kbd>
                <span
                  className="text-[6px] font-bold uppercase tracking-wider"
                  style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
                >
                  {kl}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Entidades seleccionadas ── */}
      {selected.length === 0 ? (
        <div className="flex items-center gap-2 px-3 py-2" style={{ opacity: 0.35 }}>
          <span style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            {fallbackIcon}
          </span>
          <p
            className="text-[8px] font-black uppercase tracking-widest"
            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            {emptyLabel}
          </p>
        </div>
      ) : (
        selected.map(e => (
          <div
            key={e.id}
            onClick={() => onEntityClick?.(e.id)}
            className="group flex items-center gap-2 px-3 py-1.5 transition-all hover:bg-primary/5"
            style={{ cursor: onEntityClick ? "pointer" : "default" }}
          >
            {e.imagen_url ? (
              <img
                src={e.imagen_url}
                alt={e.nombre}
                className="w-5 h-5 rounded-full shrink-0 object-cover"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              />
            ) : (
              <div
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[7px] font-black uppercase"
                style={{
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 60%, transparent)",
                }}
              >
                {e.nombre.charAt(0)}
              </div>
            )}
            <span
              className="flex-1 min-w-0 text-[10px] font-black uppercase tracking-wide truncate"
              style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}
            >
              {e.nombre}
            </span>
            <button
              type="button"
              onClick={ev => { ev.stopPropagation(); onToggle(e.id, false); }}
              title="Quitar"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-red-500/10"
              style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
            >
              <X size={9} />
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default SeccionEntidad;
