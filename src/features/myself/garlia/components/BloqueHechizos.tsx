"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";

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

// ─── Types locales ─────────────────────────────────────────────────────────────
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
    // Limpiar filas que ya no existen en remoto
    const remoteIds = new Set(rows.map(r => r.id));
    const allLocal = await db.hechizos.toArray();
    const toDelete = allLocal.map(r => r.id).filter(id => !remoteIds.has(id));
    if (toDelete.length > 0) await db.hechizos.bulkDelete(toDelete);
  } catch (e) {
    console.warn("[BloqueHechizos] dexieWriteHechizos failed:", e);
  }
}

// ─── Cache del catálogo (singleton en módulo) ─────────────────────────────────
let _catalogPromise: Promise<HechizoCatalogo[]> | null = null;
let _catalogData:    HechizoCatalogo[] | null = null;

async function fetchCatalogo(): Promise<HechizoCatalogo[]> {
  // 1. Memoria: instantáneo
  if (_catalogData) return _catalogData;

  // 2. Promesa en vuelo: compartirla
  if (_catalogPromise) return _catalogPromise;

  _catalogPromise = (async () => {
    // 3. Dexie (IndexedDB): rápido, sin red, sin TTL
    const local = await dexieReadHechizos();
    if (local.length > 0) {
      _catalogData = local;
      // Refrescar en background sin bloquear
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

    // 4. Fetch remoto (primera vez, Dexie vacío)
    if (!navigator.onLine) return [];

    const { data } = await supabase
      .from("hechizos")
      .select("id, nombre, grupo_ids")
      .order("nombre");

    const result = (data ?? []) as HechizoCatalogo[];
    _catalogData = result;
    await dexieWriteHechizos(result);
    return result;
  })().finally(() => {
    _catalogPromise = null;
  });

  return _catalogPromise;
}

// ─── Hook unificado: catálogo + hechizos asignados en paralelo ───────────────
function useHechizos(personajeId: string) {
  const [hechizos, setHechizos] = useState<HechizoCatalogo[]>(_catalogData ?? []);
  const [ids,      setIds]      = useState<string[]>([]);
  const [loading,  setLoading]  = useState(_catalogData === null);

  const load = useCallback(async () => {
    if (!_catalogData) setLoading(true);

    // Leer Dexie local para los hechizos asignados (sin bloquear)
    const localIdsPromise = loreReadRelaciones("personaje_hechizos", personajeId, "hechizo_id")
      .catch(() => [] as string[]);

    // Catálogo + asignados locales en paralelo
    const [catalogResult, localIds] = await Promise.all([
      fetchCatalogo(),
      localIdsPromise,
    ]);

    setHechizos(catalogResult);
    if (localIds.length > 0) setIds(localIds);

    // Fetch remoto de asignados
    if (navigator.onLine) {
      const { data } = await supabase
        .from("personaje_hechizos")
        .select("hechizo_id")
        .eq("personaje_id", personajeId);

      const remoteIds = (data ?? []).map((r: any) => r.hechizo_id as string);
      setIds(remoteIds);
      await loreSyncRelaciones("personaje_hechizos", personajeId, "hechizo_id", remoteIds);
    }

    setLoading(false);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (id: string) => {
    setIds(prev => {
      const next = [...prev, id];
      // Sincronizar Dexie con el nuevo estado
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

// ─── Lógica de compatibilidad ──────────────────────────────────────────────────
function esCompatible(hechizo: HechizoCatalogo, grupoIdsDeCriatura: string[]): boolean {
  const grupoIds = hechizo.grupo_ids ?? [];
  if (grupoIds.length === 0) return true;
  if (grupoIdsDeCriatura.length === 0) return false;
  return grupoIds.some(gid => grupoIdsDeCriatura.includes(gid));
}

// ─── Dropdown portal (escapa overflow-hidden del padre) ────────────────────────
type HItem = { id: string; nombre: string };

function DropdownHechizos({ anchorRef, disponibles, filtrados, asignados, onSelect, onClose }: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  disponibles: HItem[];
  filtrados: HItem[];
  asignados: HItem[];
  onSelect: (h: HItem) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  return (
    <div
      style={{ position: "absolute", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
      className="bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden"
    >
      {disponibles.length === 0 ? (
        <p className="px-3 py-2.5 text-[9px] text-primary/25 text-center italic">
          {asignados.length > 0 ? "Todos los hechizos compatibles asignados" : "Sin hechizos compatibles"}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {filtrados.map(h => (
            <button key={h.id}
              onMouseDown={() => onSelect(h)}
              className="w-full px-3 py-2 text-left text-xs font-medium text-primary/70 hover:bg-primary/8 hover:text-primary transition-colors">
              {h.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export function BloqueHechizos({ personajeId, grupoIds = [] }: {
  personajeId: string;
  grupoIds?: string[];
}) {
  const { hechizos, ids, loading, add, remove } = useHechizos(personajeId);
  const [input, setInput] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sinGrupos = grupoIds.length === 0;

  const compatibles = useMemo(
    () => hechizos.filter(h => esCompatible(h, grupoIds)),
    [hechizos, grupoIds]
  );

  const asignados   = compatibles.filter(h => ids.includes(h.id));
  const disponibles = compatibles.filter(h => !ids.includes(h.id));

  const filtrados = useMemo(
    () => disponibles.filter(h => normalize(h.nombre).includes(normalize(input))),
    [disponibles, input]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Mostrar spinner solo si está cargando Y aún no hay nada que mostrar
  if (loading && hechizos.length === 0 && ids.length === 0) {
    return <Loader2 size={10} className="animate-spin text-primary/20" />;
  }

  return (
    <div className="space-y-2">
      {/* Hechizos asignados */}
      {asignados.length > 0 && (
        <div className="space-y-0.5 px-3 pt-2">
          {asignados.map(h => (
            <div key={h.id} className="flex items-center gap-2 group py-1">
              <span className="flex-1 text-xs font-medium text-primary/70 truncate">{h.nombre}</span>
              <button
                onClick={() => remove(h.id)}
                className="shrink-0 text-primary/25 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                title="Quitar hechizo"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input búsqueda */}
      <div className="p-2" ref={ref}>
        <div className="relative">
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            disabled={sinGrupos || loading}
            placeholder={
              loading    ? "Cargando…"
              : sinGrupos ? "Sin grupos…"
              : "Añadir hechizo…"
            }
            className={INPUT_CLS + " pr-8 disabled:opacity-40 disabled:cursor-not-allowed"}
          />
          <button type="button" onClick={() => !sinGrupos && setOpen(o => !o)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors">
            <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {open && typeof window !== "undefined" && createPortal(
          <DropdownHechizos
            anchorRef={ref}
            disponibles={disponibles}
            filtrados={filtrados}
            asignados={asignados}
            onSelect={h => { add(h.id); setInput(""); setOpen(false); }}
            onClose={() => setOpen(false)}
          />,
          document.body
        )}
      </div>
    </div>
  );
}