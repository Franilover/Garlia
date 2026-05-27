import React, { useState, useRef, useEffect } from "react";
import { Globe, Mountain, Landmark, Users, Coins, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, UserCircle2, Loader2, MapPin, Map, Check, X, Eye, EyeOff } from "lucide-react";
import { INPUT_CLS, type SaveStatus } from "./types";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "./WikilinkContext";
import { type Reino } from "./types";
import { type Lugar } from "@/components/paginas/myself/garlia/editores/EditorLugar";
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

// ─── Tarjeta horizontal de evento (igual que EditorMundo) ───────────────────

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
}: {
  value: string;
  onChange: (v: string) => void;
  reinos?: { id: string; nombre: string }[];
  filtroReinoId?: string | null;
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
        {events.length === 0 && (
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

        {events.length > 0 && (
          <div className="flex items-start" style={{ minWidth: "max-content", paddingLeft: 8, paddingRight: 8 }}>
            {visible.map((evt, idx) => (
              <div key={evt.id} className="flex flex-col shrink-0" style={{ width: 190 }}>
                {/* Conector */}
                <div className="flex items-center" style={{ height: 26 }}>
                  <div className="flex-1 h-px" style={{ background: idx === 0 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                  <div className="shrink-0 w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      background: evt.year?.trim() ? "var(--primary)" : "color-mix(in srgb, var(--primary) 20%, transparent)",
                      boxShadow: evt.year?.trim() ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)" : "none",
                    }} />
                  <div className="flex-1 h-px" style={{ background: idx === visible.length - 1 ? "transparent" : "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                </div>
                <TimelineCard
                  event={evt}
                  isSelected={selectedId === evt.id}
                  onSelect={() => setSelectedId(prev => prev === evt.id ? null : evt.id)}
                  onRemove={() => remove(evt.id)}
                  reinos={reinos}
                />
              </div>
            ))}

            {/* Botón "+" */}
            {!filtroReinoId && (
              <div className="flex flex-col shrink-0 items-center" style={{ width: 80 }}>
                <div className="flex items-center w-full" style={{ height: 26 }}>
                  <div className="flex-1 h-px" style={{ background: visible.length > 0 ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent" }} />
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
  detalle: Lugar;
  onSaved: (d: Lugar) => void;
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

  const saveDetalle = async (data: Lugar) => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("lugares").update({
        nombre: data.nombre, descripcion: data.descripcion,
        coord_x: data.coord_x, coord_y: data.coord_y, oculto: data.oculto ?? false,
      }).eq("id", data.id);
      if (error) throw error;
      setStatus("saved"); onSaved(data);
      void dexiePut("lugares", data);
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
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={INPUT_CLS + " mt-1"} placeholder="Nombre del lugar" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Descripción</label>
            <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
              rows={4} placeholder="Describe este lugar…" toolbar defaultMode="edit"
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
                await supabase.from("lugares").delete().eq("id", form.id);
                void dexieDel("lugares", form.id);
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
  form, setForm, onSnippetAction,
}: {
  mapaUrl: string;
  onMapaChange?: (url: string) => void;
  onDetallesArrayChange?: (d: Lugar[]) => void;
  MapaConPuntosComponent?: React.ComponentType<any>;
  detalles: Lugar[];
  entities: WikiEntity[];
  onDetalleUpdate?: (d: Lugar) => void;
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
}) {
  const [sideTab, setSideTab] = useState<MapaSideTab>("puntos");

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
            const count = key === "puntos" ? detalles.length : 0;
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
            {detalles.length === 0 && !addingPoint && (
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function historiaHasContent(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  const events = decodeTimeline(raw);
  return events.some((e) => e.year.trim() || e.title.trim() || e.description.trim());
}

// ─── NAV config ───────────────────────────────────────────────────────────────

type SectionId = "mapa" | "historia" | "cultura" | "politica" | "economia";

// ─── Componente principal — Doble columna con infinity scroll ────────────────

export function LoreTab({
  form,
  setForm,
  entities = [],
  personajes = [],
  loadingPersonajes = false,
  onSelectPersonaje,
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
}: {
  form: Reino;
  setForm: React.Dispatch<React.SetStateAction<Reino>>;
  entities?: WikiEntity[];
  personajes?: Personaje[];
  loadingPersonajes?: boolean;
  onSelectPersonaje?: (personaje: Personaje) => void;
  reinos?: { id: string; nombre: string }[];
  filtroReinoId?: string | null;
  detalles?: Lugar[];
  onDetallesChange?: (updated: Lugar) => void;
  onDeleteDetalle?: (id: string) => void;
  onAddPoint?: () => void;
  addingPoint?: boolean;
  setAddingPoint?: (v: boolean) => void;
  newPointName?: string;
  setNewPointName?: (v: string) => void;
  onDetalleUpdate?: (d: Lugar) => void;
  onDetalleDelete?: (id: string) => void;
  onOpenDetalleEditor?: (id: string) => void;
  mapaUrl?: string;
  onMapaChange?: (url: string) => void;
  onDetallesArrayChange?: (d: Lugar[]) => void;
  MapaConPuntosComponent?: React.ComponentType<any>;
}) {
  const { onSnippetAction } = useWikilink();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-full min-h-0 overflow-hidden">

      {/* ── COLUMNA 1 — Editor central (infinity scroll) ────────────────────── */}
      <main
        ref={scrollRef}
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="p-3 space-y-6">

          {/* SECCIÓN: MAPA */}
          <section>
            <SectionHeader id="mapa" label="Mapa & Puntos" Icon={Map} />
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
            />
          </section>

          {/* SECCIÓN: HISTORIA */}
          <section>
            <SectionHeader id="historia" label="Historia" Icon={Globe} />
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
              />
            </div>
          </section>

          {/* SECCIÓN: CULTURA */}
          <section>
            <SectionHeader id="cultura" label="Cultura" Icon={Landmark} />
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
          </section>

          {/* SECCIÓN: POLÍTICA */}
          <section>
            <SectionHeader id="politica" label="Política" Icon={Users} />
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
          </section>

          {/* SECCIÓN: ECONOMÍA */}
          <section>
            <SectionHeader id="economia" label="Economía" Icon={Coins} />
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
          </section>

          {/* Espaciado final para que la última sección sea jumpeable */}
          <div className="h-24" />
        </div>
      </main>

      {/* ── COLUMNA 3 — Utilidades (220px) ──────────────────────────────────── */}
      <aside
        className="shrink-0 w-52 flex flex-col border-l overflow-hidden"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)",
          background: "color-mix(in srgb, var(--primary) 1%, transparent)",
        }}
      >
        {/* Personajes */}
        <div
          className="flex flex-col min-h-0"
          style={{
            borderBottom: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)",
            maxHeight: "55%",
          }}
        >
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)" }}>
            <Users size={9} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <span className="text-[8px] font-black uppercase tracking-[0.22em]"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              Personajes
            </span>
            {personajes.length > 0 && (
              <span
                className="ml-auto text-[7px] font-black px-1 py-0.5 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
              >
                {personajes.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5" style={{ scrollbarWidth: "none" }}>
            {loadingPersonajes ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={12} className="animate-spin text-primary/20" />
              </div>
            ) : personajes.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-6 text-primary/20">
                <UserCircle2 size={18} strokeWidth={1} />
                <p className="text-[8px] font-black uppercase tracking-widest text-center">Sin personajes</p>
              </div>
            ) : (
              personajes.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelectPersonaje?.(p)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all group"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div
                    className="shrink-0 w-5 h-5 rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    }}
                  >
                    {p.img_url
                      ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                      : <UserCircle2 size={9} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }} />}
                  </div>
                  <span
                    className="flex-1 min-w-0 text-[10px] font-bold truncate transition-colors"
                    style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
                  >
                    {p.nombre}
                  </span>
                  <ChevronRight size={8} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Mapa miniatura */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 border-b"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 7%, transparent)" }}>
            <Map size={9} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
            <span className="text-[8px] font-black uppercase tracking-[0.22em]"
              style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
              Mapa
            </span>
            {detalles.length > 0 && (
              <span
                className="ml-auto text-[7px] font-black px-1 py-0.5 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 45%, transparent)",
                }}
              >
                {detalles.length}
              </span>
            )}
          </div>
          <div className="flex-1 p-2 overflow-hidden">
            {mapaUrl ? (
              <button
                onClick={() => document.getElementById("lore-section-mapa")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="w-full h-full relative overflow-hidden rounded-lg transition-all group"
                style={{
                  background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                }}
                title="Ir al mapa"
              >
                <img
                  src={mapaUrl}
                  alt="Mapa"
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
                {/* Puntos sobre miniatura */}
                {detalles.filter(d => d.coord_x != null && d.coord_y != null).map(d => (
                  <div
                    key={d.id}
                    className="absolute w-1.5 h-1.5 rounded-full border border-white/80 shadow-sm"
                    style={{
                      top: `${d.coord_y ?? 50}%`,
                      left: `${d.coord_x ?? 50}%`,
                      transform: "translate(-50%, -50%)",
                      background: "var(--primary)",
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/8 transition-colors flex items-center justify-center">
                  <span className="text-[8px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                    Ver mapa
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => document.getElementById("lore-section-mapa")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 rounded-lg transition-all"
                style={{
                  background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                  border: "1px dashed color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                <Map size={14} style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }} strokeWidth={1} />
                <span className="text-[7px] font-black uppercase tracking-widest"
                  style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}>
                  Sin mapa
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>

    </div>
  );
}