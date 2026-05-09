"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { normalize } from "@/components/templates/EstudioTemplates";
import { INPUT_CLS } from "./types";


// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}


// ─── Types locales ─────────────────────────────────────────────────────────────
type HechizoCatalogo = {
  id: string;
  nombre: string;
};

type Asignacion = {
  hechizo_id: string;
  criatura_id: string;
  variante_id: string | null;
  criatura_nombre: string;
};

// ─── Hook: catálogo completo de hechizos + sus asignaciones de criatura ────────
const CACHE_TTL = 5 * 60 * 1000;

function useCatalogo() {
  const [hechizos,    setHechizos]    = useState<HechizoCatalogo[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading]          = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // 1. Dexie: hechizos
      const localH = await dexieReadAll<HechizoCatalogo>("hechizos");
      // 2. session_cache: asignaciones (tabla join sin tabla Dexie propia)
      try {
        if (db) {
          const cached = await (db as any).session_cache?.get("hechizo_criaturas");
          if (cached && Date.now() - cached.updated_at < CACHE_TTL && !cancelled) {
            if (localH.length) setHechizos(localH);
            setAsignaciones(cached.value);
            if (localH.length) setLoading(false);
          }
        }
      } catch {}

      if (!navigator.onLine) { setLoading(false); return; }

      const [hRes, aRes] = await Promise.all([
        supabase.from("hechizos").select("id, nombre").order("nombre"),
        supabase.from("hechizo_criaturas")
          .select("hechizo_id, criatura_id, variante_id, criatura:criaturas!criatura_id(nombre)"),
      ]);
      if (cancelled) return;

      const hechizosData = (hRes.data ?? []) as HechizoCatalogo[];
      const rows: Asignacion[] = (aRes.data ?? []).map((r: any) => ({
        hechizo_id:      r.hechizo_id,
        criatura_id:     r.criatura_id,
        variante_id:     r.variante_id,
        criatura_nombre: (Array.isArray(r.criatura) ? r.criatura[0]?.nombre : r.criatura?.nombre) ?? "",
      }));
      setHechizos(hechizosData);
      setAsignaciones(rows);
      setLoading(false);
      await dexieWriteAll("hechizos", hechizosData);
      try {
        if (db) await (db as any).session_cache?.put({ key: "hechizo_criaturas", value: rows, updated_at: Date.now() });
      } catch {}
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { hechizos, asignaciones, loading };
}

// ─── Hook: hechizos asignados al personaje ─────────────────────────────────────
function useAsignados(personajeId: string) {
  const [ids, setIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("personaje_hechizos")
      .select("hechizo_id")
      .eq("personaje_id", personajeId);
    setIds((data ?? []).map((r: any) => r.hechizo_id));
  }, [personajeId]);

  useEffect(() => { load(); }, [load]);

  const add = async (id: string) => {
    await supabase.from("personaje_hechizos").insert({ personaje_id: personajeId, hechizo_id: id });
    setIds(prev => [...prev, id]);
  };

  const remove = async (id: string) => {
    await supabase.from("personaje_hechizos").delete()
      .eq("personaje_id", personajeId).eq("hechizo_id", id);
    setIds(prev => prev.filter(x => x !== id));
  };

  return { ids, add, remove };
}

// ─── Lógica de compatibilidad ──────────────────────────────────────────────────
function esCompatible(
  hechizo: HechizoCatalogo,
  asignaciones: Asignacion[],
  especie: string | null | undefined,
  varianteId: string | null | undefined,
): boolean {
  const propias = asignaciones.filter(a => a.hechizo_id === hechizo.id);
  if (propias.length === 0) return true;

  if (!especie?.trim()) return false;
  const esp = especie.toLowerCase().trim();

  return propias.some(a => {
    const criNombre = a.criatura_nombre.toLowerCase().trim();
    const nombreMatch = esp.includes(criNombre) || criNombre.includes(esp);
    if (!nombreMatch) return false;
    if (a.variante_id) return a.variante_id === varianteId;
    return true;
  });
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
export function BloqueHechizos({ personajeId, especie, varianteId }: {
  personajeId: string; especie?: string | null; varianteId?: string | null;
}) {
  const { hechizos, asignaciones, loading } = useCatalogo();
  const { ids, add, remove } = useAsignados(personajeId);
  const [input, setInput] = useState("");
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const noEspecie = !especie?.trim();

  const compatibles = useMemo(
    () => hechizos.filter(h => esCompatible(h, asignaciones, especie, varianteId)),
    [hechizos, asignaciones, especie, varianteId]
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
            disabled={noEspecie}
            placeholder={noEspecie ? "Sin especie…" : "Añadir hechizo…"}
            className={INPUT_CLS + " pr-8 disabled:opacity-40 disabled:cursor-not-allowed"}
          />
          <button type="button" onClick={() => !noEspecie && setOpen(o => !o)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary transition-colors">
            <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Dropdown en portal para escapar overflow-hidden del padre */}
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