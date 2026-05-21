import React, { useState, useRef, useEffect } from "react";
import { Globe, Mountain, Landmark, Users, Coins, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, UserCircle2, Loader2, MapPin, Map, Check, X, Eye, EyeOff } from "lucide-react";
import { INPUT_CLS, type ReinoDetalle, type SaveStatus } from "./types";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { type Reino } from "./types";
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

// ─── Componente de línea de tiempo ───────────────────────────────────────────

/** Ordena años lexicográficamente por su parte numérica, respetando ceros iniciales.
 *  "0001" < "0002" < "0003" < "02" < "1" < "10" < "100"
 *  Los ceros definen el "grupo" (0001 es antes que 02 que es antes que 1).
 *  Texto puro sin números queda al final.
 */
function parseYear(year: string): string {
  if (!year?.trim()) return "~";
  const normalized = year.replace(/(\d)[.,](\d{3})/g, "$1$2");
  const match = normalized.match(/(-?)(\d+)/);
  if (!match) return "~" + year;
  const negative = match[1] === "-";
  const digits = match[2];
  if (negative) {
    // Negativos van primero: invertimos para que -100 < -10 < -1
    return "!" + digits.split("").reverse().join("").padEnd(30, "0");
  }
  return digits; // lexicográfico puro
}

function TimelineEditor({
  value,
  onChange,
  reinos = [],
  filtroReinoId,
}: {
  value: string;
  onChange: (v: string) => void;
  reinos?: { id: string; nombre: string }[];
  filtroReinoId?: string | null; // cuando hay filtro activo, se ocultan eventos sin reino
}) {
  const [events, setEvents] = useState<TimelineEvent[]>(() => decodeTimeline(value));

  const commit = (next: TimelineEvent[]) => {
    setEvents(next);
    onChange(encodeTimeline(next));
  };

  const add = () => commit([...events, newEvent()]);

  const update = (id: string, patch: Partial<TimelineEvent>) =>
    commit(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string) => commit(events.filter((e) => e.id !== id));

  // Ordenar y luego filtrar: si hay filtro activo, ocultar eventos "Mundo" (sin reinoId)
  const sorted = [...events].sort((a, b) => parseYear(a.year).localeCompare(parseYear(b.year)));
  const visible = filtroReinoId
    ? sorted.filter((e) => e.reinoId) // ocultar los de Mundo cuando hay filtro de reino
    : sorted;

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Lista de eventos ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0">

        {events.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 py-14 rounded-2xl border border-dashed text-center"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          >
            <Globe
              size={28}
              strokeWidth={1}
              style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
            />
            <p
              className="text-[9px] font-black uppercase tracking-[0.25em]"
              style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
            >
              Sin eventos históricos
            </p>
            <button
              type="button"
              onClick={add}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                color: "color-mix(in srgb, var(--primary) 60%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              }}
            >
              <Plus size={10} /> Añadir primer evento
            </button>
          </div>
        )}

        {/* Aviso cuando hay eventos de Mundo ocultos por filtro */}
        {filtroReinoId && sorted.length > visible.length && (
          <div
            className="mb-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1px dashed color-mix(in srgb, var(--primary) 15%, transparent)",
              color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            }}
          >
            <Globe size={10} />
            {sorted.length - visible.length} evento{sorted.length - visible.length !== 1 ? "s" : ""} de Mundo oculto{sorted.length - visible.length !== 1 ? "s" : ""} por el filtro
          </div>
        )}

        {visible.map((evt, idx) => (
          <TimelineRow
            key={evt.id}
            event={evt}
            index={idx}
            total={visible.length}
            onUpdate={(patch) => update(evt.id, patch)}
            onRemove={() => remove(evt.id)}
            onMove={() => {}}
            reinos={reinos}
          />
        ))}
      </div>

      {/* ── Botón añadir ────────────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div
          className="shrink-0 px-4 py-3 border-t"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        >
          <button
            type="button"
            onClick={add}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            style={{
              border: "1px dashed color-mix(in srgb, var(--primary) 20%, transparent)",
              color: "color-mix(in srgb, var(--primary) 40%, transparent)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "color-mix(in srgb, var(--primary) 40%, transparent)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "color-mix(in srgb, var(--primary) 5%, transparent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "color-mix(in srgb, var(--primary) 40%, transparent)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "color-mix(in srgb, var(--primary) 20%, transparent)";
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <Plus size={10} /> Añadir evento
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Fila de evento ───────────────────────────────────────────────────────────

function TimelineRow({
  event,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  reinos = [],
}: {
  event: TimelineEvent;
  index: number;
  total: number;
  onUpdate: (patch: Partial<TimelineEvent>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  reinos?: { id: string; nombre: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const { onSnippetAction } = useWikilink();

  const hasYear  = !!event.year?.trim();
  const hasTitle = !!event.title?.trim();
  const hasDesc  = !!event.description?.trim();

  return (
    <div className="relative flex gap-0 group/row">

      {/* ── Línea vertical del timeline ──────────────────────────────────── */}
      <div className="flex flex-col items-center" style={{ width: 32, flexShrink: 0 }}>
        <div
          className="relative z-10 mt-[22px] w-2.5 h-2.5 rounded-full shrink-0 transition-all"
          style={{
            background: hasYear
              ? "var(--primary)"
              : "color-mix(in srgb, var(--primary) 20%, transparent)",
            boxShadow: hasYear
              ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)"
              : "none",
          }}
        />
        {index < total - 1 && (
          <div
            className="flex-1 w-px mt-1"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, transparent)",
              minHeight: 32,
            }}
          />
        )}
      </div>

      {/* ── Tarjeta ──────────────────────────────────────────────────────── */}
      <div
        className="flex-1 mb-3 rounded-2xl overflow-hidden transition-all"
        style={{
          border: `1px solid ${expanded
            ? "color-mix(in srgb, var(--primary) 22%, transparent)"
            : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
          background: expanded
            ? "color-mix(in srgb, var(--primary) 4%, transparent)"
            : "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >

        {/* ── Cabecera clicable ─────────────────────────────────────────── */}
        <div
          className="flex items-stretch cursor-pointer select-none"
          onClick={() => setExpanded((x) => !x)}
        >

          {/* BLOQUE AÑO */}
          <div
            className="shrink-0 flex items-center justify-center border-r"
            style={{
              width: 76,
              borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
              background: hasYear
                ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                : "color-mix(in srgb, var(--primary) 3%, transparent)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="bg-transparent outline-none w-full text-[10px] font-black tracking-widest text-center placeholder:text-primary/20 px-2 py-3"
              value={event.year}
              onChange={(e) => onUpdate({ year: e.target.value })}
              placeholder="Año"
              style={{
                color: hasYear
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 30%, transparent)",
              }}
            />
          </div>

          {/* BLOQUE TÍTULO */}
          <div
            className="flex-1 flex items-center min-w-0 px-3 py-2.5 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="bg-transparent outline-none flex-1 min-w-0 text-[12px] font-bold placeholder:text-primary/20 transition-colors"
              value={event.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Nombre del evento…"
              style={{
                color: hasTitle
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            />
            {/* Badge reino */}
            {event.reinoId && reinos.length > 0 && (() => {
              const r = reinos.find(r => r.id === event.reinoId);
              return r ? (
                <span
                  className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md hidden sm:block"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    color: "color-mix(in srgb, var(--primary) 55%, transparent)",
                    maxWidth: 80,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.nombre}
                </span>
              ) : null;
            })()}
            {/* Badge "detalle" cuando hay descripción y está cerrado */}
            {hasDesc && !expanded && (
              <span
                className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md hidden sm:block"
                style={{
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
              >
                ver más
              </span>
            )}
          </div>

          {/* Controles de orden — ocultos (el orden es automático por año) */}

          {/* Botón eliminar — hover */}
          <div
            className="shrink-0 flex items-center px-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#f87171")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "color-mix(in srgb, var(--primary) 25%, transparent)")}
            >
              <Trash2 size={10} />
            </button>
          </div>

          {/* Chevron toggle — siempre visible */}
          <div
            className="shrink-0 flex items-center px-3 border-l"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <ChevronDown
              size={11}
              style={{
                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </div>
        </div>

        {/* ── Panel expandible con MarkdownEditor ──────────────────────── */}
        {expanded && (
          <div
            className="px-3 pb-3 pt-3 flex flex-col gap-3"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            {/* ── Selector de reino ─────────────────────────────────────── */}
            {reinos.length > 0 && (
              <div className="flex items-center gap-2">
                <span
                  className="shrink-0 text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                >
                  Reino
                </span>
                <select
                  value={event.reinoId ?? ""}
                  onChange={(e) => onUpdate({ reinoId: e.target.value || null })}
                  className="flex-1 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none transition-all"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
                    color: event.reinoId
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                >
                  <option value="">— Mundo (sin reino) —</option>
                  {reinos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
                {event.reinoId && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ reinoId: null })}
                    className="shrink-0 p-1.5 rounded-lg transition-all"
                    title="Quitar reino"
                    style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#f87171")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "color-mix(in srgb, var(--primary) 30%, transparent)")}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

            <MarkdownEditor
              value={event.description}
              onChange={(v) => onUpdate({ description: v })}
              placeholder="Descripción del evento, consecuencias, personajes involucrados…"
              rows={14}
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

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}

// ─── DetalleEditor ─────────────────────────────────────────────────────────────
function DetalleEditor({ detalle, onSaved, onDeleted, entities = [] }: {
  detalle: ReinoDetalle; onSaved: (d: ReinoDetalle) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
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

  const saveDetalle = async (data: ReinoDetalle) => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("reino_detalles").update({
        nombre: data.nombre, descripcion: data.descripcion,
        coord_x: data.coord_x, coord_y: data.coord_y, oculto: data.oculto ?? false,
      }).eq("id", data.id);
      if (error) throw error;
      setStatus("saved"); onSaved(data);
      void dexiePut("reino_detalles", data);
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
        <button onClick={toggleOculto} className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${
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
            <button onClick={async () => {
              const ok = await confirm({ message: `¿Eliminar punto "${form.nombre}"?`, danger: true });
              if (!ok) return;
              await supabase.from("reino_detalles").delete().eq("id", form.id);
              void dexieDel("reino_detalles", form.id);
              onDeleted(form.id);
            }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
              <Trash2 size={10} /> Eliminar
            </button>
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
  detalles, entities, onDetalleUpdate, onDetalleDelete,
  addingPoint, setAddingPoint, newPointName, setNewPointName, onAddPoint,
  form, setForm, onSnippetAction,
}: {
  mapaUrl: string;
  onMapaChange?: (url: string) => void;
  onDetallesArrayChange?: (d: ReinoDetalle[]) => void;
  MapaConPuntosComponent?: React.ComponentType<any>;
  detalles: ReinoDetalle[];
  entities: WikiEntity[];
  onDetalleUpdate?: (d: ReinoDetalle) => void;
  onDetalleDelete?: (id: string) => void;
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

// ─── Definición de secciones ─────────────────────────────────────────────────

type LoreKey = "historia_cultura" | "politica_economia" | "personajes" | "mapa";

const LORE_SECTIONS: {
  key: LoreKey;
  label: string;
  Icon: React.ElementType;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "mapa",
    label: "Mapa & Puntos",
    Icon: Map,
    placeholder: "",
    rows: 0,
  },
  {
    key: "historia_cultura",
    label: "Historia & Cultura",
    Icon: Globe,
    placeholder: "",
    rows: 0,
  },
  {
    key: "politica_economia",
    label: "Política & Economía",
    Icon: Users,
    placeholder: "",
    rows: 0,
  },
  {
    key: "personajes",
    label: "Personajes",
    Icon: UserCircle2,
    placeholder: "",
    rows: 0,
  },
];

// ─── Helpers para saber si historia tiene contenido ───────────────────────────

function historiaHasContent(raw: string | undefined): boolean {
  if (!raw?.trim()) return false;
  const events = decodeTimeline(raw);
  return events.some((e) => e.year.trim() || e.title.trim() || e.description.trim());
}

// ─── Componente principal ─────────────────────────────────────────────────────

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
  detalles?: ReinoDetalle[];
  onDetallesChange?: (updated: ReinoDetalle) => void;
  onDeleteDetalle?: (id: string) => void;
  onAddPoint?: () => void;
  addingPoint?: boolean;
  setAddingPoint?: (v: boolean) => void;
  newPointName?: string;
  setNewPointName?: (v: string) => void;
  onDetalleUpdate?: (d: ReinoDetalle) => void;
  onDetalleDelete?: (id: string) => void;
  mapaUrl?: string;
  onMapaChange?: (url: string) => void;
  onDetallesArrayChange?: (d: ReinoDetalle[]) => void;
  MapaConPuntosComponent?: React.ComponentType<any>;
}) {
  const [activeKey, setActiveKey] = useState<LoreKey>("historia_cultura");
  const { onSnippetAction } = useWikilink();

  const active = LORE_SECTIONS.find((s) => s.key === activeKey)!;

  // Función para determinar si una sección tiene contenido
  const sectionHasContent = (key: LoreKey): boolean => {
    if (key === "personajes") return personajes.length > 0;
    if (key === "mapa") return !!mapaUrl || detalles.length > 0;
    if (key === "historia_cultura") return historiaHasContent((form as any).historia) || !!((form as any).cultura?.trim());
    if (key === "politica_economia") return !!((form as any).politica?.trim()) || !!((form as any).economia?.trim());
    const raw = (form as any)[key] as string | undefined;
    return !!raw?.trim();
  };

  const sectionCount = (key: LoreKey): number => {
    if (key === "personajes") return personajes.length;
    if (key === "mapa") return detalles.length;
    if (key === "historia_cultura") {
      const events = decodeTimeline((form as any).historia ?? "");
      return events.filter(e => e.year.trim() || e.title.trim()).length;
    }
    return 0;
  };

  const TAB_SECTIONS: { key: LoreKey; label: string; Icon: React.ElementType }[] = [
    { key: "mapa",              label: "Mapa",      Icon: Map },
    { key: "historia_cultura",  label: "Historia",  Icon: Globe },
    { key: "politica_economia", label: "Política",  Icon: Users },
    { key: "personajes",        label: "Personajes", Icon: UserCircle2 },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Barra de tabs horizontal ─────────────────────────────────────────── */}
      <nav
        className="shrink-0 flex items-stretch gap-0 border-b overflow-x-auto"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {TAB_SECTIONS.map(({ key, label, Icon }) => {
          const isActive = key === activeKey;
          const hasContent = sectionHasContent(key);
          const count = sectionCount(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className="relative flex items-center gap-1.5 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all"
              style={
                isActive
                  ? {
                      color: "var(--primary)",
                      borderBottom: "2px solid var(--primary)",
                      background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                    }
                  : {
                      color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                      borderBottom: "2px solid transparent",
                    }
              }
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 65%, transparent)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--primary) 35%, transparent)";
              }}
            >
              <Icon size={11} />
              {label}
              {/* Badge numérico */}
              {count > 0 && (
                <span
                  className="text-[7px] font-black px-1 py-0.5 rounded-full min-w-[14px] text-center"
                  style={{
                    background: isActive
                      ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                      : "color-mix(in srgb, var(--primary) 8%, transparent)",
                    color: isActive
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 45%, transparent)",
                  }}
                >
                  {count}
                </span>
              )}
              {/* Dot — tiene contenido de texto */}
              {hasContent && count === 0 && (
                <span
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: isActive
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 30%, transparent)",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Panel editor ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Contenido */}
        <div className="flex-1 min-h-0 overflow-auto md:overflow-hidden">
          {activeKey === "mapa" ? (
            <MapaPanel
              mapaUrl={mapaUrl}
              onMapaChange={onMapaChange}
              onDetallesArrayChange={onDetallesArrayChange}
              MapaConPuntosComponent={MapaConPuntosComponent}
              detalles={detalles}
              entities={entities}
              onDetalleUpdate={onDetalleUpdate}
              onDetalleDelete={onDetalleDelete}
              addingPoint={addingPoint}
              setAddingPoint={setAddingPoint}
              newPointName={newPointName}
              setNewPointName={setNewPointName}
              onAddPoint={onAddPoint}
              form={form}
              setForm={setForm}
              onSnippetAction={onSnippetAction}
            />
          ) : activeKey === "historia_cultura" ? (
            <div className="flex flex-col md:flex-row h-full min-h-0 overflow-y-auto md:overflow-hidden">
              {/* Columna izquierda — Historia (timeline) */}
              <div
                className="flex-1 min-w-0 flex flex-col overflow-hidden"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
              >
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <Globe size={9} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/35">Historia</span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <TimelineEditor
                    key="historia-timeline"
                    value={(form as any).historia ?? ""}
                    onChange={(v) => setForm((f) => ({ ...f, historia: v }))}
                    reinos={reinos}
                    filtroReinoId={filtroReinoId}
                  />
                </div>
              </div>
              {/* Columna derecha — Cultura */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <Landmark size={9} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/35">Cultura</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <MarkdownEditor
                    key="cultura"
                    value={(form as any).cultura ?? ""}
                    onChange={(v) => setForm((f) => ({ ...f, cultura: v }))}
                    placeholder="Tradiciones, religión, idioma, costumbres, arte…"
                    rows={20}
                    toolbar
                    defaultMode="edit"
                    onSnippetAction={onSnippetAction}
                    entities={entities}
                  />
                </div>
              </div>
            </div>
          ) : activeKey === "politica_economia" ? (
            <div className="flex flex-col md:flex-row h-full min-h-0 overflow-y-auto md:overflow-hidden">
              {/* Columna izquierda — Política */}
              <div
                className="flex-1 min-w-0 flex flex-col overflow-hidden"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
              >
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <Users size={9} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/35">Política</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <MarkdownEditor
                    key="politica"
                    value={(form as any).politica ?? ""}
                    onChange={(v) => setForm((f) => ({ ...f, politica: v }))}
                    placeholder="Sistema de gobierno, facciones, líderes, leyes…"
                    rows={20}
                    toolbar
                    defaultMode="edit"
                    onSnippetAction={onSnippetAction}
                    entities={entities}
                  />
                </div>
              </div>
              {/* Columna derecha — Economía */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                  <Coins size={9} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/35">Economía</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3">
                  <MarkdownEditor
                    key="economia"
                    value={(form as any).economia ?? ""}
                    onChange={(v) => setForm((f) => ({ ...f, economia: v }))}
                    placeholder="Recursos, comercio, moneda, riqueza…"
                    rows={20}
                    toolbar
                    defaultMode="edit"
                    onSnippetAction={onSnippetAction}
                    entities={entities}
                  />
                </div>
              </div>
            </div>
          ) : activeKey === "personajes" ? (
            <div className="p-4 space-y-2">
              {loadingPersonajes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={16} className="animate-spin text-primary/20" />
                </div>
              ) : personajes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-primary/20">
                  <UserCircle2 size={28} strokeWidth={1} />
                  <p className="text-[9px] font-black uppercase tracking-widest">Sin personajes en este reino</p>
                </div>
              ) : (
                personajes.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelectPersonaje?.(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 7%, transparent)";
                      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 18%, transparent)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
                      (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)";
                    }}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                      {p.img_url
                        ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                        : <UserCircle2 size={14} className="text-primary/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-primary/80 truncate group-hover:text-primary transition-colors">{p.nombre}</p>
                      {(p.especie || p.sobre) && (
                        <p className="text-[9px] text-primary/35 truncate mt-0.5">
                          {[p.especie, p.sobre?.slice(0, 50)].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={11} className="shrink-0 text-primary/20 group-hover:text-primary/50 transition-colors" />
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="p-3 h-full">
              <MarkdownEditor
                key={active.key}
                value={(form as any)[active.key] ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, [active.key]: v }))}
                placeholder={active.placeholder}
                rows={active.rows}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}