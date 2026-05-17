"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";
import {
  getCatalogCache,
  setCatalogCache,
  loreReadRelaciones,
  loreSyncRelaciones,
} from "@/lib/api/client/loreDb";

// ─── Types locales ─────────────────────────────────────────────────────────────
type DonCatalogo = {
  id: string;
  nombre: string;
  grupo_ids?: string[];
};

// ─── Hook: catálogo de dones (con session_cache) ──────────────────────────────
// Un solo fetch aunque haya varios BloqueDones montados al mismo tiempo.
const CACHE_KEY_DONES = "catalogo_dones";

function useCatalogo() {
  const [dones,   setDones]   = useState<DonCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // 1. Intentar session_cache (TTL 10 min)
      const cached = await getCatalogCache<DonCatalogo>(CACHE_KEY_DONES);
      if (cached && !cancelled) {
        setDones(cached);
        setLoading(false);
        // Aún así refrescamos en background si hay red
        if (!navigator.onLine) return;
      }

      if (!navigator.onLine) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("dones")
        .select("id, nombre, grupo_ids")
        .order("nombre");
      if (cancelled) return;

      const donesData = (data ?? []) as DonCatalogo[];
      setDones(donesData);
      setLoading(false);
      await setCatalogCache(CACHE_KEY_DONES, donesData);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { dones, loading };
}

// ─── Hook: don asignado al personaje (con caché local) ───────────────────────
function useAsignado(personajeId: string) {
  const [donId,   setDonId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // 1. Leer de Dexie primero (sin esperar red)
    const localIds = await loreReadRelaciones("personaje_dones", personajeId, "don_id");
    if (localIds.length) {
      setDonId(localIds[0]);
      setLoading(false);
    }

    // 2. Fetch remoto si hay conexión
    if (!navigator.onLine) {
      if (!localIds.length) setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("personaje_dones")
      .select("don_id")
      .eq("personaje_id", personajeId)
      .limit(1)
      .maybeSingle();

    const remoteId = data?.don_id ?? null;
    setDonId(remoteId);
    setLoading(false);

    // Sincronizar Dexie con remote
    await loreSyncRelaciones(
      "personaje_dones",
      personajeId,
      "don_id",
      remoteId ? [remoteId] : [],
    );
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const assign = async (id: string) => {
    // Optimistic
    setDonId(id);
    await loreSyncRelaciones("personaje_dones", personajeId, "don_id", [id]);

    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
    await supabase.from("personaje_dones").insert({ personaje_id: personajeId, don_id: id });
  };

  const clear = async () => {
    // Optimistic
    setDonId(null);
    await loreSyncRelaciones("personaje_dones", personajeId, "don_id", []);

    await supabase.from("personaje_dones").delete().eq("personaje_id", personajeId);
  };

  return { donId, loading, assign, clear };
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
  const { dones, loading: loadingCatalogo } = useCatalogo();
  const { donId, loading: loadingAsignado, assign, clear } = useAsignado(personajeId);
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
            {loadingCatalogo || loadingAsignado
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
              disabled={sinGrupos || loadingCatalogo || loadingAsignado}
              placeholder={
                loadingCatalogo || loadingAsignado ? "Cargando…"
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