"use client";

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Search, X, Check, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { normalize } from "@/components/layout/EstudioTemplates";

async function loreReadRelaciones(
  tabla: string,
  personajeId: string,
  foreignKey: string
): Promise<string[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    // Ajustado para buscar dinámicamente tanto por personaje_id como por criatura_id
    const searchKey = t.schema.indexes.some((i: any) => i.name === "personaje_id") 
      ? "personaje_id" 
      : "criatura_id";
      
    const rows = await t.where(searchKey).equals(personajeId).toArray();
    return rows.map((r: any) => r[foreignKey]);
  } catch {
    return [];
  }
}

async function loreSyncRelaciones(
  tabla: string,
  personajeId: string,
  foreignKey: string,
  remoteIds: string[]
): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    const searchKey = t.schema.indexes.some((i: any) => i.name === "personaje_id") 
      ? "personaje_id" 
      : "criatura_id";

    await t.where(searchKey).equals(personajeId).delete();
    for (const id of remoteIds) {
      await t.put({ [searchKey]: personajeId, [foreignKey]: id });
    }
  } catch (e) {
    console.error(`Error sincronizando relaciones locales en ${tabla}:`, e);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   SeccionHechizos
   ─────────────────────────────────────────────────────────────────────────────
   Sección de barra lateral (~180px) para hechizos asignados a un personaje
   o criatura. Mismo diseño que SeccionEntidad (trigger compacto en cabecera,
   dropdown inline con búsqueda + flechas + Tab) pero con la lógica completa
   de BloqueHechizos: cache singleton, Dexie, compatibilidad por grupoIds y
   portal para escapar de overflow-hidden cuando sea necesario.

   Props:
   - personajeId   id del personaje / criatura propietario
   - grupoIds      ids de grupos a los que pertenece (filtro de compatibilidad)
   - onHechizoClic callback al hacer click en un hechizo asignado (navegar)
   ───────────────────────────────────────────────────────────────────────────── */

// ─── Types ────────────────────────────────────────────────────────────────────

type HechizoCatalogo = {
  id: string;
  nombre: string;
  grupo_ids?: string[];
};

// ─── Helpers Dexie ────────────────────────────────────────────────────────────

async function dexieReadHechizos(): Promise<HechizoCatalogo[]> {
  try {
    if (!db) return [];
    const rows = await db.hechizos.orderBy("nombre").toArray();
    return rows.filter(r => !(r as any).deleted) as HechizoCatalogo[];
  } catch {
    return [];
  }
}

async function dexieWriteHechizos(rows: HechizoCatalogo[]): Promise<void> {
  try {
    if (!db || rows.length === 0) return;
    await db.hechizos.bulkPut(rows as any);
    const remoteIds = new Set(rows.map(r => r.id));
    const allLocal  = await db.hechizos.toArray();
    const toDelete  = allLocal.map(r => r.id).filter(id => !remoteIds.has(id));
    if (toDelete.length > 0) await db.hechizos.bulkDelete(toDelete);
  } catch {}
}

// ─── Cache singleton del catálogo ─────────────────────────────────────────────

let _catalogPromise: Promise<HechizoCatalogo[]> | null = null;
let _catalogData:    HechizoCatalogo[] | null = null;

async function fetchCatalogo(): Promise<HechizoCatalogo[]> {
  if (_catalogData)    return _catalogData;
  if (_catalogPromise) return _catalogPromise;

  _catalogPromise = (async () => {
    // 1. Dexie (sin red)
    const local = await dexieReadHechizos();
    if (local.length > 0) {
      _catalogData = local;
      // Refrescar en background
      if (navigator.onLine) {
        supabase
          .from("hechizos")
          .select("id, nombre, grupo_ids")
          .order("nombre")
          .then(({ data }) => {
            if (data && data.length > 0) {
              _catalogData = data as HechizoCatalogo[];
              dexieWriteHechizos(_catalogData);
            }
          });
      }
      return local;
    }

    // 2. Fetch remoto (primera vez)
    if (!navigator.onLine) return [];
    const { data } = await supabase
      .from("hechizos")
      .select("id, nombre, grupo_ids")
      .order("nombre");
    const result = (data ?? []) as HechizoCatalogo[];
    _catalogData = result;
    await dexieWriteHechizos(result);
    return result;
  })().finally(() => { _catalogPromise = null; });

  return _catalogPromise;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useHechizos(personajeId: string) {
  const [hechizos, setHechizos] = useState<HechizoCatalogo[]>(_catalogData ?? []);
  const [ids,      setIds]      = useState<string[]>([]);
  const [loading,  setLoading]  = useState(_catalogData === null);

  const load = useCallback(async () => {
    if (!_catalogData) setLoading(true);

    const localIdsPromise = loreReadRelaciones(
      "personaje_hechizos", personajeId, "hechizo_id"
    ).catch(() => [] as string[]);

    const [catalogResult, localIds] = await Promise.all([
      fetchCatalogo(),
      localIdsPromise,
    ]);

    setHechizos(catalogResult);
    if (localIds.length > 0) setIds(localIds);

    if (navigator.onLine) {
      const { data } = await supabase
        .from("personaje_hechizos")
        .select("hechizo_id")
        .eq("personaje_id", personajeId);
      const remoteIds = (data ?? []).map((r: any) => r.hechizo_id as string);
      setIds(remoteIds);
      await loreSyncRelaciones(
        "personaje_hechizos", personajeId, "hechizo_id", remoteIds
      );
    }

    setLoading(false);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (id: string) => {
    setIds(prev => {
      const next = [...prev, id];
      loreSyncRelaciones("personaje_hechizos", personajeId, "hechizo_id", next);
      return next;
    });
    await supabase
      .from("personaje_hechizos")
      .insert({ personaje_id: personajeId, hechizo_id: id });
  }, [personajeId]);

  const remove = useCallback(async (id: string) => {
    setIds(prev => {
      const next = prev.filter(x => x !== id);
      loreSyncRelaciones("personaje_hechizos", personajeId, "hechizo_id", next);
      return next;
    });
    await supabase
      .from("personaje_hechizos")
      .delete()
      .eq("personaje_id", personajeId)
      .eq("hechizo_id", id);
  }, [personajeId]);

  return { hechizos, ids, loading, add, remove };
}

// ─── Compatibilidad ───────────────────────────────────────────────────────────

function esCompatible(h: HechizoCatalogo, grupoIds: string[]): boolean {
  const gids = h.grupo_ids ?? [];
  if (gids.length === 0) return true;
  if (grupoIds.length === 0) return false;
  return gids.some(gid => grupoIds.includes(gid));
}

// ─── Dropdown portal ──────────────────────────────────────────────────────────
// Usa createPortal para escapar de cualquier overflow-hidden del padre.

function DropdownPortal({
  anchorRef,
  query,
  onQueryChange,
  filtrados,
  asignados,
  loading,
  onSelect,
  onClose,
  inputRef,
  listRef,
  cursor,
  setCursor,
  onKeyDown,
}: {
  anchorRef:     React.RefObject<HTMLDivElement | null>;
  query:         string;
  onQueryChange: (q: string) => void;
  filtrados:     HechizoCatalogo[];
  asignados:     HechizoCatalogo[];
  loading:       boolean;
  onSelect:      (h: HechizoCatalogo) => void;
  onClose:       () => void;
  inputRef:      React.RefObject<HTMLInputElement | null>;
  listRef:       React.RefObject<HTMLDivElement | null>;
  cursor:        number;
  setCursor:     (i: number) => void;
  onKeyDown:     (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   r.bottom + window.scrollY + 4,
        left:  r.left   + window.scrollX,
        width: r.width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  // Cerrar al click fuera
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [anchorRef, onClose]);

  // Focus al input al montar
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [inputRef]);

  // Scroll del cursor
  useEffect(() => {
    if (cursor < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-idx="${cursor}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, listRef]);

  const border      = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";
  const borderFocus = "1px solid color-mix(in srgb, var(--primary) 28%, transparent)";

  return createPortal(
    <div
      style={{
        position:   "absolute",
        top:        pos.top,
        left:       pos.left,
        width:      Math.max(pos.width, 180),
        zIndex:     9999,
        border:     borderFocus,
        background: "var(--bg-main)",
        boxShadow:  "0 6px 20px color-mix(in srgb, var(--primary) 10%, transparent)",
        borderRadius: "0.5rem",
        overflow:   "hidden",
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
            onChange={e => { onQueryChange(e.target.value); setCursor(-1); }}
            onKeyDown={onKeyDown}
            placeholder="Buscar hechizo…"
            className="flex-1 bg-transparent outline-none text-[9px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal placeholder:opacity-50"
            style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => { onQueryChange(""); setCursor(-1); inputRef.current?.focus(); }}
              className="opacity-30 hover:opacity-70 transition-opacity"
            >
              <X size={8} style={{ color: "var(--primary)" }} />
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-40 overflow-y-auto" ref={listRef}>
          {loading ? (
            <div className="flex items-center justify-center py-3 text-primary/20">
              <Loader2 size={11} className="animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <p className="text-[8px] font-black uppercase text-primary/25 px-3 py-2.5 text-center tracking-widest">
              {asignados.length > 0
                ? "Todos los compatibles asignados"
                : "Sin hechizos compatibles"}
            </p>
          ) : (
            filtrados.map((h, i) => {
              const isCursor = cursor === i;
              return (
                <button
                  key={h.id}
                  type="button"
                  data-idx={i}
                  onMouseDown={() => onSelect(h)}
                  onMouseEnter={() => setCursor(i)}
                  onMouseLeave={() => setCursor(-1)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-all"
                  style={{
                    background: isCursor
                      ? "color-mix(in srgb, var(--primary) 6%, transparent)"
                      : "transparent",
                    color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                  }}
                >
                  {/* Icono Sparkles pequeño como sustituto de avatar */}
                  <div
                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                    }}
                  >
                    <Sparkles size={7} style={{ color: "color-mix(in srgb, var(--accent) 70%, transparent)" }} />
                  </div>
                  <span className="flex-1 min-w-0 text-[9px] font-black uppercase tracking-wide truncate">
                    {h.nombre}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Pie de teclado */}
        <div
          className="flex items-center gap-2 px-2.5 py-1"
          style={{
            borderTop:  "1px solid color-mix(in srgb, var(--primary) 6%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          {[
            { key: "↑↓", label: "nav"    },
            { key: "Tab", label: "sel"    },
            { key: "Esc", label: "cerrar" },
          ].map(({ key, label }) => (
            <span key={key} className="flex items-center gap-0.5">
              <kbd
                className="text-[6px] font-black uppercase px-1 py-0.5 rounded"
                style={{
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color:      "color-mix(in srgb, var(--primary) 40%, transparent)",
                  border:     "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                {key}
              </kbd>
              <span
                className="text-[6px] font-bold uppercase tracking-wider"
                style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
              >
                {label}
              </span>
            </span>
          ))}
        </div>
    </div>,
    document.body
  );
}

// ─── SeccionHechizos ──────────────────────────────────────────────────────────

export function SeccionHechizos({
  personajeId,
  grupoIds = [],
  onHechizoClic,
}: {
  personajeId:    string;
  grupoIds?:      string[];
  onHechizoClic?: (id: string) => void;
}) {
  const { hechizos, ids, loading, add, remove } = useHechizos(personajeId);

  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState("");
  const [cursor, setCursor] = useState(-1);

  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Hechizos compatibles con los grupos de la entidad ──────────────────────
  const compatibles = useMemo(
    () => hechizos.filter(h => esCompatible(h, grupoIds)),
    [hechizos, grupoIds]
  );

  const asignados   = compatibles.filter(h => ids.includes(h.id));
  const disponibles = compatibles.filter(h => !ids.includes(h.id));

  const filtrados = useMemo(() => {
    if (!query.trim()) return disponibles;
    const q = normalize(query);
    return disponibles
      .filter(h => normalize(h.nombre).includes(q))
      .sort((a, b) => {
        const aN = normalize(a.nombre);
        const bN = normalize(b.nombre);
        const aS = aN.startsWith(q);
        const bS = bN.startsWith(q);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        return 0;
      });
  }, [disponibles, query]);

  // ── Cerrar el dropdown ─────────────────────────────────────────────────────
  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(-1);
  }, []);

  // ── Seleccionar un hechizo del dropdown ────────────────────────────────────
  const handleSelect = useCallback((h: HechizoCatalogo) => {
    add(h.id);
    setQuery("");
    setCursor(-1);
    // Mantener abierto para poder añadir más
  }, [add]);

  // ── Navegación por teclado ─────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    const max = filtrados.length - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      const idx  = cursor < 0 ? 0 : cursor;
      const item = filtrados[idx];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  }, [open, filtrados, cursor, handleSelect, closeDropdown]);

  const border      = "1px solid color-mix(in srgb, var(--primary) 12%, transparent)";
  const borderFocus = "1px solid color-mix(in srgb, var(--primary) 28%, transparent)";
  const sinGrupos   = grupoIds.length === 0;

  return (
    <div className="shrink-0 flex flex-col">

      {/* ── Cabecera ── */}
      <div
        ref={anchorRef}
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" }}
      >
        {/* Label */}
        <span
          className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest"
          style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}
        >
          <Sparkles size={9} style={{ color: "color-mix(in srgb, var(--accent) 60%, transparent)" }} />
          Hechizos
          {loading && <Loader2 size={8} className="animate-spin opacity-40" />}
        </span>

        {/* Trigger compacto */}
        <button
          type="button"
          onClick={() => {
            if (sinGrupos || loading) return;
            setOpen(o => !o);
          }}
          title={
            sinGrupos ? "Asigna grupos primero para ver hechizos compatibles"
            : loading  ? "Cargando…"
            : "Añadir hechizo"
          }
          disabled={sinGrupos || loading}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            border:     open ? borderFocus : border,
            background: open
              ? "color-mix(in srgb, var(--accent) 8%, transparent)"
              : "transparent",
            color: open
              ? "color-mix(in srgb, var(--accent) 70%, transparent)"
              : "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          {/* Contador */}
          {asignados.length > 0 && (
            <span
              className="text-[7px] font-black tabular-nums"
              style={{ color: "color-mix(in srgb, var(--accent) 80%, var(--primary))" }}
            >
              {asignados.length}
            </span>
          )}
          <ChevronDown
            size={9}
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* ── Dropdown portal ── */}
      {open && typeof window !== "undefined" && (
        <DropdownPortal
          anchorRef={anchorRef}
          query={query}
          onQueryChange={setQuery}
          filtrados={filtrados}
          asignados={asignados}
          loading={loading}
          onSelect={handleSelect}
          onClose={closeDropdown}
          inputRef={inputRef}
          listRef={listRef}
          cursor={cursor}
          setCursor={setCursor}
          onKeyDown={handleKeyDown}
        />
      )}

      {/* ── Hechizos asignados ── */}
      {asignados.length === 0 ? (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ opacity: 0.35 }}
        >
          <Sparkles size={10} style={{ color: "color-mix(in srgb, var(--accent) 50%, transparent)" }} />
          <p
            className="text-[8px] font-black uppercase tracking-widest"
            style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
          >
            {sinGrupos ? "Sin grupos" : "Sin hechizos"}
          </p>
        </div>
      ) : (
        asignados.map(h => (
          <div
            key={h.id}
            onClick={() => onHechizoClic?.(h.id)}
            className="group flex items-center gap-2 px-3 py-1.5 transition-all hover:bg-primary/5"
            style={{ cursor: onHechizoClic ? "pointer" : "default" }}
          >
            {/* Icono acento */}
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
            >
              <Sparkles
                size={9}
                style={{ color: "color-mix(in srgb, var(--accent) 65%, transparent)" }}
              />
            </div>

            <span
              className="flex-1 min-w-0 text-[10px] font-black uppercase tracking-wide truncate"
              style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}
            >
              {h.nombre}
            </span>

            <button
              type="button"
              onClick={ev => { ev.stopPropagation(); remove(h.id); }}
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
}

export default SeccionHechizos;
