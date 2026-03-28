"use client";
/**
 * useEditorShared.tsx
 * Hooks y componentes compartidos entre editorLetras y editorCapitulos.
 *
 * Exporta:
 *  - usePersonajes()          → lista de personajes de Supabase (con caché Dexie)
 *  - useLastOpenedId(key)     → persiste el último id abierto en localStorage
 *  - useDraftRestore(...)     → guarda borradores locales y ofrece restaurar
 *  - DraftRestoreBanner       → banner visual de "hay borrador, ¿restaurar?"
 *  - SelectPersonaje          → <select> con lista de personajes
 *  - SelectIdioma             → <select> con ES / JP / EN
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { RotateCcw, X, Save, WifiOff } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export interface Personaje { id: string; nombre: string; }

// ─────────────────────────────────────────────────────────────────────────────
// usePersonajes — carga personajes con caché en Dexie
// ─────────────────────────────────────────────────────────────────────────────
export function usePersonajes() {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    // 1. Mostrar caché local inmediatamente
    (async () => {
      try {
        const table = (db as any)["personajes"];
        if (table) {
          const local: Personaje[] = await table.orderBy("nombre").toArray();
          if (local.length > 0) { setPersonajes(local); setLoading(false); }
        }
      } catch {}

      // 2. Fetch remoto
      if (!navigator.onLine) { setLoading(false); return; }
      try {
        const { data } = await supabase
          .from("personajes")
          .select("id, nombre")
          .order("nombre", { ascending: true });
        if (data) {
          setPersonajes(data as Personaje[]);
          // Actualizar caché
          try {
            const table = (db as any)["personajes"];
            if (table) await table.bulkPut(data);
          } catch {}
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return { personajes, loading };
}

// ─────────────────────────────────────────────────────────────────────────────
// useLastOpenedId — persiste el último id abierto por clave
// ─────────────────────────────────────────────────────────────────────────────
export function useLastOpenedId(storageKey: string): [string | null, (id: string | null) => void] {
  const [id, setIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(storageKey) || null;
  });

  const setId = useCallback((newId: string | null) => {
    setIdState(newId);
    if (typeof window === "undefined") return;
    if (newId) localStorage.setItem(storageKey, newId);
    else       localStorage.removeItem(storageKey);
  }, [storageKey]);

  return [id, setId];
}

// ─────────────────────────────────────────────────────────────────────────────
// useDraftRestore — guarda borrador local y detecta si hay uno pendiente
//
// Uso:
//   const draft = useDraftRestore({ key: `cap-draft-${capId}`, currentValue: contenido });
//   draft.save(texto);        // guardar borrador (llamar en cada cambio)
//   draft.clear();            // limpiar tras guardar en servidor
//   draft.hasDraft            // true si hay borrador más reciente que el servidor
//   draft.draftValue          // el texto del borrador
//   <DraftRestoreBanner draft={draft} onRestore={(v) => setContenido(v)} />
// ─────────────────────────────────────────────────────────────────────────────
interface DraftRestoreOptions {
  /** Clave única, ej: "cap-draft-abc123" */
  key: string;
  /** Valor actual cargado del servidor (para detectar si el borrador difiere) */
  serverValue: string;
  /** Desactivar si el id aún no existe */
  enabled?: boolean;
}

export interface DraftHandle {
  hasDraft:   boolean;
  draftValue: string;
  save:       (value: string) => void;
  clear:      () => void;
  dismiss:    () => void;
}

export function useDraftRestore({ key, serverValue, enabled = true }: DraftRestoreOptions): DraftHandle {
  const [draftValue,  setDraftValue]  = useState("");
  const [hasDraft,    setHasDraft]    = useState(false);
  const [dismissed,   setDismissed]   = useState(false);

  // Al montar o cambiar de key: leer borrador guardado
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    setDismissed(false);
    const raw = localStorage.getItem(key);
    if (!raw) { setHasDraft(false); setDraftValue(""); return; }
    try {
      const { value, ts } = JSON.parse(raw) as { value: string; ts: number };
      // Mostrar solo si difiere del valor del servidor
      if (value && value !== serverValue) {
        setDraftValue(value);
        setHasDraft(true);
      } else {
        setHasDraft(false);
        setDraftValue("");
      }
    } catch {
      setHasDraft(false);
    }
  }, [key, serverValue, enabled]);

  const save = useCallback((value: string) => {
    if (!enabled || typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));
  }, [key, enabled]);

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
    setHasDraft(false);
    setDraftValue("");
  }, [key]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setHasDraft(false);
  }, []);

  return {
    hasDraft:   hasDraft && !dismissed,
    draftValue,
    save,
    clear,
    dismiss,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DraftRestoreBanner — banner visual "hay borrador guardado"
// ─────────────────────────────────────────────────────────────────────────────
export function DraftRestoreBanner({
  draft,
  onRestore,
  label = "Hay un borrador local guardado",
}: {
  draft: DraftHandle;
  onRestore: (value: string) => void;
  label?: string;
}) {
  if (!draft.hasDraft) return null;

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
      <span className="flex items-center gap-2 text-amber-500">
        <Save size={11} />
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { onRestore(draft.draftValue); draft.dismiss(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-400 transition-all text-[9px] font-black uppercase"
        >
          <RotateCcw size={10} /> Restaurar
        </button>
        <button
          onClick={draft.dismiss}
          className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-500/60 hover:text-amber-500 transition-all"
          title="Descartar borrador"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectPersonaje — dropdown con lista de personajes
// ─────────────────────────────────────────────────────────────────────────────
const selectCls = "w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm font-medium text-primary outline-none focus:border-primary/40 transition-colors appearance-none cursor-pointer";

export function SelectPersonaje({
  value,
  onChange,
  placeholder = "Sin personaje",
  label = "Personaje",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const { personajes, loading } = usePersonajes();

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          className={selectCls}
        >
          <option value="">{loading ? "Cargando…" : placeholder}</option>
          {personajes.map(p => (
            <option key={p.id} value={p.nombre}>{p.nombre}</option>
          ))}
        </select>
        {/* Chevron decorativo */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 text-xs">▾</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectIdioma — dropdown ES / JP / EN
// ─────────────────────────────────────────────────────────────────────────────
const IDIOMAS_OPCIONES = [
  { value: "Español",  label: "Español (ES)" },
  { value: "Japonés",  label: "Japonés (JP)" },
  { value: "Inglés",   label: "Inglés (EN)"  },
];

export function SelectIdioma({
  value,
  onChange,
  label = "Idioma",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black uppercase text-primary/30 tracking-widest">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={selectCls}
        >
          <option value="">Sin idioma</option>
          {IDIOMAS_OPCIONES.map(({ value: v, label: l }) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary/30 text-xs">▾</span>
      </div>
    </div>
  );
}