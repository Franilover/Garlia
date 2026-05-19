"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";
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
  const [input, setInput] = useState("");
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Don</label>
      <div className="relative">
        {donActual ? (
          <div className={INPUT_CLS + " pr-8 flex items-center"}>
            {loading
              ? <Loader2 size={10} className="animate-spin text-primary/20" />
              : <span className="flex-1 text-xs font-medium text-primary/70 truncate">{donActual.nombre}</span>
            }
            <button
              onClick={clear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-red-400 transition-colors"
              title="Quitar don"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              disabled={sinGrupos || loading}
              placeholder={
                loading    ? "Cargando…"
                : sinGrupos ? "Sin grupos…"
                : "Buscar don…"
              }
              className={INPUT_CLS + " pr-8 disabled:opacity-40 disabled:cursor-not-allowed"}
            />
            <button
              type="button"
              onClick={() => !sinGrupos && setOpen(o => !o)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors"
            >
              <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && disponibles.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl px-3 py-2.5">
                <p className="text-[9px] text-primary/25 text-center italic">Sin dones compatibles</p>
              </div>
            )}

            {open && filtrados.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white-custom border border-primary/15 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                {filtrados.map(d => (
                  <button key={d.id}
                    onMouseDown={() => { assign(d.id); setInput(""); setOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-primary/70 hover:bg-primary/8 hover:text-primary transition-colors">
                    {d.nombre}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}