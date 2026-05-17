"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
type HechizoCatalogo = {
  id: string;
  nombre: string;
  grupo_ids?: string[];
};

// ─── Hook: catálogo de hechizos (con session_cache) ───────────────────────────
// Un solo fetch aunque haya varios BloqueHechizos montados al mismo tiempo.
const CACHE_KEY_HECHIZOS = "catalogo_hechizos";

function useCatalogo() {
  const [hechizos, setHechizos] = useState<HechizoCatalogo[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // 1. Intentar session_cache (TTL 10 min)
      const cached = await getCatalogCache<HechizoCatalogo>(CACHE_KEY_HECHIZOS);
      if (cached && !cancelled) {
        setHechizos(cached);
        setLoading(false);
        if (!navigator.onLine) return;
      }

      if (!navigator.onLine) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("hechizos")
        .select("id, nombre, grupo_ids")
        .order("nombre");
      if (cancelled) return;

      const hechizosData = (data ?? []) as HechizoCatalogo[];
      setHechizos(hechizosData);
      setLoading(false);
      await setCatalogCache(CACHE_KEY_HECHIZOS, hechizosData);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { hechizos, loading };
}

// ─── Hook: hechizos asignados al personaje (con caché local) ──────────────────
function useAsignados(personajeId: string) {
  const [ids, setIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    // 1. Leer de Dexie primero (sin esperar red)
    const localIds = await loreReadRelaciones("personaje_hechizos", personajeId, "hechizo_id");
    if (localIds.length) setIds(localIds);

    // 2. Fetch remoto si hay conexión
    if (!navigator.onLine) return;

    const { data } = await supabase
      .from("personaje_hechizos")
      .select("hechizo_id")
      .eq("personaje_id", personajeId);

    const remoteIds = (data ?? []).map((r: any) => r.hechizo_id);
    setIds(remoteIds);

    // Sincronizar Dexie con remote
    await loreSyncRelaciones("personaje_hechizos", personajeId, "hechizo_id", remoteIds);
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const add = async (id: string) => {
    // Optimistic
    setIds(prev => [...prev, id]);
    await loreSyncRelaciones(
      "personaje_hechizos",
      personajeId,
      "hechizo_id",
      [...ids, id],
    );

    await supabase.from("personaje_hechizos").insert({ personaje_id: personajeId, hechizo_id: id });
  };

  const remove = async (id: string) => {
    // Optimistic
    const next = ids.filter(x => x !== id);
    setIds(next);
    await loreSyncRelaciones("personaje_hechizos", personajeId, "hechizo_id", next);

    await supabase.from("personaje_hechizos").delete()
      .eq("personaje_id", personajeId).eq("hechizo_id", id);
  };

  return { ids, add, remove };
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
    return () => { window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
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
  const { hechizos, loading } = useCatalogo();
  const { ids, add, remove } = useAsignados(personajeId);
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
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

  if (loading) return <Loader2 size={10} className="animate-spin text-primary/20" />;

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
            disabled={sinGrupos}
            placeholder={sinGrupos ? "Sin grupos…" : "Añadir hechizo…"}
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