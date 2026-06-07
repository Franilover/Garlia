import React, { useState, useRef, useEffect, useCallback } from "react";
import { Globe, Mountain, Landmark, Users, Coins, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, UserCircle2, Loader2, MapPin, Map, Check, X, Eye, EyeOff, Bug, BookOpen, Package, SlidersHorizontal } from "lucide-react";
import { INPUT_CLS, type SaveStatus } from "./types";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "./WikilinkContext";
import { type Reino } from "./types";
import { type Ciudad } from "@/components/paginas/myself/garlia/EditorCiudad";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { SaveIndicator } from "./UIComponents";

// ─── Tipo Personaje (local) ───────────────────────────────────────────────────
type Personaje = {
  id: string;
  nombre: string;
  img_url?: string | null;
  especie?: string | null;
  sobre?: string | null;
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TimelineEvent = {
  id: string;
  year: string;   // texto libre: "345 A.E.", "-120", "Era del Fuego"…
  title: string;
  description: string;
  reinoId?: string | null; // null / undefined = evento de "Mundo" (sin reino)
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newEvent(): TimelineEvent {
  return { id: crypto.randomUUID(), year: "", title: "", description: "", reinoId: null };
}

function encodeTimeline(events: TimelineEvent[]): string {
  return JSON.stringify(events);
}

function decodeTimeline(raw: string | undefined): TimelineEvent[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TimelineEvent[];
  } catch {}
  return [];
}

// ─── Helpers de ordenamiento ─────────────────────────────────────────────────

/** Extrae el valor numérico de un año (soporta negativos y texto libre).
 *  Retorna [hasNumber, numericValue] para poder separar eventos sin año. */
function parseYear(year: string): number {
  if (!year?.trim()) return Infinity; // sin año → al final
  const normalized = year.replace(/(\d)[.,](\d{3})/g, "$1$2");
  const match = normalized.match(/(-?\d+)/);
  if (!match) return Infinity; // texto puro sin número → al final
  return parseInt(match[1], 10);
}

function compareYears(a: string, b: string): number {
  return parseYear(a) - parseYear(b);
}

// ─── Tipo para capítulos en la línea de tiempo ───────────────────────────────
type CapTimeline = {
  id: string;
  libro_id: string;
  titulo_capitulo: string;
  orden_linea_tiempo: number;
  libroTitulo?: string;
};

// ─── Hook: capítulos del reino con posición en línea de tiempo ───────────────
function useCapitulosDelReino(reinoId: string) {
  const [caps, setCaps] = useState<CapTimeline[]>([]);
  useEffect(() => {
    if (!reinoId) return;
    supabase
      .from("capitulos")
      .select("id, libro_id, titulo_capitulo, orden_linea_tiempo, reinos_ids")
      .not("orden_linea_tiempo", "is", null)
      .contains("reinos_ids", [reinoId])
      .then(async ({ data }) => {
        if (!data?.length) return;
        const libroIds = [...new Set(data.map((c: any) => c.libro_id))];
        const { data: libros } = await supabase
          .from("libros")
          .select("id, titulo")
          .in("id", libroIds);
        const libroMap: Record<string, string> = {};
        (libros ?? []).forEach((l: any) => { libroMap[l.id] = l.titulo; });
        setCaps(
          (data as any[]).map(c => ({
            id: c.id,
            libro_id: c.libro_id,
            titulo_capitulo: c.titulo_capitulo,
            orden_linea_tiempo: c.orden_linea_tiempo,
            libroTitulo: libroMap[c.libro_id] ?? "",
          }))
        );
      });
  }, [reinoId]);
  return caps;
}

// ─── Tarjeta de capítulo en la línea de tiempo (solo lectura) ────────────────
function CapituloCard({ cap }: { cap: CapTimeline }) {
  const navigate = () => {
    localStorage.setItem("estudio-caps-last-cap",   cap.id);
    localStorage.setItem("estudio-caps-last-libro", cap.libro_id);
    window.dispatchEvent(new Event("estudio-caps-action"));
  };

  return (
    <div className="group/card" style={{ width: 188 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        <div className="flex flex-col gap-1 p-2">
          {/* Año */}
          <div className="flex items-center gap-1">
            <span
              className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-md"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                color: "var(--primary)",
              }}
            >
              {cap.orden_linea_tiempo}
            </span>
            {cap.libroTitulo && (
              <span
                className="text-[7px] font-black uppercase tracking-widest truncate"
                style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
              >
                {cap.libroTitulo}
              </span>
            )}
          </div>
          {/* Título navegable */}
          <button
            type="button"
            onClick={navigate}
            className="flex items-center gap-1 px-1.5 py-1 rounded-lg border w-full text-left transition-all"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "color-mix(in srgb, var(--primary) 9%, transparent)";
              el.style.borderColor = "color-mix(in srgb, var(--primary) 22%, transparent)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "color-mix(in srgb, var(--primary) 4%, transparent)";
              el.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)";
            }}
            title={`Abrir: ${cap.titulo_capitulo}`}
          >
            <BookOpen size={8} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", flexShrink: 0 }} />
            <span
              className="text-[8px] font-bold truncate"
              style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}
            >
              {cap.titulo_capitulo}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}


function TimelineCard({
  event,
  isSelected,
  onSelect,
  onRemove,
  reinos = [],
}: {
  event: TimelineEvent;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  reinos?: { id: string; nombre: string }[];
}) {
  const hasYear  = !!event.year?.trim();
  const hasTitle = !!event.title?.trim();
  const reinoId  = event.reinoId;
  const reinoNombre = reinoId ? reinos.find(r => r.id === reinoId)?.nombre : null;

  return (
    <div className="group/card" style={{ width: 188 }}>
      <div
        className="mx-1.5 rounded-xl transition-all"
        style={{
          border: `1px solid ${isSelected ? "color-mix(in srgb, var(--primary) 30%, transparent)" : "color-mix(in srgb, var(--primary) 12%, transparent)"}`,
          background: isSelected ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "color-mix(in srgb, var(--primary) 2.5%, transparent)",
        }}
      >
        {/* Cabecera — solo inputs, sin panel expandido */}
        <div className="flex flex-col gap-1 p-2">
          {/* Año */}
          <input
            className="bg-transparent outline-none w-full text-[10px] font-black tracking-widest text-center placeholder:text-primary/20 px-1 py-1 rounded-lg border"
            value={event.year}
            onChange={e => {/* handled via onSelect + parent update — ver abajo */}}
            readOnly
            placeholder="Año"
            style={{
              color: hasYear ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
              borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              background: hasYear ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent",
            }}
          />
          {/* Título */}
          <div className="px-1 text-[10px] font-bold truncate"
            style={{ color: hasTitle ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
            {hasTitle ? event.title : <span className="italic opacity-50">Sin título…</span>}
          </div>
          {/* Acciones */}
          <div className="flex items-center justify-between mt-0.5">
            {reinoNombre && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest truncate"
                style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 50%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)", maxWidth: "80px" }}>
                <Globe size={6} /> {reinoNombre}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity">
              <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
                className="p-1.5 rounded-lg border transition-all"
                style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", background: "transparent" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "#f87171"; el.style.borderColor = "rgba(248,113,113,0.35)"; el.style.background = "rgba(248,113,113,0.06)"; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "color-mix(in srgb, var(--primary) 25%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)"; el.style.background = "transparent"; }}>
                <Trash2 size={11} />
              </button>
              <button type="button" onClick={onSelect}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
                style={isSelected ? {
                  color: "var(--primary)", borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)", background: "color-mix(in srgb, var(--primary) 8%, transparent)"
                } : {
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", background: "transparent"
                }}>
                <ChevronDown size={11} style={{ transform: isSelected ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
                <span>{isSelected ? "Cerrar" : "Editar"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente de línea de tiempo horizontal ────────────────────────────────

function TimelineEditor({
  value,
  onChange,
  reinos = [],
  filtroReinoId,
  capsTimeline = [],
}: {
  value: string;
  onChange: (v: string) => void;
  reinos?: { id: string; nombre: string }[];
  filtroReinoId?: string | null;
  capsTimeline?: CapTimeline[];
}) {
  const [events, setEvents] = useState<TimelineEvent[]>(() => decodeTimeline(value));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { onSnippetAction } = useWikilink();

  const commit = (next: TimelineEvent[]) => {
    setEvents(next);
    onChange(encodeTimeline(next));
  };

  const add = () => {
    const e = newEvent();
    commit([...events, e]);
    setSelectedId(e.id);
  };
  const update = (id: string, patch: Partial<TimelineEvent>) =>
    commit(events.map(e => e.id === id ? { ...e, ...patch } : e));
  const remove = (id: string) => {
    commit(events.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const sorted = [...events].sort((a, b) => compareYears(a.year, b.year));
  const visible = filtroReinoId ? sorted.filter(e => e.reinoId) : sorted;
  const selectedEvent = selectedId ? events.find(e => e.id === selectedId) ?? null : null;

  // Mezclar eventos editables + capítulos de solo lectura, ordenados por año
  type SlotEvt  = { kind: "event"; data: TimelineEvent };
  type SlotCap  = { kind: "cap";   data: CapTimeline };
  type Slot = SlotEvt | SlotCap;

  const allSlots: Slot[] = [
    ...visible.map(e => ({ kind: "event" as const, data: e })),
    ...capsTimeline.map(c => ({ kind: "cap" as const, data: c })),
  ].sort((a, b) => {
    const ya = a.kind === "event" ? parseYear(a.data.year) : a.data.orden_linea_tiempo;
    const yb = b.kind === "event" ? parseYear(b.data.year) : b.data.orden_linea_tiempo;
    if (ya !== yb) return ya - yb;
    // empate: eventos antes que capítulos
    return a.kind === "event" ? -1 : 1;
  });

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Fila 1: Pista horizontal ───────────────────────────────────────── */}
      <div className="overflow-x-auto overflow-y-hidden px-4 py-4"
        style={{ scrollbarWidth: "thin", scrollbarColor: "color-mix(in srgb, var(--primary) 15%, transparent) transparent" }}>

        {/* Aviso filtro activo */}
        {filtroReinoId && sorted.length > visible.length && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
            style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
            <Globe size={10} />
            {sorted.length - visible.length} evento{sorted.length - visible.length !== 1 ? "s" : ""} oculto{sorted.length - visible.length !== 1 ? "s" : ""} por filtro
          </div>
        )}

        {/* Estado vacío */}
        {events.length === 0 && capsTimeline.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-14 rounded-2xl border border-dashed text-center"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            <Globe size={28} strokeWidth={1} style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
            <p className="text-[9px] font-black uppercase tracking-[0.25em]"
              style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
              Sin eventos históricos
            </p>
            <button type="button" onClick={add}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
              style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
              <Plus size={10} /> Añadir primer evento
            </button>
          </div>
        )}

        {(events.length > 0 || capsTimeline.length > 0) && (
          <div className="flex items-start" style={{ minWidth: "max-content", paddingLeft: 8, paddingRight: 8 }}>
            {allSlots.map((slot, idx) => (
              <div key={slot.kind === "event" ? slot.data.id : `cap:${slot.data.id}`} className="flex flex-col shrink-0" style={{ width: 190 }}>
                {/* Conector */}
                <div className="flex items-center" style={{ height: 26 }}>
                  <div className="flex-1 h-px" style={{ background: idx === 0 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                  {slot.kind === "cap" ? (
                    <div className="shrink-0 rounded-full transition-all"
                      style={{
                        width: 8, height: 8,
                        background: "color-mix(in srgb, var(--primary) 55%, var(--accent))",
                        boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent)",
                      }} />
                  ) : (
                    <div className="shrink-0 w-2.5 h-2.5 rounded-full transition-all"
                      style={{
                        background: (slot.data as TimelineEvent).year?.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                        boxShadow: (slot.data as TimelineEvent).year?.trim() ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)" : "none",
                      }} />
                  )}
                  <div className="flex-1 h-px" style={{ background: idx === allSlots.length - 1 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                </div>
                {slot.kind === "cap" ? (
                  <CapituloCard cap={slot.data} />
                ) : (
                  <TimelineCard
                    event={slot.data}
                    isSelected={selectedId === slot.data.id}
                    onSelect={() => setSelectedId(prev => prev === slot.data.id ? null : slot.data.id)}
                    onRemove={() => remove(slot.data.id)}
                    reinos={reinos}
                  />
                )}
              </div>
            ))}

            {/* Botón "+" */}
            {!filtroReinoId && (
              <div className="flex flex-col shrink-0 items-center" style={{ width: 80 }}>
                <div className="flex items-center w-full" style={{ height: 26 }}>
                  <div className="flex-1 h-px" style={{ background: allSlots.length > 0 ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent" }} />
                  <button type="button" onClick={add}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-dashed transition-all"
                    style={{ borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "color-mix(in srgb, var(--primary) 45%, transparent)"; el.style.color = "var(--primary)"; el.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "color-mix(in srgb, var(--primary) 20%, transparent)"; el.style.color = "color-mix(in srgb, var(--primary) 35%, transparent)"; el.style.background = "transparent"; }}>
                    <Plus size={11} />
                  </button>
                  <div className="flex-1 h-px" style={{ background: "transparent" }} />
                </div>
                <span className="text-[7px] font-black uppercase tracking-widest mt-1 text-center"
                  style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                  Nuevo
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fila 2: Panel de edición — ancho completo ─────────────────────── */}
      {selectedEvent && (
        <div className="border-t px-4 py-4 space-y-3"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>

          {/* Header del panel */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <input
                className="bg-transparent outline-none text-[10px] font-black tracking-widest text-center placeholder:text-primary/20 px-2 py-1 rounded-lg border w-28 shrink-0"
                value={selectedEvent.year}
                onChange={e => update(selectedEvent.id, { year: e.target.value })}
                placeholder="Año"
                style={{
                  color: selectedEvent.year?.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                  borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  background: selectedEvent.year?.trim() ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
                }}
              />
              <input
                className="flex-1 min-w-0 bg-transparent outline-none text-sm font-black placeholder:text-primary/25"
                value={selectedEvent.title}
                onChange={e => update(selectedEvent.id, { title: e.target.value })}
                placeholder="Nombre del evento…"
                style={{ color: "var(--primary)" }}
              />
            </div>
            {reinos.length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={selectedEvent.reinoId ?? ""}
                  onChange={e => update(selectedEvent.id, { reinoId: e.target.value || null })}
                  className="appearance-none text-[10px] font-bold rounded-lg px-2.5 py-1.5 outline-none border cursor-pointer pr-7"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                    borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    color: selectedEvent.reinoId ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                  }}>
                  <option value="">— Sin reino —</option>
                  {reinos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <Globe size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: selectedEvent.reinoId ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
              </div>
            )}
            <button type="button" onClick={() => setSelectedId(null)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all"
              style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = "var(--primary)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 28%, transparent)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = "color-mix(in srgb, var(--primary) 40%, transparent)"; el.style.borderColor = "color-mix(in srgb, var(--primary) 12%, transparent)"; }}>
              <X size={11} /> Cerrar
            </button>
          </div>

          {/* Editor de descripción — ancho completo */}
          <MarkdownEditor
            value={selectedEvent.description}
            onChange={v => update(selectedEvent.id, { description: v })}
            placeholder="Descripción del evento, consecuencias, personajes involucrados…"
            rows={10}
            toolbar
            defaultMode="edit"
            onSnippetAction={onSnippetAction}
          />
        </div>
      )}
    </div>
  );
}

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}

// ─── DetalleEditor ─────────────────────────────────────────────────────────────
function DetalleEditor({ detalle, onSaved, onDeleted, onOpenEditor, entities = [] }: {
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
    if (detalle.coord_x !== prevCoords.current.x || detalle.coord_y !== prevCoords.current.y) {
      prevCoords.current = { x: detalle.coord_x, y: detalle.coord_y };
      setForm(f => ({ ...f, coord_x: detalle.coord_x, coord_y: detalle.coord_y }));
    }
  }, [detalle.coord_x, detalle.coord_y]);

  const saveDetalle = async (data: Ciudad) => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("ciudades").update({
        nombre: data.nombre, descripcion: data.descripcion,
        coord_x: data.coord_x, coord_y: data.coord_y, oculto: data.oculto ?? false,
      }).eq("id", data.id);
      if (error) throw error;
      setStatus("saved"); onSaved(data);
      void dexiePut("ciudades", data);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const toggleOculto = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nuevo = { ...form, oculto: !form.oculto };
    setForm(nuevo); await saveDetalle(nuevo);
  };

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
      <ConfirmModal />
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <MapPin size={11} className={`shrink-0 ${form.oculto ? "text-primary/20" : "text-primary/40"}`} />
        <span className={`flex-1 text-[11px] font-black uppercase tracking-widest truncate ${form.oculto ? "text-primary/30 line-through" : "text-primary"}`}>{form.nombre}</span>
        {form.oculto && (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-orange-400/70 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
            <EyeOff size={8} /> Oculto
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); toggleOculto(); }} className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
          form.oculto ? "text-orange-400 bg-orange-400/10 border-orange-400/30" : "text-primary/40 bg-primary/5 border-primary/10 hover:text-primary"
        }`}>
          {form.oculto ? <Eye size={9} /> : <EyeOff size={9} />}
        </button>
        <X size={12} className="text-primary/25 transition-transform duration-200" style={{ transform: expanded ? "rotate(45deg)" : undefined }} />
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t space-y-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Nombre</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={INPUT_CLS + " mt-1"} placeholder="Nombre de la ciudad" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Descripción</label>
            <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
              rows={4} placeholder="Describe esta ciudad…" toolbar defaultMode="edit"
              onSnippetAction={onSnippetAction}
              entities={entities}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={async e => {
                e.stopPropagation();
                const ok = await confirm({ message: `¿Eliminar punto "${form.nombre}"?`, danger: true });
                if (!ok) return;
                await supabase.from("ciudades").delete().eq("id", form.id);
                void dexieDel("ciudades", form.id);
                onDeleted(form.id);
              }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
                <Trash2 size={10} /> Eliminar
              </button>
              {onOpenEditor && (
                <button
                  onClick={e => { e.stopPropagation(); onOpenEditor(form.id); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary/40 hover:text-primary hover:bg-primary/5 transition-all border border-primary/10 hover:border-primary/20"
                >
                  <MapPin size={10} /> Ver ficha
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SaveIndicator status={status} />
              <button onClick={() => saveDetalle(form)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
                <Check size={10} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MapaPanel — mapa izquierda + selector Puntos/Geografía derecha ──────────
type MapaSideTab = "puntos" | "geografia";

function MapaPanel({
  mapaUrl, onMapaChange, onDetallesArrayChange, MapaConPuntosComponent,
  detalles, entities, onDetalleUpdate, onDetalleDelete, onOpenDetalleEditor,
  addingPoint, setAddingPoint, newPointName, setNewPointName, onAddPoint,
  form, setForm, onSnippetAction, reinoId,
}: {
  mapaUrl: string;
  onMapaChange?: (url: string) => void;
  onDetallesArrayChange?: (d: Ciudad[]) => void;
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
  reinoId: string;
}) {
  const [sideTab, setSideTab] = useState<MapaSideTab>("puntos");
  const { lugares, loading: loadingLugares } = useLugaresDelReino(reinoId);

  const SIDE_TABS: { key: MapaSideTab; label: string; Icon: React.ElementType }[] = [
    { key: "puntos", label: "Puntos", Icon: MapPin },
    { key: "geografia", label: "Geografía", Icon: Mountain },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 overflow-y-auto md:overflow-hidden">
      {/* ── Columna izquierda — Mapa ── */}
      <div
        className="flex-1 min-w-0 p-3 overflow-y-auto"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {MapaConPuntosComponent ? (
          <MapaConPuntosComponent
            mapaUrl={mapaUrl}
            onMapaChange={onMapaChange ?? (() => {})}
            detalles={detalles}
            onDetallesChange={(d: any) => onDetallesArrayChange?.(d)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-primary/20 gap-2">
            <Map size={22} strokeWidth={1} />
            <span className="text-[9px] font-black uppercase tracking-widest">Sin mapa</span>
          </div>
        )}
      </div>

      {/* ── Columna derecha — selector + contenido ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Selector de sub-tab */}
        <div
          className="shrink-0 flex items-center gap-1 px-2 py-1.5 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}
        >
          {SIDE_TABS.map(({ key, label, Icon }) => {
            const isActive = sideTab === key;
            const count = key === "puntos" ? detalles.length + lugares.length : 0;
            return (
              <button
                key={key}
                onClick={() => setSideTab(key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                style={isActive ? {
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                  border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                } : {
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                  border: "1px solid transparent",
                }}
              >
                <Icon size={9} />
                {label}
                {count > 0 && (
                  <span
                    className="text-[7px] font-black px-1 py-0.5 rounded-md"
                    style={{
                      background: isActive ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)",
                      color: isActive ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenido del sub-tab */}
        {sideTab === "puntos" ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {detalles.length === 0 && lugares.length === 0 && !addingPoint && (
              <div className="flex flex-col items-center gap-2 py-8 text-primary/20">
                <MapPin size={18} strokeWidth={1} />
                <p className="text-[8px] font-black uppercase tracking-widest text-center">Sin puntos</p>
              </div>
            )}
            {detalles.map(det => (
              <DetalleEditor
                key={det.id}
                detalle={det}
                entities={entities}
                onSaved={d => onDetalleUpdate?.(d)}
                onDeleted={id => onDetalleDelete?.(id)}
                onOpenEditor={onOpenDetalleEditor}
              />
            ))}

            {/* ── Lugares del reino ──────────────────────────────────────── */}
            {loadingLugares ? (
              <div className="flex justify-center py-3">
                <Loader2 size={12} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
              </div>
            ) : lugares.length > 0 && (
              <>
                {(detalles.length > 0) && (
                  <div className="flex items-center gap-2 pt-1 pb-0.5">
                    <MapPin size={8} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                      Lugares
                    </span>
                    <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }} />
                  </div>
                )}
                {lugares.map(lugar => (
                  <div
                    key={lugar.id}
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 1.5%, transparent)" }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <MapPin size={11} className="shrink-0 text-primary/30" />
                      <span className="flex-1 text-[11px] font-black uppercase tracking-widest truncate text-primary/70">
                        {lugar.nombre}
                      </span>
                      {onOpenDetalleEditor && (
                        <button
                          onClick={() => onOpenDetalleEditor(lugar.id)}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-primary/10 text-primary/35 hover:text-primary hover:border-primary/25 hover:bg-primary/5"
                        >
                          <MapPin size={9} /> Ver ficha
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            {addingPoint ? (
              <div className="flex flex-col gap-1.5 p-2 rounded-xl border border-primary/15" style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                <input
                  autoFocus
                  value={newPointName ?? ""}
                  onChange={e => setNewPointName?.(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") onAddPoint?.(); if (e.key === "Escape") setAddingPoint?.(false); }}
                  className="w-full bg-bg-main border border-primary/20 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                  placeholder="NOMBRE..."
                />
                <div className="flex gap-1">
                  <button onClick={onAddPoint} disabled={!newPointName?.trim()}
                    className="flex-1 bg-primary text-btn-text py-1.5 rounded-lg text-[9px] font-black hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center">
                    <Check size={11} />
                  </button>
                  <button onClick={() => setAddingPoint?.(false)} className="px-2 py-1.5 rounded-lg text-primary/40 hover:text-primary transition-all">
                    <X size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingPoint?.(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/15 text-[9px] font-black uppercase text-primary/30 hover:text-primary hover:border-primary/30 transition-all tracking-widest"
              >
                <Plus size={9} /> Añadir
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <MarkdownEditor
              key="geografia"
              value={(form as any).geografia ?? ""}
              onChange={(v) => setForm((f) => ({ ...f, geografia: v }))}
              placeholder="Paisajes, clima, fronteras, ciudades principales…"
              rows={20}
              toolbar
              defaultMode="edit"
              onSnippetAction={onSnippetAction}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tipos mínimos ────────────────────────────────────────────────────────────
type CriaturaMin  = { id: string; nombre: string; imagen_url?: string | null };
type PersonajeMin = { id: string; nombre: string; img_url?: string | null };
type ItemMin      = { id: string; nombre: string; imagen_url?: string | null };
type LugarMin     = { id: string; nombre: string; descripcion?: string | null; imagen_url?: string | null };

// ─── Hook: lugares del reino (lugares.reino_id = reinoId) ─────────────────────
function useLugaresDelReino(reinoId: string) {
  const [lugares, setLugares] = useState<LugarMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reinoId) return;
    supabase
      .from("lugares")
      .select("id, nombre, descripcion, imagen_url")
      .eq("reino_id", reinoId)
      .order("nombre")
      .then(({ data }) => {
        setLugares(data ?? []);
        setLoading(false);
      });
  }, [reinoId]);

  return { lugares, loading };
}

// ─── Hook: criaturas vinculadas al reino (criatura_reinos) ────────────────────
// Soporta add (INSERT) y remove (DELETE) además de carga.
function useCriaturasDelReino(reinoId: string) {
  const [criaturas,    setCriaturas]    = useState<CriaturaMin[]>([]);
  const [allCriaturas, setAllCriaturas] = useState<CriaturaMin[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [rowMap,       setRowMap]       = useState<Record<string, string>>({}); // criaturaId → rowId

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: linked }, { data: all }] = await Promise.all([
      supabase
        .from("criatura_reinos")
        .select("id, criatura_id, criaturas!criatura_id(id, nombre, imagen_url)")
        .eq("reino_id", reinoId),
      supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre"),
    ]);
    if (linked) {
      const map: Record<string, string> = {};
      setCriaturas(linked.map((r: any) => {
        const c = Array.isArray(r.criaturas) ? r.criaturas[0] : r.criaturas;
        map[c?.id ?? r.criatura_id] = r.id;
        return { id: c?.id ?? r.criatura_id, nombre: c?.nombre ?? "—", imagen_url: c?.imagen_url ?? null };
      }));
      setRowMap(map);
    }
    if (all) setAllCriaturas(all);
    setLoading(false);
  }, [reinoId]);

  useEffect(() => { load(); }, [load]);

  const add = async (criaturaId: string) => {
    const { data, error } = await supabase
      .from("criatura_reinos")
      .insert([{ reino_id: reinoId, criatura_id: criaturaId }])
      .select().single();
    if (!error && data) {
      const found = allCriaturas.find(c => c.id === criaturaId);
      if (found) {
        setCriaturas(prev => [...prev, found]);
        setRowMap(prev => ({ ...prev, [criaturaId]: data.id }));
      }
    }
  };

  const remove = async (criaturaId: string) => {
    const rowId = rowMap[criaturaId];
    if (!rowId) return;
    await supabase.from("criatura_reinos").delete().eq("id", rowId);
    setCriaturas(prev => prev.filter(c => c.id !== criaturaId));
    setRowMap(prev => { const next = { ...prev }; delete next[criaturaId]; return next; });
  };

  return { criaturas, allCriaturas, loading, add, remove };
}

// ─── Hook: personajes del reino (personajes.reino = nombre del reino) ─────────
// add → UPDATE personajes SET reino = reinoNombre WHERE id = personajeId
// remove → UPDATE personajes SET reino = null WHERE id = personajeId
function usePersonajesDelReinoEditable(reinoId: string, reinoNombre: string) {
  const [personajes,    setPersonajes]    = useState<PersonajeMin[]>([]);
  const [allPersonajes, setAllPersonajes] = useState<PersonajeMin[]>([]);
  const [loading,       setLoading]       = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: linked }, { data: all }] = await Promise.all([
      supabase
        .from("personajes")
        .select("id, nombre, img_url")
        .eq("reino", reinoNombre)
        .order("nombre"),
      supabase.from("personajes").select("id, nombre, img_url").order("nombre"),
    ]);
    if (linked) setPersonajes(linked);
    if (all)    setAllPersonajes(all);
    setLoading(false);
  }, [reinoNombre]);

  useEffect(() => { if (reinoNombre) load(); }, [load, reinoNombre]);

  const add = async (personajeId: string) => {
    const { error } = await supabase
      .from("personajes")
      .update({ reino: reinoNombre })
      .eq("id", personajeId);
    if (!error) {
      const found = allPersonajes.find(p => p.id === personajeId);
      if (found) setPersonajes(prev => [...prev, found]);
    }
  };

  const remove = async (personajeId: string) => {
    const { error } = await supabase
      .from("personajes")
      .update({ reino: null })
      .eq("id", personajeId);
    if (!error) setPersonajes(prev => prev.filter(p => p.id !== personajeId));
  };

  return { personajes, allPersonajes, loading, add, remove };
}

// ─── Hook: items del reino (items.reino_ids contiene el reinoId) ──────────────
// add → UPDATE items SET reino_ids = array_append(reino_ids, reinoId)
// remove → UPDATE items SET reino_ids = array_remove(reino_ids, reinoId)
function useItemsDelReino(reinoId: string) {
  const [items,    setItems]    = useState<ItemMin[]>([]);
  const [allItems, setAllItems] = useState<ItemMin[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: linked }, { data: all }] = await Promise.all([
      supabase
        .from("items")
        .select("id, nombre, imagen_url")
        .contains("reino_ids", [reinoId])
        .order("nombre"),
      supabase.from("items").select("id, nombre, imagen_url").order("nombre"),
    ]);
    if (linked) setItems(linked);
    if (all)    setAllItems(all);
    setLoading(false);
  }, [reinoId]);

  useEffect(() => { load(); }, [load]);

  const add = async (itemId: string) => {
    // Leemos primero para no pisar otros reinos ya asignados
    const { data: current } = await supabase
      .from("items").select("reino_ids").eq("id", itemId).single();
    const prev = (current?.reino_ids ?? []) as string[];
    if (prev.includes(reinoId)) return;
    const { error } = await supabase
      .from("items")
      .update({ reino_ids: [...prev, reinoId] })
      .eq("id", itemId);
    if (!error) {
      const found = allItems.find(i => i.id === itemId);
      if (found) setItems(p => [...p, found]);
    }
  };

  const remove = async (itemId: string) => {
    const { data: current } = await supabase
      .from("items").select("reino_ids").eq("id", itemId).single();
    const prev = (current?.reino_ids ?? []) as string[];
    const { error } = await supabase
      .from("items")
      .update({ reino_ids: prev.filter(id => id !== reinoId) })
      .eq("id", itemId);
    if (!error) setItems(p => p.filter(i => i.id !== itemId));
  };

  return { items, allItems, loading, add, remove };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function historiaHasContent(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  const events = decodeTimeline(raw);
  return events.some((e) => e.year.trim() || e.title.trim() || e.description.trim());
}

// ─── NAV config ───────────────────────────────────────────────────────────────

type SectionId = "mapa" | "historia" | "cultura" | "politica" | "economia" | "puntos" | "geografia";

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
  const [activeTab, setActiveTab] = useState<"mapa" | "cultura" | "economia" | "politica">(
    (activeTabProp === "mapa") ? "mapa"
    : (activeTabProp && activeTabProp !== "historia") ? activeTabProp as any
    : "cultura"
  );
  const {
    criaturas, allCriaturas, loading: loadingCriaturas,
    add: addCriatura, remove: removeCriatura,
  } = useCriaturasDelReino(form.id);
  const {
    personajes: personajesEditables, allPersonajes, loading: loadingPersonajesEditables,
    add: addPersonaje, remove: removePersonaje,
  } = usePersonajesDelReinoEditable(form.id, form.nombre);
  const {
    items, allItems, loading: loadingItems,
    add: addItem, remove: removeItem,
  } = useItemsDelReino(form.id);
  const capsTimeline = useCapitulosDelReino(form.id);

  // Estado saving por sección
  const [savingCriaturas,  setSavingCriaturas]  = useState(false);
  const [savingPersonajes, setSavingPersonajes]  = useState(false);
  const [savingItems,      setSavingItems]       = useState(false);
  const [_mobileAsideOpen, _setMobileAsideOpen]  = useState(false);
  const mobileAsideOpen    = mobileAsideOpenProp    ?? _mobileAsideOpen;
  const setMobileAsideOpen = setMobileAsideOpenProp ?? _setMobileAsideOpen;

  const handleToggleCriatura = async (id: string, add: boolean) => {
    setSavingCriaturas(true);
    if (add) await addCriatura(id); else await removeCriatura(id);
    setSavingCriaturas(false);
  };
  const handleTogglePersonaje = async (id: string, add: boolean) => {
    setSavingPersonajes(true);
    if (add) await addPersonaje(id); else await removePersonaje(id);
    setSavingPersonajes(false);
  };
  const handleToggleItem = async (id: string, add: boolean) => {
    setSavingItems(true);
    if (add) await addItem(id); else await removeItem(id);
    setSavingItems(false);
  };

  // ── Etiqueta de sección ───────────────────────────────────────────────────
  const SectionHeader = ({ id, label, Icon }: { id: SectionId; label: string; Icon: React.ElementType }) => (
    <header
      id={`lore-section-${id}`}
      className="flex items-center gap-1.5 mb-2 select-none"
    >
      <Icon size={10} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
      <span
        className="text-[9px] font-black uppercase tracking-[0.22em]"
        style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      />
    </header>
  );

  const TABS = [
    { id: "mapa",      label: "Mapa"      },
    { id: "cultura",   label: "Cultura"   },
    { id: "economia",  label: "Economía"  },
    { id: "politica",  label: "Política"  },
  ] as const;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">

      {/* ── COLUMNA 1 — Tabs + Editor central ───────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">

        {/* Área de contenido — scroll completo */}
        <main
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="p-3 flex flex-col gap-4">

            {/* HISTORIA — siempre visible */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                minHeight: 200,
              }}
            >
              <TimelineEditor
                key="historia-timeline"
                value={(form as any).historia ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, historia: v }))}
                reinos={reinos}
                filtroReinoId={filtroReinoId}
                capsTimeline={capsTimeline}
              />
            </div>

            {/* BARRA DE TABS */}
            <div
              className="flex items-stretch border-b"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
                background: "color-mix(in srgb, var(--primary) 2%, transparent)",
                marginLeft: "-0.75rem",
                marginRight: "-0.75rem",
                paddingLeft: "0",
              }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-all border-b-2"
                  style={activeTab === tab.id ? {
                    borderColor: "var(--primary)",
                    color: "var(--primary)",
                  } : {
                    borderColor: "transparent",
                    color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* MAPA — tab activo */}
            {activeTab === "mapa" && (
              <MapaPanel
                mapaUrl={mapaUrl}
                onMapaChange={onMapaChange}
                onDetallesArrayChange={onDetallesArrayChange}
                MapaConPuntosComponent={MapaConPuntosComponent}
                detalles={detalles}
                entities={entities}
                onDetalleUpdate={onDetalleUpdate}
                onDetalleDelete={onDetalleDelete}
                onOpenDetalleEditor={onOpenDetalleEditor}
                addingPoint={addingPoint}
                setAddingPoint={setAddingPoint}
                newPointName={newPointName}
                setNewPointName={setNewPointName}
                onAddPoint={onAddPoint}
                form={form}
                setForm={setForm}
                onSnippetAction={onSnippetAction}
                reinoId={form.id}
              />
            )}

            {/* CULTURA / ECONOMÍA / POLÍTICA — tab activo */}
            {activeTab === "cultura" && (
              <MarkdownEditor
                key="cultura"
                value={(form as any).cultura ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, cultura: v }))}
                placeholder="Tradiciones, religión, idioma, costumbres, arte…"
                rows={12}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            )}
            {activeTab === "politica" && (
              <MarkdownEditor
                key="politica"
                value={(form as any).politica ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, politica: v }))}
                placeholder="Sistema de gobierno, facciones, líderes, leyes…"
                rows={12}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            )}
            {activeTab === "economia" && (
              <MarkdownEditor
                key="economia"
                value={(form as any).economia ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, economia: v }))}
                placeholder="Recursos, comercio, moneda, riqueza…"
                rows={12}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            )}

          </div>
        </main>

      </div>{/* fin columna tabs+editor */}

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
        <SeccionEntidad label="Personajes" icon={<Users size={9} />} fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />} emptyLabel="Sin personajes" allEntities={allPersonajes.map(p => ({ id: p.id, nombre: p.nombre, imagen_url: p.img_url }))} selectedIds={personajesEditables.map(p => p.id)} loading={loadingPersonajesEditables} saving={savingPersonajes} onToggle={handleTogglePersonaje} onEntityClick={id => { const p = personajesEditables.find(x => x.id === id); if (p) onSelectPersonaje?.(p as any); }} />
        <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
        <SeccionEntidad label="Criaturas" icon={<Bug size={9} />} fallbackIcon={<Bug size={14} strokeWidth={1} />} emptyLabel="Sin criaturas" allEntities={allCriaturas.map(c => ({ id: c.id, nombre: c.nombre, imagen_url: c.imagen_url }))} selectedIds={criaturas.map(c => c.id)} loading={loadingCriaturas} saving={savingCriaturas} onToggle={handleToggleCriatura} onEntityClick={id => onSelectCriatura?.(id)} />
        <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
        <SeccionEntidad label="Items" icon={<Package size={9} />} fallbackIcon={<Package size={14} strokeWidth={1} />} emptyLabel="Sin items" allEntities={allItems.map(i => ({ id: i.id, nombre: i.nombre, imagen_url: i.imagen_url }))} selectedIds={items.map(i => i.id)} loading={loadingItems} saving={savingItems} onToggle={handleToggleItem} onEntityClick={id => onSelectItem?.(id)} />
      </aside>

      {/* Mobile: drawer desde la derecha */}
      {mobileAsideOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0"
            style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            onClick={() => setMobileAsideOpen(false)}
          />
          <div
            className="relative flex flex-col h-full overflow-y-auto shadow-2xl"
            style={{
              width: "220px",
              background: "var(--white-custom, var(--bg-main))",
              borderLeft: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              scrollbarWidth: "none",
            }}
          >
            {/* Header del drawer */}
            <div
              className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
            >
              <span className="text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                <SlidersHorizontal size={9} /> Entidades
              </span>
              <button onClick={() => setMobileAsideOpen(false)} className="p-1 rounded-lg text-primary/30 hover:text-primary hover:bg-primary/8 transition-all">
                <X size={14} />
              </button>
            </div>
            <SeccionEntidad label="Personajes" icon={<Users size={9} />} fallbackIcon={<UserCircle2 size={14} strokeWidth={1} />} emptyLabel="Sin personajes" allEntities={allPersonajes.map(p => ({ id: p.id, nombre: p.nombre, imagen_url: p.img_url }))} selectedIds={personajesEditables.map(p => p.id)} loading={loadingPersonajesEditables} saving={savingPersonajes} onToggle={handleTogglePersonaje} onEntityClick={id => { const p = personajesEditables.find(x => x.id === id); if (p) onSelectPersonaje?.(p as any); }} />
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            <SeccionEntidad label="Criaturas" icon={<Bug size={9} />} fallbackIcon={<Bug size={14} strokeWidth={1} />} emptyLabel="Sin criaturas" allEntities={allCriaturas.map(c => ({ id: c.id, nombre: c.nombre, imagen_url: c.imagen_url }))} selectedIds={criaturas.map(c => c.id)} loading={loadingCriaturas} saving={savingCriaturas} onToggle={handleToggleCriatura} onEntityClick={id => onSelectCriatura?.(id)} />
            <div style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            <SeccionEntidad label="Items" icon={<Package size={9} />} fallbackIcon={<Package size={14} strokeWidth={1} />} emptyLabel="Sin items" allEntities={allItems.map(i => ({ id: i.id, nombre: i.nombre, imagen_url: i.imagen_url }))} selectedIds={items.map(i => i.id)} loading={loadingItems} saving={savingItems} onToggle={handleToggleItem} onEntityClick={id => onSelectItem?.(id)} />
          </div>
        </div>
      )}

    </div>
  );
}