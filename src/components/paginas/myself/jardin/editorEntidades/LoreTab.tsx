import React, { useState, useRef } from "react";
import { Globe, Mountain, Landmark, Users, Coins, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { type Reino } from "./types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TimelineEvent = {
  id: string;
  year: string;   // texto libre: "345 A.E.", "-120", "Era del Fuego"…
  title: string;
  description: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newEvent(): TimelineEvent {
  return { id: crypto.randomUUID(), year: "", title: "", description: "" };
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

/** Intenta parsear el año como número para ordenar (acepta negativos, texto, etc.) */
function parseYear(year: string): number {
  const n = parseFloat(year.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? Infinity : n;
}

function TimelineEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
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

  const sorted = [...events].sort((a, b) => parseYear(a.year) - parseYear(b.year));

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

        {sorted.map((evt, idx) => (
          <TimelineRow
            key={evt.id}
            event={evt}
            index={idx}
            total={sorted.length}
            onUpdate={(patch) => update(evt.id, patch)}
            onRemove={() => remove(evt.id)}
            onMove={() => {}}
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
}: {
  event: TimelineEvent;
  index: number;
  total: number;
  onUpdate: (patch: Partial<TimelineEvent>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
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
            className="px-3 pb-3 pt-3"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
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

// ─── Definición de secciones ─────────────────────────────────────────────────

type LoreKey = "historia" | "geografia" | "cultura" | "politica" | "economia";

const LORE_SECTIONS: {
  key: LoreKey;
  label: string;
  Icon: React.ElementType;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "historia",
    label: "Historia",
    Icon: Globe,
    placeholder: "Origen, eventos clave, cronología del reino…",
    rows: 20,
  },
  {
    key: "geografia",
    label: "Geografía",
    Icon: Mountain,
    placeholder: "Paisajes, clima, fronteras, ciudades principales…",
    rows: 20,
  },
  {
    key: "cultura",
    label: "Cultura",
    Icon: Landmark,
    placeholder: "Tradiciones, religión, idioma, costumbres, arte…",
    rows: 20,
  },
  {
    key: "politica",
    label: "Política",
    Icon: Users,
    placeholder: "Sistema de gobierno, facciones, líderes, leyes…",
    rows: 20,
  },
  {
    key: "economia",
    label: "Economía",
    Icon: Coins,
    placeholder: "Recursos, comercio, moneda, riqueza…",
    rows: 20,
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
}: {
  form: Reino;
  setForm: React.Dispatch<React.SetStateAction<Reino>>;
  entities?: WikiEntity[];
}) {
  const [activeKey, setActiveKey] = useState<LoreKey>("historia");
  const { onSnippetAction } = useWikilink();

  const active = LORE_SECTIONS.find((s) => s.key === activeKey)!;

  // Función para determinar si una sección tiene contenido
  const sectionHasContent = (key: LoreKey): boolean => {
    const raw = (form as any)[key] as string | undefined;
    if (key === "historia") return historiaHasContent(raw);
    return !!raw?.trim();
  };

  return (
    <div className="flex h-full min-h-0">

      {/* ── Nav lateral ─────────────────────────────────────────────────────── */}
      <nav
        className="shrink-0 flex flex-col gap-0.5 p-2 border-r overflow-y-auto"
        style={{
          width: "clamp(40px, 15%, 130px)",
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        {LORE_SECTIONS.map(({ key, label, Icon }) => {
          const hasContent = sectionHasContent(key);
          const isActive = key === activeKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              title={label}
              className="relative flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all group"
              style={
                isActive
                  ? {
                      background:
                        "color-mix(in srgb, var(--primary) 12%, transparent)",
                      color: "var(--primary)",
                      border:
                        "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                    }
                  : {
                      color:
                        "color-mix(in srgb, var(--primary) 40%, transparent)",
                      border: "1px solid transparent",
                    }
              }
            >
              <Icon
                size={12}
                className="shrink-0"
                style={{ opacity: isActive ? 1 : 0.55 }}
              />
              <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] truncate">
                {label}
              </span>
              {hasContent && (
                <span
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isActive
                      ? "var(--primary)"
                      : "color-mix(in srgb, var(--primary) 35%, transparent)",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Panel editor ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Cabecera de la sección activa */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          }}
        >
          <active.Icon
            size={11}
            style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
          />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40">
            {active.label}
          </span>

          {/* Badge "vacío" */}
          {!sectionHasContent(active.key) && (
            <span className="text-[8px] font-black uppercase tracking-widest text-primary/20 border border-primary/10 px-1.5 py-0.5 rounded-md">
              vacío
            </span>
          )}

          {/* Badge "línea de tiempo" cuando está en historia */}
          {active.key === "historia" && (
            <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-primary/25 border border-primary/10 px-1.5 py-0.5 rounded-md">
              Línea de tiempo
            </span>
          )}
        </div>

        {/* Contenido: línea de tiempo para historia, MarkdownEditor para el resto */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeKey === "historia" ? (
            <TimelineEditor
              key="historia-timeline"
              value={(form as any).historia ?? ""}
              onChange={(v) => setForm((f) => ({ ...f, historia: v }))}
            />
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