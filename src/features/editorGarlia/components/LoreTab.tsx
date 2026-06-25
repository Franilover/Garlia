import Image from "next/image";
import {
  Mountain,
  Users,
  Plus,
  Trash2,
  UserCircle2,
  Loader2,
  MapPin,
  Map,
  Check,
  X,
  Eye,
  EyeOff,
  Bug,
  Package,
  SlidersHorizontal,
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";

import {
  MarkdownEditor,
  WikiEntity,
} from "@/components/forms/Markdown/MarkdownEditor";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { type Ciudad } from "@/features/editorGarlia/views/EditorCiudad";
import { PanelHistoriaMundo } from "@/features/editorGarlia/components/EditorLineaTiempo";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { INPUT_CLS, type SaveStatus, type Reino } from "./types";
import { SaveIndicator } from "./UIComponents";
import { useWikilink } from "./WikilinkContext";

// ─── Tipo Personaje (local) ───────────────────────────────────────────────────
type Personaje = {
  id: string;
  nombre: string;
  img_url?: string | null;
  especie?: string | null;
  sobre?: string | null;
};

// ─── Tipo Personaje (local) ───────────────────────────────────────────────────

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch {}
}
async function dexieReadAll<T>(
  tabla: string,
  filter?: (r: any) => boolean,
): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    const all: any[] = await t.toArray();
    return all.filter((r) => !r.deleted && (!filter || filter(r))) as T[];
  } catch {
    return [];
  }
}
async function dexieWriteAll(
  tabla: string,
  rows: any[],
  keyField = "id",
): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r[keyField]));
    const local: any[] = await t.toArray();
    const toDelete = local
      .map((r: any) => r[keyField])
      .filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── DetalleEditor ─────────────────────────────────────────────────────────────

function DetalleEditor({
  detalle,
  onSaved,
  onDeleted,
  onOpenEditor,
  entities = [],
}: {
  detalle: Ciudad;
  onSaved: (d: Ciudad) => void;
  onDeleted: (id: string) => void;
  onOpenEditor?: (id: string) => void;
  entities?: WikiEntity[];
}) {
  const [form, setForm] = useState(detalle);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  const prevCoords = useRef({ x: detalle.coord_x, y: detalle.coord_y });
  useEffect(() => {
    if (
      detalle.coord_x !== prevCoords.current.x ||
      detalle.coord_y !== prevCoords.current.y
    ) {
      prevCoords.current = { x: detalle.coord_x, y: detalle.coord_y };
      setForm((f) => ({
        ...f,
        coord_x: detalle.coord_x,
        coord_y: detalle.coord_y,
      }));
    }
  }, [detalle.coord_x, detalle.coord_y]);

  const saveDetalle = async (data: Ciudad) => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("ciudades")
        .update({
          nombre: data.nombre,
          descripcion: data.descripcion,
          coord_x: data.coord_x,
          coord_y: data.coord_y,
          oculto: data.oculto ?? false,
        })
        .eq("id", data.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(data);
      void dexiePut("ciudades", data);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const toggleOculto = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nuevo = { ...form, oculto: !form.oculto };
    setForm(nuevo);
    await saveDetalle(nuevo);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <ConfirmModal />
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <MapPin
          className={`shrink-0 ${form.oculto ? "text-primary/20" : "text-primary/40"}`}
          size={11}
        />
        <span
          className={`flex-1 text-[11px] font-black uppercase tracking-widest truncate ${form.oculto ? "text-primary/30 line-through" : "text-primary"}`}
        >
          {form.nombre}
        </span>
        {form.oculto && (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-orange-400/70 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
            <EyeOff size={8} /> Oculto
          </span>
        )}
        <button
          className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
            form.oculto
              ? "text-orange-400 bg-orange-400/10 border-orange-400/30"
              : "text-primary/40 bg-primary/5 border-primary/10 hover:text-primary"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleOculto();
          }}
        >
          {form.oculto ? <Eye size={9} /> : <EyeOff size={9} />}
        </button>
        <X
          className="text-primary/25 transition-transform duration-200"
          size={12}
          style={{ transform: expanded ? "rotate(45deg)" : undefined }}
        />
      </div>

      {expanded && (
        <div
          className="px-3 pb-3 pt-0 border-t space-y-3"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
          }}
        >
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">
              Nombre
            </label>
            <input
              className={INPUT_CLS + " mt-1"}
              placeholder="Nombre de la ciudad"
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">
              Descripción
            </label>
            <MarkdownEditor
              toolbar
              defaultMode="edit"
              entities={entities}
              placeholder="Describe esta ciudad…"
              rows={4}
              value={form.descripcion ?? ""}
              onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
              onSnippetAction={onSnippetAction}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirm({
                    message: `¿Eliminar punto "${form.nombre}"?`,
                    danger: true,
                  });
                  if (!ok) return;
                  await supabase.from("ciudades").delete().eq("id", form.id);
                  void dexieDel("ciudades", form.id);
                  onDeleted(form.id);
                }}
              >
                <Trash2 size={10} /> Eliminar
              </button>
              {onOpenEditor && (
                <button
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/5 transition-all border border-primary/10 hover:border-primary/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditor(form.id);
                  }}
                >
                  <MapPin size={10} /> Ver ficha
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SaveIndicator status={status} />
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                onClick={() => saveDetalle(form)}
              >
                <Check size={10} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MapaNuevo — canvas full height + overlays flotantes ─────────────────────
function MapaNuevo({
  MapaConPuntosComponent,
  detalles,
  entities,
  onDetalleUpdate,
  onDetalleDelete,
  onOpenDetalleEditor,
  addingPoint,
  setAddingPoint,
  newPointName,
  setNewPointName,
  onAddPoint,
  form,
  setForm,
  onSnippetAction,
  onDetallesArrayChange,
}: {
  MapaConPuntosComponent?: React.ComponentType<any>;
  detalles: Ciudad[];
  entities: WikiEntity[];
  onDetalleUpdate?: (d: Ciudad) => void;
  onDetalleDelete?: (id: string) => void;
  onOpenDetalleEditor?: (id: string) => void;
  addingPoint?: boolean;
  setAddingPoint?: (v: boolean) => void;
  newPointName?: string;
  setNewPointName?: (v: string) => void;
  onAddPoint?: () => void;
  form: Reino;
  setForm: React.Dispatch<React.SetStateAction<Reino>>;
  onSnippetAction: any;
  onDetallesArrayChange?: (d: Ciudad[]) => void;
}) {
  const [puntosOpen, setPuntosOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas full height */}
      {MapaConPuntosComponent ? (
        <MapaConPuntosComponent
          detalles={detalles}
          mapaUrl={""}
          onDetallesChange={(d: any) => onDetallesArrayChange?.(d)}
          onMapaChange={() => {}}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-primary/20">
          <Map size={22} strokeWidth={1} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Sin mapa
          </span>
        </div>
      )}

      {/* ── Botones flotantes bottom-right ── */}
      <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
        {/* Puntos */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{
            background: puntosOpen
              ? "color-mix(in srgb, var(--accent) 18%, transparent)"
              : "color-mix(in srgb, var(--bg-main) 85%, transparent)",
            backdropFilter: "blur(10px)",
            border: puntosOpen
              ? "1px solid color-mix(in srgb, var(--accent) 28%, transparent)"
              : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            borderRadius: "6px",
            color: puntosOpen
              ? "color-mix(in srgb, var(--accent) 80%, transparent)"
              : "color-mix(in srgb, var(--foreground) 45%, transparent)",
          }}
          onClick={() => {
            setPuntosOpen((v) => !v);
            setGeoOpen(false);
          }}
        >
          <MapPin size={9} />
          Puntos
          {detalles.length > 0 && (
            <span
              className="text-[7px] font-black px-1 py-0.5 rounded-md"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              {detalles.length}
            </span>
          )}
        </button>

        {/* Geografía */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{
            background: geoOpen
              ? "color-mix(in srgb, var(--accent) 18%, transparent)"
              : "color-mix(in srgb, var(--bg-main) 85%, transparent)",
            backdropFilter: "blur(10px)",
            border: geoOpen
              ? "1px solid color-mix(in srgb, var(--accent) 28%, transparent)"
              : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            borderRadius: "6px",
            color: geoOpen
              ? "color-mix(in srgb, var(--accent) 80%, transparent)"
              : "color-mix(in srgb, var(--foreground) 45%, transparent)",
          }}
          onClick={() => {
            setGeoOpen((v) => !v);
            setPuntosOpen(false);
          }}
        >
          <Mountain size={9} /> Geografía
        </button>
      </div>

      {/* ── Drawer de Puntos ── */}
      {puntosOpen && (
        <div
          className="absolute top-0 right-0 bottom-0 z-20 flex flex-col w-64 shadow-2xl"
          style={{
            background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
            backdropFilter: "blur(16px)",
            borderLeft:
              "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <MapPin size={10} style={{ color: "var(--accent)" }} />
            <span
              className="flex-1 text-[9px] font-black uppercase tracking-[0.2em]"
              style={{
                color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
              }}
            >
              Puntos · {detalles.length}
            </span>
            <button
              className="text-primary/25 hover:text-primary/60 transition-colors"
              onClick={() => setPuntosOpen(false)}
            >
              <X size={12} />
            </button>
          </div>
          <div
            className="flex-1 overflow-y-auto p-2 space-y-1.5"
            style={{ scrollbarWidth: "none" }}
          >
            {detalles.length === 0 && !addingPoint && (
              <div className="flex flex-col items-center gap-2 py-8 text-primary/20">
                <MapPin size={18} strokeWidth={1} />
                <p className="text-[8px] font-black uppercase tracking-widest text-center">
                  Sin puntos
                </p>
              </div>
            )}
            {detalles.map((det) => (
              <DetalleEditor
                key={det.id}
                detalle={det}
                entities={entities}
                onDeleted={(id) => onDetalleDelete?.(id)}
                onOpenEditor={onOpenDetalleEditor}
                onSaved={(d) => onDetalleUpdate?.(d)}
              />
            ))}
            {addingPoint ? (
              <div
                className="flex flex-col gap-1.5 p-2 rounded-xl border border-primary/15"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 4%, transparent)",
                }}
              >
                <input
                  autoFocus
                  className="w-full bg-bg-main border border-primary/20 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                  placeholder="NOMBRE..."
                  value={newPointName ?? ""}
                  onChange={(e) => setNewPointName?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onAddPoint?.();
                    if (e.key === "Escape") setAddingPoint?.(false);
                  }}
                />
                <div className="flex gap-1">
                  <button
                    className="flex-1 bg-primary text-btn-text py-1.5 rounded-lg text-[9px] font-black hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center"
                    disabled={!newPointName?.trim()}
                    onClick={onAddPoint}
                  >
                    <Check size={11} />
                  </button>
                  <button
                    className="px-2 py-1.5 rounded-lg text-primary/40 hover:text-primary transition-all"
                    onClick={() => setAddingPoint?.(false)}
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/15 text-[9px] font-black uppercase text-primary/30 hover:text-primary hover:border-primary/30 transition-all tracking-widest"
                onClick={() => setAddingPoint?.(true)}
              >
                <Plus size={9} /> Añadir
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Drawer de Geografía ── */}
      {geoOpen && (
        <div
          className="absolute top-0 right-0 bottom-0 z-20 flex flex-col w-64 shadow-2xl"
          style={{
            background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
            backdropFilter: "blur(16px)",
            borderLeft:
              "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            }}
          >
            <Mountain size={10} style={{ color: "var(--accent)" }} />
            <span
              className="flex-1 text-[9px] font-black uppercase tracking-[0.2em]"
              style={{
                color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
              }}
            >
              Geografía
            </span>
            <button
              className="text-primary/25 hover:text-primary/60 transition-colors"
              onClick={() => setGeoOpen(false)}
            >
              <X size={12} />
            </button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <MarkdownEditor
              key="geografia"
              toolbar
              defaultMode="edit"
              placeholder="Paisajes, clima, fronteras, ciudades principales…"
              rows={20}
              value={(form as any).geografia ?? ""}
              onChange={(v) => setForm((f) => ({ ...f, geografia: v }))}
              onSnippetAction={onSnippetAction}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tipos mínimos ────────────────────────────────────────────────────────────
type CriaturaMin = { id: string; nombre: string; imagen_url?: string | null };
type PersonajeMin = { id: string; nombre: string; img_url?: string | null };
type ItemMin = { id: string; nombre: string; imagen_url?: string | null };
// ─── Hook: criaturas vinculadas al reino (criatura_reinos) ────────────────────
// Soporta add (INSERT) y remove (DELETE) además de carga.

function useCriaturasDelReino(reinoId: string) {
  const [criaturas, setCriaturas] = useState<CriaturaMin[]>([]);
  const [allCriaturas, setAllCriaturas] = useState<CriaturaMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowMap, setRowMap] = useState<Record<string, string>>({}); // criaturaId → rowId

  const load = useCallback(async () => {
    setLoading(true);

    // ── 1. Local Dexie ──────────────────────────────────────────────────────
    const [localLinked, localAll] = await Promise.all([
      dexieReadAll<any>("criatura_reinos", (r) => r.reino_id === reinoId),
      dexieReadAll<CriaturaMin>("criaturas"),
    ]);
    if (localLinked.length) {
      const allMap = Object.fromEntries(localAll.map((c) => [c.id, c]));
      const map: Record<string, string> = {};
      setCriaturas(
        localLinked.map((r) => {
          map[r.criatura_id] = r.id;
          return (
            allMap[r.criatura_id] ?? {
              id: r.criatura_id,
              nombre: "—",
              imagen_url: null,
            }
          );
        }),
      );
      setRowMap(map);
      if (localAll.length) setAllCriaturas(localAll);
      setLoading(false);
    }

    if (!navigator.onLine) {
      if (!localLinked.length) setLoading(false);
      return;
    }

    // ── 2. Remoto Supabase ──────────────────────────────────────────────────
    const [{ data: linked }, { data: all }] = await Promise.all([
      supabase
        .from("criatura_reinos")
        .select(
          "id, criatura_id, criaturas!criatura_id(id, nombre, imagen_url)",
        )
        .eq("reino_id", reinoId),
      supabase
        .from("criaturas")
        .select("id, nombre, imagen_url")
        .order("nombre"),
    ]);
    if (linked) {
      const map: Record<string, string> = {};
      const result = linked.map((r: any) => {
        const c = Array.isArray(r.criaturas) ? r.criaturas[0] : r.criaturas;
        map[c?.id ?? r.criatura_id] = r.id;
        return {
          id: c?.id ?? r.criatura_id,
          nombre: c?.nombre ?? "—",
          imagen_url: c?.imagen_url ?? null,
        };
      });
      setCriaturas(result);
      setRowMap(map);
      // Persistir filas planas (sin el join) para uso offline
      const rows = linked.map((r: any) => ({
        id: r.id,
        reino_id: reinoId,
        criatura_id: r.criatura_id,
      }));
      if (db && (db as any).criatura_reinos)
        await (db as any).criatura_reinos.bulkPut(rows);
    }
    if (all) {
      setAllCriaturas(all);
      await dexieWriteAll("criaturas", all);
    }
    setLoading(false);
  }, [reinoId]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (criaturaId: string) => {
    const { data, error } = await supabase
      .from("criatura_reinos")
      .insert([{ reino_id: reinoId, criatura_id: criaturaId }])
      .select()
      .single();
    if (!error && data) {
      const found = allCriaturas.find((c) => c.id === criaturaId);
      if (found) {
        setCriaturas((prev) => [...prev, found]);
        setRowMap((prev) => ({ ...prev, [criaturaId]: data.id }));
        void dexiePut("criatura_reinos", {
          id: data.id,
          reino_id: reinoId,
          criatura_id: criaturaId,
        });
      }
    }
  };

  const remove = async (criaturaId: string) => {
    const rowId = rowMap[criaturaId];
    if (!rowId) return;
    await supabase.from("criatura_reinos").delete().eq("id", rowId);
    setCriaturas((prev) => prev.filter((c) => c.id !== criaturaId));
    setRowMap((prev) => {
      const next = { ...prev };
      delete next[criaturaId];
      return next;
    });
    void dexieDel("criatura_reinos", rowId);
  };

  return { criaturas, allCriaturas, loading, add, remove };
}

// ─── Hook: personajes del reino (personajes.reino = nombre del reino) ─────────
// add → UPDATE personajes SET reino = reinoNombre WHERE id = personajeId
// remove → UPDATE personajes SET reino = null WHERE id = personajeId

function usePersonajesDelReinoEditable(reinoId: string, reinoNombre: string) {
  const [personajes, setPersonajes] = useState<PersonajeMin[]>([]);
  const [allPersonajes, setAllPersonajes] = useState<PersonajeMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // ── 1. Local Dexie ──────────────────────────────────────────────────────
    const [localLinked, localAll] = await Promise.all([
      dexieReadAll<PersonajeMin>("personajes", (r) => r.reino === reinoNombre),
      dexieReadAll<PersonajeMin>("personajes"),
    ]);
    if (localLinked.length) {
      setPersonajes(localLinked);
      if (localAll.length) setAllPersonajes(localAll);
      setLoading(false);
    }

    if (!reinoNombre || !navigator.onLine) {
      if (!localLinked.length) setLoading(false);
      return;
    }

    // ── 2. Remoto Supabase ──────────────────────────────────────────────────
    const [{ data: linked }, { data: all }] = await Promise.all([
      supabase
        .from("personajes")
        .select("id, nombre, img_url")
        .eq("reino", reinoNombre)
        .order("nombre"),
      supabase.from("personajes").select("id, nombre, img_url").order("nombre"),
    ]);
    if (linked) setPersonajes(linked);
    if (all) {
      setAllPersonajes(all);
      await dexieWriteAll("personajes", all);
    }
    setLoading(false);
  }, [reinoNombre]);

  useEffect(() => {
    if (reinoNombre) load();
  }, [load, reinoNombre]);

  const add = async (personajeId: string) => {
    const { error } = await supabase
      .from("personajes")
      .update({ reino: reinoNombre })
      .eq("id", personajeId);
    if (!error) {
      const found = allPersonajes.find((p) => p.id === personajeId);
      if (found) {
        setPersonajes((prev) => [...prev, found]);
        void dexiePut("personajes", { ...found, reino: reinoNombre });
      }
    }
  };

  const remove = async (personajeId: string) => {
    const { error } = await supabase
      .from("personajes")
      .update({ reino: null })
      .eq("id", personajeId);
    if (!error) {
      setPersonajes((prev) => prev.filter((p) => p.id !== personajeId));
      const found = allPersonajes.find((p) => p.id === personajeId);
      if (found) void dexiePut("personajes", { ...found, reino: null });
    }
  };

  return { personajes, allPersonajes, loading, add, remove };
}

// ─── Hook: items del reino — solo lectura, agregados desde ciudades ──

function useItemsDelReino(reinoId: string) {
  const [items, setItems] = useState<ItemMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // ── 1. Local Dexie ──────────────────────────────────────────────────────
    const localCiudades = await dexieReadAll<{ id: string }>(
      "ciudades",
      (r) => r.reino_id === reinoId,
    );
    if (localCiudades.length) {
      const ciudadIds = new Set(localCiudades.map((c) => c.id));
      const localItems = await dexieReadAll<ItemMin>("items", (r) =>
        ciudadIds.has(r.ciudad_id),
      );
      if (localItems.length) {
        setItems(localItems.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setLoading(false);
      }
    }

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    // ── 2. Remoto Supabase ──────────────────────────────────────────────────
    const { data: ciudadesData } = await supabase
      .from("ciudades")
      .select("id")
      .eq("reino_id", reinoId);
    const ciudadIds = (ciudadesData ?? []).map((c: any) => c.id);

    if (ciudadIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("items")
      .select("id, nombre, imagen_url")
      .in("ciudad_id", ciudadIds);
    const merged = (data ?? []).sort((a: ItemMin, b: ItemMin) =>
      a.nombre.localeCompare(b.nombre),
    );
    setItems(merged);
    setLoading(false);
    // bulkPut aditivo: no borra items de otros reinos
    if (data?.length && db && (db as any).items)
      await (db as any).items.bulkPut(data);
  }, [reinoId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading };
}

// ─── SeccionReadOnly — panel de solo lectura para items ──────────────────────

function SeccionReadOnly({
  label,
  Icon,
  FallbackIcon,
  items,
  loading,
  emptyLabel,
  onEntityClick,
}: {
  label: string;
  Icon: React.ElementType;
  FallbackIcon: React.ElementType;
  items: { id: string; nombre: string; imagen_url?: string | null }[];
  loading: boolean;
  emptyLabel: string;
  onEntityClick?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 py-2 shrink-0"
        style={{
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        <Icon
          size={9}
          style={{
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        />
        <span
          className="text-[8px] font-black uppercase tracking-[0.2em] flex-1"
          style={{
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          {label}
        </span>
        {items.length > 0 && (
          <span
            className="text-[7px] font-black px-1.5 py-0.5 rounded-md"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "color-mix(in srgb, var(--primary) 45%, transparent)",
            }}
          >
            {items.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {loading ? (
          <div className="flex justify-center py-3">
            <Loader2
              className="animate-spin"
              size={12}
              style={{
                color: "color-mix(in srgb, var(--primary) 25%, transparent)",
              }}
            />
          </div>
        ) : items.length === 0 ? (
          <p
            className="text-[9px] font-bold uppercase tracking-widest text-center py-3 italic"
            style={{
              color: "color-mix(in srgb, var(--primary) 22%, transparent)",
            }}
          >
            {emptyLabel}
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-lg transition-all text-left disabled:cursor-default"
              disabled={!onEntityClick}
              style={{
                color: "color-mix(in srgb, var(--primary) 65%, transparent)",
              }}
              type="button"
              onClick={() => onEntityClick?.(item.id)}
              onMouseEnter={(e) => {
                if (onEntityClick)
                  (e.currentTarget as HTMLElement).style.background =
                    "color-mix(in srgb, var(--primary) 6%, transparent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
            >
              <div
                className="w-6 h-6 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 5%, transparent)",
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                {item.imagen_url ? (
                  <Image
                    alt={item.nombre}
                    className="w-full h-full object-cover"
                    src={item.imagen_url}
                  />
                ) : (
                  <FallbackIcon
                    size={11}
                    style={{
                      color:
                        "color-mix(in srgb, var(--primary) 25%, transparent)",
                    }}
                  />
                )}
              </div>
              <span className="text-[10px] font-semibold truncate flex-1">
                {item.nombre}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── NAV config ───────────────────────────────────────────────────────────────

type SectionId =
  | "mapa"
  | "historia"
  | "cultura"
  | "politica"
  | "economia"
  | "puntos"
  | "geografia"
  | "lineatiempo";

// ─── Componente principal — Doble columna con infinity scroll ────────────────

export function LoreTab({
  form,
  setForm,
  entities = [],
  personajes = [],
  loadingPersonajes = false,
  onSelectPersonaje,
  onSelectCriatura,
  onSelectItem,
  reinos = [],
  filtroReinoId,
  detalles = [],
  onDetallesChange,
  onAddPoint,
  addingPoint,
  setAddingPoint,
  newPointName,
  setNewPointName,
  onDetalleUpdate,
  onDetalleDelete,
  onOpenDetalleEditor,
  mapaUrl = "",
  onMapaChange,
  onDetallesArrayChange,
  MapaConPuntosComponent,
  activeTab: activeTabProp,
  mobileAsideOpen: mobileAsideOpenProp,
  setMobileAsideOpen: setMobileAsideOpenProp,
}: {
  form: Reino;
  setForm: React.Dispatch<React.SetStateAction<Reino>>;
  entities?: WikiEntity[];
  personajes?: Personaje[];
  loadingPersonajes?: boolean;
  onSelectPersonaje?: (personaje: Personaje) => void;
  onSelectCriatura?: (id: string) => void;
  onSelectItem?: (id: string) => void;
  reinos?: { id: string; nombre: string }[];
  filtroReinoId?: string | null;
  detalles?: Ciudad[];
  onDetallesChange?: (updated: Ciudad) => void;
  onDeleteDetalle?: (id: string) => void;
  onAddPoint?: () => void;
  addingPoint?: boolean;
  setAddingPoint?: (v: boolean) => void;
  newPointName?: string;
  setNewPointName?: (v: string) => void;
  onDetalleUpdate?: (d: Ciudad) => void;
  onDetalleDelete?: (id: string) => void;
  onOpenDetalleEditor?: (id: string) => void;
  mapaUrl?: string;
  onMapaChange?: (url: string) => void;
  onDetallesArrayChange?: (d: Ciudad[]) => void;
  MapaConPuntosComponent?: React.ComponentType<any>;
  activeTab?: SectionId;
  mobileAsideOpen?: boolean;
  setMobileAsideOpen?: (v: boolean) => void;
}) {
  const { onSnippetAction } = useWikilink();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<
    "mapa" | "cultura" | "economia" | "politica" | "lineatiempo"
  >(
    activeTabProp === "mapa"
      ? "mapa"
      : activeTabProp === "lineatiempo"
        ? "lineatiempo"
        : activeTabProp && activeTabProp !== "historia"
          ? (activeTabProp as any)
          : "cultura",
  );
  const {
    criaturas,
    allCriaturas,
    loading: loadingCriaturas,
    add: addCriatura,
    remove: removeCriatura,
  } = useCriaturasDelReino(form.id);
  const {
    personajes: personajesEditables,
    allPersonajes,
    loading: loadingPersonajesEditables,
    add: addPersonaje,
    remove: removePersonaje,
  } = usePersonajesDelReinoEditable(form.id, form.nombre);
  const { items, loading: loadingItems } = useItemsDelReino(form.id);

  // Estado saving por sección
  const [savingCriaturas, setSavingCriaturas] = useState(false);
  const [savingPersonajes, setSavingPersonajes] = useState(false);
  const [_mobileAsideOpen, _setMobileAsideOpen] = useState(false);
  const mobileAsideOpen = mobileAsideOpenProp ?? _mobileAsideOpen;
  const setMobileAsideOpen = setMobileAsideOpenProp ?? _setMobileAsideOpen;

  const handleToggleCriatura = async (id: string, add: boolean) => {
    setSavingCriaturas(true);
    if (add) await addCriatura(id);
    else await removeCriatura(id);
    setSavingCriaturas(false);
  };
  const handleTogglePersonaje = async (id: string, add: boolean) => {
    setSavingPersonajes(true);
    if (add) await addPersonaje(id);
    else await removePersonaje(id);
    setSavingPersonajes(false);
  };

  // ── Etiqueta de sección ───────────────────────────────────────────────────
  const SectionHeader = ({
    id,
    label,
    Icon,
  }: {
    id: SectionId;
    label: string;
    Icon: React.ElementType;
  }) => (
    <header
      className="flex items-center gap-1.5 mb-2 select-none"
      id={`lore-section-${id}`}
    >
      <Icon
        size={10}
        style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
      />
      <span
        className="text-[9px] font-black uppercase tracking-[0.22em]"
        style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      />
    </header>
  );

  const TABS = [
    { id: "mapa", label: "Mapa" },
    { id: "cultura", label: "Cultura" },
    { id: "economia", label: "Economía" },
    { id: "politica", label: "Política" },
    { id: "lineatiempo", label: "Línea de tiempo" },
  ] as const;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── COLUMNA 1 — Tabs + Editor central ───────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* BARRA DE TABS — siempre visible arriba */}
        <div
          className="shrink-0 flex border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className="flex-1 px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-all border-b-2"
              style={
                activeTab === tab.id
                  ? { borderColor: "var(--primary)", color: "var(--primary)" }
                  : {
                      borderColor: "transparent",
                      color:
                        "color-mix(in srgb, var(--primary) 35%, transparent)",
                    }
              }
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* MAPA — full height, sin scroll wrapper */}
        {activeTab === "mapa" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <MapaNuevo
              MapaConPuntosComponent={MapaConPuntosComponent}
              addingPoint={addingPoint}
              detalles={detalles}
              entities={entities}
              form={form}
              newPointName={newPointName}
              setAddingPoint={setAddingPoint}
              setForm={setForm}
              setNewPointName={setNewPointName}
              onAddPoint={onAddPoint}
              onDetalleDelete={onDetalleDelete}
              onDetalleUpdate={onDetalleUpdate}
              onDetallesArrayChange={onDetallesArrayChange}
              onOpenDetalleEditor={onOpenDetalleEditor}
              onSnippetAction={onSnippetAction}
            />
          </div>
        )}

        {/* RESTO DE TABS — con scroll y padding normal */}
        {activeTab !== "mapa" && (
          <main
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="p-3 flex flex-col gap-4">
              {/* CULTURA / ECONOMÍA / POLÍTICA — tab activo */}
              {activeTab === "cultura" && (
                <MarkdownEditor
                  key="cultura"
                  toolbar
                  defaultMode="edit"
                  entities={entities}
                  placeholder="Tradiciones, religión, idioma, costumbres, arte…"
                  rows={12}
                  value={(form as any).cultura ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, cultura: v }))}
                  onSnippetAction={onSnippetAction}
                />
              )}
              {activeTab === "politica" && (
                <MarkdownEditor
                  key="politica"
                  toolbar
                  defaultMode="edit"
                  entities={entities}
                  placeholder="Sistema de gobierno, facciones, líderes, leyes…"
                  rows={12}
                  value={(form as any).politica ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, politica: v }))}
                  onSnippetAction={onSnippetAction}
                />
              )}
              {activeTab === "economia" && (
                <MarkdownEditor
                  key="economia"
                  toolbar
                  defaultMode="edit"
                  entities={entities}
                  placeholder="Recursos, comercio, moneda, riqueza…"
                  rows={12}
                  value={(form as any).economia ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, economia: v }))}
                  onSnippetAction={onSnippetAction}
                />
              )}

              {/* LÍNEA DE TIEMPO — tab activo */}
              {activeTab === "lineatiempo" && (
                <div
                  className="rounded-xl overflow-hidden -mx-3 -mb-3"
                  style={{
                    border:
                      "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  }}
                >
                  <PanelHistoriaMundo
                    key={`historia-panel-${form.id}`}
                    reinoFijo={filtroReinoId ?? form.id}
                    texto={(form as any).historia ?? ""}
                    onChange={(v: string) =>
                      setForm((f) => ({ ...f, historia: v }))
                    }
                    onSave={async () => {}}
                  />
                </div>
              )}
            </div>
          </main>
        )}
      </div>
      {/* fin columna tabs+editor */}

      {/* ── COLUMNA 3 — Utilidades (desktop fijo / mobile drawer) ──────────── */}

      {/* Desktop: panel lateral fijo */}
      <aside
        className="hidden sm:flex shrink-0 w-52 flex-col border-l overflow-y-auto overflow-x-hidden"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
          background: "color-mix(in srgb, var(--primary) 1%, transparent)",
          scrollbarWidth: "none",
        }}
      >
        <SeccionEntidad
          allEntities={allPersonajes.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            imagen_url: p.img_url,
          }))}
          emptyLabel="Sin personajes"
          fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
          icon={<Users size={9} />}
          label="Personajes"
          loading={loadingPersonajesEditables}
          saving={savingPersonajes}
          selectedIds={personajesEditables.map((p) => p.id)}
          onEntityClick={(id) => {
            const p = personajesEditables.find((x) => x.id === id);
            if (p) onSelectPersonaje?.(p as any);
          }}
          onToggle={handleTogglePersonaje}
        />
        <div
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
          }}
        />
        <SeccionEntidad
          allEntities={allCriaturas.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            imagen_url: c.imagen_url,
          }))}
          emptyLabel="Sin criaturas"
          fallbackIcon={<Bug size={14} strokeWidth={1} />}
          icon={<Bug size={9} />}
          label="Criaturas"
          loading={loadingCriaturas}
          saving={savingCriaturas}
          selectedIds={criaturas.map((c) => c.id)}
          onEntityClick={(id) => onSelectCriatura?.(id)}
          onToggle={handleToggleCriatura}
        />
        <div
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
          }}
        />
        <div
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
          }}
        />
        <SeccionReadOnly
          FallbackIcon={Package}
          Icon={Package}
          emptyLabel="Sin ítems en el reino"
          items={items}
          label="Ítems"
          loading={loadingItems}
          onEntityClick={onSelectItem}
        />
      </aside>

      {/* Mobile: drawer desde la derecha */}
      {mobileAsideOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0"
            style={{
              background: "color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
            onClick={() => setMobileAsideOpen(false)}
          />
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "220px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft:
                "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            {/* Header del drawer */}
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              <span
                className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5"
                style={{
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button
                className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
                onClick={() => setMobileAsideOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <SeccionEntidad
              allEntities={allPersonajes.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                imagen_url: p.img_url,
              }))}
              emptyLabel="Sin personajes"
              fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />}
              icon={<Users size={9} />}
              label="Personajes"
              loading={loadingPersonajesEditables}
              saving={savingPersonajes}
              selectedIds={personajesEditables.map((p) => p.id)}
              onEntityClick={(id) => {
                const p = personajesEditables.find((x) => x.id === id);
                if (p) onSelectPersonaje?.(p as any);
              }}
              onToggle={handleTogglePersonaje}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionEntidad
              allEntities={allCriaturas.map((c) => ({
                id: c.id,
                nombre: c.nombre,
                imagen_url: c.imagen_url,
              }))}
              emptyLabel="Sin criaturas"
              fallbackIcon={<Bug size={14} strokeWidth={1} />}
              icon={<Bug size={9} />}
              label="Criaturas"
              loading={loadingCriaturas}
              saving={savingCriaturas}
              selectedIds={criaturas.map((c) => c.id)}
              onEntityClick={(id) => onSelectCriatura?.(id)}
              onToggle={handleToggleCriatura}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <div
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
              }}
            />
            <SeccionReadOnly
              FallbackIcon={Package}
              Icon={Package}
              emptyLabel="Sin ítems en el reino"
              items={items}
              label="Ítems"
              loading={loadingItems}
              onEntityClick={onSelectItem}
            />
          </div>
        </div>
      )}
    </div>
  );
}
