"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { normalize } from "@/components/templates/EstudioTemplates";
import { loreReadRelaciones, loreSyncRelaciones } from "@/lib/api/client/loreDb";

// ─── Types locales ─────────────────────────────────────────────────────────────
type DonCatalogo = {
  id: string;
  nombre: string;
  grupo_ids?: string[];
};

// ─── Helpers Dexie ────────────────────────────────────────────────────────────
async function dexieReadDones(): Promise<DonCatalogo[]> {
  try {
    if (!db) return [];
    const rows = await db.dones.orderBy("nombre").toArray();
    return rows.filter(r => !(r as any).deleted) as DonCatalogo[];
  } catch {
    return [];
  }
}

async function dexieWriteDones(rows: DonCatalogo[]): Promise<void> {
  try {
    if (!db || rows.length === 0) return;
    await db.dones.bulkPut(rows as any);
    // Limpiar filas que ya no existen en remoto
    const remoteIds = new Set(rows.map(r => r.id));
    const allLocal = await db.dones.toArray();
    const toDelete = allLocal.map(r => r.id).filter(id => !remoteIds.has(id));
    if (toDelete.length > 0) await db.dones.bulkDelete(toDelete);
  } catch (e) {
    console.warn("[BloqueDones] dexieWriteDones failed:", e);
  }
}

// ─── Cache del catálogo (singleton en módulo) ─────────────────────────────────
// Evita re-fetches si ya hay una promesa en vuelo o datos en memoria.
let _catalogPromise: Promise<DonCatalogo[]> | null = null;
let _catalogData:    DonCatalogo[] | null = null;

async function fetchCatalogo(): Promise<DonCatalogo[]> {
  // 1. Memoria: instantáneo, sin I/O
  if (_catalogData) return _catalogData;

  // 2. Si ya hay un fetch en vuelo, compartirlo
  if (_catalogPromise) return _catalogPromise;

  _catalogPromise = (async () => {
    // 3. Dexie (IndexedDB): muy rápido, sin red
    const local = await dexieReadDones();
    if (local.length > 0) {
      _catalogData = local;
      // Refrescar en background desde Supabase sin bloquear
      if (navigator.onLine) {
        supabase
          .from("dones")
          .select("id, nombre, grupo_ids")
          .order("nombre")
          .then(({ data }) => {
            if (data && data.length > 0) {
              _catalogData = data as DonCatalogo[];
              dexieWriteDones(_catalogData);
            }
          });
      }
      return local;
    }

    // 4. Fetch remoto (primera vez, sin caché local)
    if (!navigator.onLine) return [];

    const { data } = await supabase
      .from("dones")
      .select("id, nombre, grupo_ids")
      .order("nombre");

    const result = (data ?? []) as DonCatalogo[];
    _catalogData = result;
    await dexieWriteDones(result);
    return result;
  })().finally(() => {
    _catalogPromise = null;
  });

  return _catalogPromise;
}

// ─── Hook unificado: catálogo + don asignado en paralelo ─────────────────────
function useDones(personajeId: string) {
  const [dones,   setDones]   = useState<DonCatalogo[]>(_catalogData ?? []);
  const [donId,   setDonId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(_catalogData === null); // si ya hay datos en memoria, no mostrar spinner

  const load = useCallback(async () => {
    // Si ya tenemos el catálogo en memoria, no mostramos spinner para él
    if (!_catalogData) setLoading(true);

    // ── Leer caché local de Dexie para el don asignado (sin bloquear) ─────────
    // Esto permite mostrar el valor ya guardado mientras llegan los fetches remotos
    const localDonPromise = loreReadRelaciones("personaje_dones", personajeId, "don_id")
      .then((ids) => ids[0] ?? null)
      .catch(() => null);

    // ── Lanzar catálogo y don asignado en PARALELO ────────────────────────────
    const [catalogResult, localDonId] = await Promise.all([
      fetchCatalogo(),
      localDonPromise,
    ]);

    setDones(catalogResult);

    // Mostrar el valor local de inmediato si existe
    if (localDonId) {
      setDonId(localDonId);
      setLoading(false);
    }

    // Fetch remoto del don asignado (solo si hay conexión)
    if (navigator.onLine) {
      const { data } = await supabase
        .from("personaje_dones")
        .select("don_id")
        .eq("personaje_id", personajeId)
        .limit(1)
        .maybeSingle();

      const remoteId = data?.don_id ?? null;
      setDonId(remoteId);

      // Sincronizar Dexie con remoto
      await loreSyncRelaciones(
        "personaje_dones",
        personajeId,
        "don_id",
        remoteId ? [remoteId] : [],
      );
    }

    setLoading(false);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const assign = async (id: string) => {
    setDonId(id); // optimista
    await loreSyncRelaciones("personaje_dones", personajeId, "don_id", [id]);
    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
    await supabase.from("personaje_dones").insert({ personaje_id: personajeId, don_id: id });
  };

  const clear = async () => {
    setDonId(null); // optimista
    await loreSyncRelaciones("personaje_dones", personajeId, "don_id", []);
    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
  };

  return { dones, donId, loading, assign, clear };
}

// ─── Lógica de compatibilidad ─────────────────────────────────────────────────
function esCompatible(don: DonCatalogo, grupoIdsDeCriatura: string[]): boolean {
  const grupoIds = don.grupo_ids ?? [];
  if (grupoIds.length === 0) return true;
  if (grupoIdsDeCriatura.length === 0) return false;
  return grupoIds.some(gid => grupoIdsDeCriatura.includes(gid));
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function BloqueDones({ personajeId, grupoIds = [] }: {
  personajeId: string;
  grupoIds?: string[];
}) {
  const { dones, donId, loading, assign, clear } = useDones(personajeId);
  const [editing, setEditing] = useState(false);
  const [input,   setInput]   = useState("");
  const [open,    setOpen]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ref      = useRef<HTMLDivElement>(null);

  const sinGrupos = grupoIds.length === 0;

  const compatibles = useMemo(
    () => dones.filter(d => esCompatible(d, grupoIds)),
    [dones, grupoIds]
  );

  const donActual   = compatibles.find(d => d.id === donId) ?? null;
  const disponibles = compatibles.filter(d => d.id !== donId);

  const filtrados = useMemo(
    () => disponibles.filter(d => normalize(d.nombre).includes(normalize(input))),
    [disponibles, input]
  );

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setEditing(false);
        setOpen(false);
        setInput("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing]);

  const startEdit = () => {
    if (sinGrupos || loading) return;
    setInput("");
    setEditing(true);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Don</label>

      {editing ? (
        /* ── Modo edición: input + dropdown ── */
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === "Escape") { setEditing(false); setOpen(false); setInput(""); }
            }}
            placeholder="Buscar don…"
            className="w-full px-2.5 py-1.5 rounded-xl text-[11px] font-medium border outline-none transition-all pr-7"
            style={{
              background:   "color-mix(in srgb, var(--primary) 4%, transparent)",
              borderColor:  "color-mix(in srgb, var(--primary) 30%, transparent)",
              color:        "var(--primary)",
            }}
          />
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setEditing(false); setOpen(false); setInput(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
          >
            <X size={10} />
          </button>

          {open && filtrados.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {donActual && (
                <button
                  onMouseDown={e => { e.preventDefault(); clear(); setEditing(false); setOpen(false); }}
                  className="w-full px-3 py-2 text-left text-[10px] font-bold text-red-400/60 hover:text-red-400 hover:bg-red-400/5 transition-colors border-b border-primary/8 italic"
                >
                  Quitar don
                </button>
              )}
              {filtrados.map(d => (
                <button key={d.id}
                  onMouseDown={() => { assign(d.id); setInput(""); setEditing(false); setOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-primary/8 hover:text-primary ${d.id === donId ? "text-primary bg-primary/5" : "text-primary/70"}`}>
                  {d.nombre}
                </button>
              ))}
            </div>
          )}

          {open && filtrados.length === 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-2.5">
              <p className="text-[9px] text-primary/25 text-center italic">Sin dones compatibles</p>
            </div>
          )}
        </div>

      ) : donActual ? (
        /* ── Modo display: chip + botón lápiz + botón quitar ── */
        <div className="flex items-center gap-1">
          <div
            className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border"
            style={{
              background:  "color-mix(in srgb, var(--primary) 5%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              color:       "var(--primary)",
            }}
          >
            {loading
              ? <Loader2 size={9} className="animate-spin text-primary/30" />
              : <span className="truncate flex-1">{donActual.nombre}</span>
            }
          </div>
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border border-transparent text-primary/25 hover:text-primary hover:bg-primary/8 hover:border-primary/15 transition-all"
            title="Cambiar don"
          >
            <Pencil size={9} />
          </button>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border border-transparent text-primary/25 hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/15 transition-all"
            title="Quitar don"
          >
            <X size={9} />
          </button>
        </div>

      ) : (
        /* ── Modo vacío: placeholder como botón ── */
        <button
          type="button"
          onClick={startEdit}
          disabled={sinGrupos || loading}
          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-left transition-all border border-dashed disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            color:       "color-mix(in srgb, var(--primary) 25%, transparent)",
          }}
        >
          <Pencil size={9} className="opacity-50" />
          <span className="italic">
            {loading ? "Cargando…" : sinGrupos ? "Sin grupos…" : "Elegir don…"}
          </span>
        </button>
      )}
    </div>
  );
}