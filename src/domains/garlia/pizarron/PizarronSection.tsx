"use client";
/**
 * PizarronSection
 * ─────────────────────────────────────────────────────────────────────────
 * Canvas creativo para el Editor de Mundo. Permite:
 *  - Crear/seleccionar lienzos
 *  - Buscar y soltar entidades del worldbuilding (personajes, reinos, etc.)
 *  - Añadir bloques de texto libre
 *  - Mover nodos (drag)
 *  - Conectar nodos con aristas etiquetadas
 *  - Editar etiquetas y colores
 *  - Todo persiste en Supabase
 */
import {
  Check, ChevronDown, Edit2, Link as LinkIcon, Loader2, Plus,
  Search, Trash2, Type, X, ZoomIn, ZoomOut, RotateCcw,
  // Íconos de entidades
  FileText, User, Footprints, Crown, Building2, Sword,
  FlaskConical, Atom, Sparkles, Layers, Dna, Microscope,
  Activity, Heart, TreePine, Globe, Gem, Flower2, Settings2,
} from "lucide-react";
import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import type { LucideProps } from "lucide-react";
import { buscarEntidades, useLienzoCanvas, useLienzos } from "./usePizarron";
import {
  TIPO_ENTIDAD_CONFIG, type PizarronNodo, type TipoEntidadPizarron,
} from "./types";

// ── Mapa de íconos Lucide ─────────────────────────────────────────────────
const LUCIDE_MAP: Record<string, React.FC<LucideProps>> = {
  FileText, User, Footprints, Crown, Building2, Sword,
  FlaskConical, Atom, Sparkles, Layers, Dna, Microscope,
  Activity, Heart, TreePine, Globe, Gem, Flower2, Settings2,
};

function EntidadIcon({ name, size = 14, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  const Icon = LUCIDE_MAP[name] ?? FileText;
  return <Icon size={size} style={style} />;
}

// ── Utilidades SVG ────────────────────────────────────────────────────────
function calcularPuntoCentro(n: PizarronNodo) {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

function calcularPuntosBorde(origen: PizarronNodo, destino: PizarronNodo) {
  const o = calcularPuntoCentro(origen);
  const d = calcularPuntoCentro(destino);
  return { x1: o.x, y1: o.y, x2: d.x, y2: d.y };
}

// ── Componente de Nodo ────────────────────────────────────────────────────
interface NodoProps {
  nodo: PizarronNodo;
  selected: boolean;
  connecting: boolean;
  isConnectSource: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onConnectClick: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (nodo: PizarronNodo) => void;
}

function NodoCanvas({
  nodo, selected, connecting, isConnectSource,
  onSelect, onDragStart, onConnectClick, onDelete, onEdit,
}: NodoProps) {
  const cfg = TIPO_ENTIDAD_CONFIG[nodo.tipo_entidad as TipoEntidadPizarron]
    ?? TIPO_ENTIDAD_CONFIG.texto;
  const accent = cfg.accentVar;
  const isText = nodo.tipo_entidad === "texto";

  return (
    <g
      style={{ cursor: connecting ? "crosshair" : "grab" }}
      transform={`translate(${nodo.x},${nodo.y})`}
      onMouseDown={(e) => {
        if (connecting) { onConnectClick(nodo.id); return; }
        onDragStart(nodo.id, e);
        onSelect(nodo.id, e);
      }}
    >
      {/* Sombra */}
      <rect
        rx={8}
        width={nodo.width}
        height={nodo.height}
        fill="rgba(0,0,0,0.12)"
        transform="translate(2,3)"
      />
      {/* Fondo */}
      <rect
        rx={8}
        width={nodo.width}
        height={nodo.height}
        fill={isText
          ? "color-mix(in srgb, var(--bg-main) 96%, transparent)"
          : `color-mix(in srgb, ${accent} 12%, var(--bg-main))`}
        stroke={selected || isConnectSource
          ? accent
          : `color-mix(in srgb, ${accent} 40%, transparent)`}
        strokeWidth={selected || isConnectSource ? 2 : 1}
        strokeDasharray={isConnectSource ? "5 3" : undefined}
      />
      {/* Franja lateral de acento */}
      {!isText && (
        <rect
          x={0} y={0} width={3} height={nodo.height}
          rx={8}
          fill={accent}
          opacity={0.7}
        />
      )}
      {/* Label */}
      <foreignObject
        x={isText ? 10 : 18}
        y={8}
        width={isText ? nodo.width - 20 : nodo.width - 32}
        height={nodo.height - 16}
      >
        <div
          style={{
            fontSize: isText ? "12px" : "11px",
            fontWeight: isText ? 400 : 600,
            color: "var(--primary)",
            lineHeight: 1.35,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: isText ? 4 : 2,
            wordBreak: "break-word",
            opacity: isText ? 0.7 : 1,
          }}
        >
          {nodo.label ?? cfg.label}
        </div>
      </foreignObject>
      {/* Tipo chip */}
      {!isText && (
        <text
          x={nodo.width - 6}
          y={nodo.height - 5}
          fontSize={8}
          textAnchor="end"
          fill={accent}
          opacity={0.55}
          fontWeight="600"
          style={{ letterSpacing: 0.5 }}
        >
          {cfg.label.toUpperCase()}
        </text>
      )}
      {/* Botones flotantes (solo si seleccionado) */}
      {selected && !connecting && (
        <>
          {/* Editar */}
          <g
            style={{ cursor: "pointer" }}
            transform={`translate(${nodo.width - 52},${-13})`}
            onClick={(e) => { e.stopPropagation(); onEdit(nodo); }}
          >
            <circle r={9} fill="var(--bg-main)" stroke={accent} strokeWidth={1} />
            <foreignObject x={-6} y={-6} width={12} height={12}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%" }}>
                <Edit2 size={8} style={{ color: accent }} />
              </div>
            </foreignObject>
          </g>
          {/* Conectar */}
          <g
            style={{ cursor: "pointer" }}
            transform={`translate(${nodo.width - 28},${-13})`}
            onClick={(e) => { e.stopPropagation(); onConnectClick(nodo.id); }}
          >
            <circle r={9} fill="var(--bg-main)" stroke={accent} strokeWidth={1} />
            <foreignObject x={-6} y={-6} width={12} height={12}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%" }}>
                <LinkIcon size={8} style={{ color: accent }} />
              </div>
            </foreignObject>
          </g>
          {/* Eliminar */}
          <g
            style={{ cursor: "pointer" }}
            transform={`translate(${nodo.width - 4},${-13})`}
            onClick={(e) => { e.stopPropagation(); onDelete(nodo.id); }}
          >
            <circle r={9} fill="var(--bg-main)" stroke="color-mix(in srgb, var(--primary) 30%, transparent)" strokeWidth={1} />
            <foreignObject x={-6} y={-6} width={12} height={12}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:"100%" }}>
                <X size={8} style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }} />
              </div>
            </foreignObject>
          </g>
        </>
      )}
    </g>
  );
}

// ── Panel lateral: buscar y añadir entidades ──────────────────────────────
const TIPOS_ORDEN: TipoEntidadPizarron[] = [
  "texto", "personaje", "criatura", "reino", "ciudad", "item",
  "compuesto", "elemento", "runa", "material", "organismo",
  "celula", "tejido", "organo", "ecosistema", "bioma", "mineral", "flora", "proceso",
];

function PanelEntidades({
  onAgregar,
}: {
  onAgregar: (tipo: TipoEntidadPizarron, entidadId: string | null, label: string) => void;
}) {
  const [tipoActivo, setTipoActivo] = useState<TipoEntidadPizarron>("personaje");
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<{ id: string; nombre: string }[]>([]);
  const [buscando, setBuscando] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cfg = TIPO_ENTIDAD_CONFIG[tipoActivo];

  useEffect(() => {
    if (tipoActivo === "texto") { setResultados([]); return; }
    if (!query.trim()) { setResultados([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    setBuscando(true);
    searchRef.current = setTimeout(async () => {
      const res = await buscarEntidades(cfg.tabla, query);
      setResultados(res);
      setBuscando(false);
    }, 300);
  }, [query, tipoActivo, cfg.tabla]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 220,
        borderRight: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
      }}
    >
      {/* Selector de tipo */}
      <div
        className="p-2 flex flex-col gap-0.5"
        style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        <p
          className="text-micro font-semibold px-1 mb-1"
          style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 35%, transparent)", letterSpacing: "0.06em" }}
        >
          Tipo de entidad
        </p>
        <div className="flex flex-col gap-0.5">
          {TIPOS_ORDEN.map((t) => {
            const c = TIPO_ENTIDAD_CONFIG[t];
            const active = tipoActivo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setTipoActivo(t); setQuery(""); setResultados([]); }}
                className="flex items-center gap-2 px-2 py-1 text-left w-full transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: active
                    ? `color-mix(in srgb, ${c.accentVar} 15%, var(--bg-main))`
                    : "transparent",
                  border: active
                    ? `1px solid color-mix(in srgb, ${c.accentVar} 35%, transparent)`
                    : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                <EntidadIcon
                  name={c.icon}
                  size={13}
                  style={{
                    color: active
                      ? c.accentVar
                      : "color-mix(in srgb, var(--primary) 35%, transparent)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 55%, transparent)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Texto libre */}
      {tipoActivo === "texto" ? (
        <div className="p-3 flex flex-col gap-2">
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
            Añade un bloque de texto libre al lienzo.
          </p>
          <button
            type="button"
            onClick={() => onAgregar("texto", null, "Texto...")}
            className="flex items-center gap-2 px-3 py-2 transition-all text-xs font-semibold"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <Type size={12} /> Añadir texto
          </button>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Búsqueda */}
          <div className="p-2">
            <div
              className="flex items-center gap-2 px-2 py-1.5"
              style={{
                borderRadius: "var(--radius-btn)",
                background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              }}
            >
              {buscando
                ? <Loader2 size={11} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                : <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
              }
              <input
                type="text"
                placeholder={`Buscar ${cfg.label.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: "var(--primary)", minWidth: 0 }}
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setResultados([]); }}>
                  <X size={10} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                </button>
              )}
            </div>
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
            {resultados.length === 0 && query.trim() && !buscando && (
              <p className="text-xs py-4 text-center" style={{ color: "color-mix(in srgb, var(--primary) 28%, transparent)" }}>
                Sin resultados
              </p>
            )}
            {!query.trim() && (
              <p className="text-xs py-4 text-center" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
                Escribe para buscar
              </p>
            )}
            {resultados.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onAgregar(tipoActivo, r.id, r.nombre)}
                className="flex items-center gap-2 px-2 py-1.5 text-left transition-all w-full"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: "transparent",
                  border: "1px solid transparent",
                  fontSize: 12,
                  color: "var(--primary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const accent = TIPO_ENTIDAD_CONFIG[tipoActivo].accentVar;
                  (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${accent} 10%, var(--bg-main))`;
                  (e.currentTarget as HTMLElement).style.borderColor = `color-mix(in srgb, ${accent} 25%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                }}
              >
                <EntidadIcon
                  name={TIPO_ENTIDAD_CONFIG[tipoActivo].icon}
                  size={11}
                  style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", flexShrink: 0 }}
                />
                <span className="flex-1 truncate">{r.nombre}</span>
                <Plus size={10} style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal editar nodo ─────────────────────────────────────────────────────
function ModalEditarNodo({
  nodo,
  onSave,
  onClose,
}: {
  nodo: PizarronNodo;
  onSave: (id: string, label: string, color: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(nodo.label ?? "");
  const cfg = TIPO_ENTIDAD_CONFIG[nodo.tipo_entidad as TipoEntidadPizarron] ?? TIPO_ENTIDAD_CONFIG.texto;
  const [color, setColor] = useState(nodo.color ?? "var(--primary)");

  // Colores como CSS vars del tema para ser dinámicos
  const COLORES_PRESET = [
    { label: "Acento",    value: "var(--accent, #8b5cf6)" },
    { label: "Primario",  value: "var(--primary)" },
    { label: "Violeta",   value: "color-mix(in srgb, var(--primary) 50%, #8b5cf6)" },
    { label: "Azul",      value: "color-mix(in srgb, var(--primary) 50%, #3b82f6)" },
    { label: "Cyan",      value: "color-mix(in srgb, var(--primary) 50%, #06b6d4)" },
    { label: "Verde",     value: "color-mix(in srgb, var(--primary) 50%, #10b981)" },
    { label: "Lima",      value: "color-mix(in srgb, var(--primary) 50%, #84cc16)" },
    { label: "Naranja",   value: "color-mix(in srgb, var(--primary) 50%, #f59e0b)" },
    { label: "Rojo",      value: "color-mix(in srgb, var(--primary) 50%, #ef4444)" },
    { label: "Rosa",      value: "color-mix(in srgb, var(--primary) 50%, #ec4899)" },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-4 p-5"
        style={{
          background: "var(--bg-main)",
          borderRadius: "var(--radius-card)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
          boxShadow: "var(--shadow-card)",
          minWidth: 280,
          maxWidth: 340,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <EntidadIcon name={cfg.icon} size={14} style={{ color: cfg.accentVar }} />
            <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Editar {cfg.label}
            </span>
          </div>
          <button type="button" onClick={onClose}>
            <X size={13} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
            Etiqueta
          </label>
          <textarea
            rows={3}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 text-sm outline-none resize-none"
            style={{
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              borderRadius: "var(--radius-btn)",
              color: "var(--primary)",
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
            Color de acento
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COLORES_PRESET.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className="transition-all"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: c.value,
                  border: color === c.value
                    ? "2.5px solid var(--primary)"
                    : "2px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { onSave(nodo.id, label, color); onClose(); }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all"
          style={{
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
          }}
        >
          <Check size={12} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ── Modal editar arista ───────────────────────────────────────────────────
const TIPOS_ARISTA = ["relacion", "proceso", "contiene", "depende", "influye", "opuesto", "transforma"];

function ModalEditarArista({
  label: initLabel,
  tipo: initTipo,
  onSave,
  onDelete,
  onClose,
}: {
  label: string;
  tipo: string;
  onSave: (label: string, tipo: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initLabel);
  const [tipo, setTipo] = useState(initTipo);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-4 p-5"
        style={{
          background: "var(--bg-main)",
          borderRadius: "var(--radius-card)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
          boxShadow: "var(--shadow-card)",
          minWidth: 260,
          maxWidth: 320,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon size={13} style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Editar conexión</span>
          </div>
          <button type="button" onClick={onClose}>
            <X size={13} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          </button>
        </div>

        <input
          type="text"
          placeholder="Etiqueta de la conexión…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="px-3 py-2 text-xs outline-none w-full"
          style={{
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "var(--primary)",
          }}
        />

        <div className="flex flex-wrap gap-1">
          {TIPOS_ARISTA.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className="px-2.5 py-1 text-xs transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                background: tipo === t
                  ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                  : "transparent",
                color: tipo === t
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--primary) 40%, transparent)",
                border: tipo === t
                  ? "1px solid color-mix(in srgb, var(--primary) 20%, transparent)"
                  : "1px solid transparent",
                fontWeight: tipo === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { onDelete(); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              color: "color-mix(in srgb, var(--primary) 55%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            }}
          >
            <Trash2 size={11} /> Eliminar
          </button>
          <button
            type="button"
            onClick={() => { onSave(label, tipo); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 14%, transparent)",
            }}
          >
            <Check size={11} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Canvas SVG ─────────────────────────────────────────────────────────────
function CanvasPizarron({ lienzoId }: { lienzoId: string }) {
  const {
    nodos, aristas, loading,
    agregarNodo, moverNodo, editarNodoLabel, editarNodoColor, eliminarNodo,
    agregarArista, editarArista, eliminarArista,
  } = useLienzoCanvas(lienzoId);

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [editingNodo, setEditingNodo] = useState<PizarronNodo | null>(null);
  const [editingArista, setEditingArista] = useState<{ id: string; label: string; tipo: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const [lineTemp, setLineTemp] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const handleAgregar = useCallback(async (
    tipo: TipoEntidadPizarron, entidadId: string | null, label: string,
  ) => {
    const cfg = TIPO_ENTIDAD_CONFIG[tipo];
    await agregarNodo({
      tipo_entidad: tipo,
      entidad_id: entidadId,
      label,
      color: cfg.accentVar,
      icono: cfg.icon,
      x: 100 + Math.random() * 300 - pan.x / zoom,
      y: 100 + Math.random() * 200 - pan.y / zoom,
    });
  }, [agregarNodo, pan, zoom]);

  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nodo = nodos.find((n) => n.id === id);
    if (!nodo) return;
    setDragging({ id, ox: e.clientX / zoom - nodo.x, oy: e.clientY / zoom - nodo.y });
  }, [nodos, zoom]);

  const svgToWorld = (cx: number, cy: number) => ({
    x: (cx - pan.x) / zoom,
    y: (cy - pan.y) / zoom,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (dragging) {
      moverNodo(dragging.id, e.clientX / zoom - dragging.ox, e.clientY / zoom - dragging.oy);
    } else if (isPanning && panStart.current) {
      setPan({ x: panStart.current.px + (cx - panStart.current.mx), y: panStart.current.py + (cy - panStart.current.my) });
    } else if (connecting && connectSource) {
      const src = nodos.find((n) => n.id === connectSource);
      if (src) {
        const o = calcularPuntoCentro(src);
        const w = svgToWorld(cx, cy);
        setLineTemp({ x1: o.x, y1: o.y, x2: w.x, y2: w.y });
      }
    }
  }, [dragging, isPanning, connecting, connectSource, nodos, moverNodo, zoom, pan]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setIsPanning(true);
      panStart.current = { mx: e.clientX - rect.left, my: e.clientY - rect.top, px: pan.x, py: pan.y };
      return;
    }
    setSelectedId(null);
    if (connecting && !connectSource) setConnecting(false);
  }, [pan, connecting, connectSource]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(3, Math.max(0.2, z * factor)));
  }, []);

  const handleConnectClick = useCallback((id: string) => {
    if (!connecting) {
      setConnecting(true);
      setConnectSource(id);
      return;
    }
    if (connectSource && connectSource !== id) {
      agregarArista({ origen_id: connectSource, destino_id: id, tipo: "relacion" });
    }
    setConnecting(false);
    setConnectSource(null);
    setLineTemp(null);
  }, [connecting, connectSource, agregarArista]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setConnecting(false); setConnectSource(null); setLineTemp(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex overflow-hidden">
      <PanelEntidades onAgregar={handleAgregar} />

      <div className="relative flex-1 overflow-hidden" style={{ background: "color-mix(in srgb, var(--primary) 1.5%, var(--bg-main))" }}>
        {/* Controles de zoom */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          {[
            { title: "Acercar", icon: <ZoomIn size={12} />, action: () => setZoom((z) => Math.min(3, z * 1.2)) },
            { title: "Alejar",  icon: <ZoomOut size={12} />, action: () => setZoom((z) => Math.max(0.2, z * 0.8)) },
            { title: "Restablecer vista", icon: <RotateCcw size={12} />, action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
          ].map(({ title, icon, action }) => (
            <button
              key={title}
              type="button"
              title={title}
              onClick={action}
              className="flex items-center justify-center transition-all"
              style={{
                width: 28, height: 28,
                borderRadius: "var(--radius-btn)",
                background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "color-mix(in srgb, var(--primary) 50%, transparent)",
                backdropFilter: "blur(6px)",
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Banner modo conexión */}
        {connecting && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              color: "var(--primary)",
              fontSize: 11,
              fontWeight: 500,
              backdropFilter: "blur(8px)",
            }}
          >
            <LinkIcon size={11} />
            Selecciona el nodo destino · ESC para cancelar
          </div>
        )}

        {/* Canvas SVG */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: isPanning ? "grabbing" : connecting ? "crosshair" : "default" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <defs>
            <pattern id="grid" width={40 * zoom} height={40 * zoom} patternUnits="userSpaceOnUse"
              x={pan.x % (40 * zoom)} y={pan.y % (40 * zoom)}>
              <path
                d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
                fill="none"
                stroke="color-mix(in srgb, var(--primary) 4%, transparent)"
                strokeWidth={1}
              />
            </pattern>
            <marker id="arrow" markerWidth={7} markerHeight={7} refX={6} refY={3} orient="auto">
              <path d="M0,0 L0,6 L7,3 z" fill="color-mix(in srgb, var(--primary) 30%, transparent)" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Aristas */}
            {aristas.map((a) => {
              const origen = nodos.find((n) => n.id === a.origen_id);
              const destino = nodos.find((n) => n.id === a.destino_id);
              if (!origen || !destino) return null;
              const { x1, y1, x2, y2 } = calcularPuntosBorde(origen, destino);
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={a.id}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent" strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingArista({ id: a.id, label: a.label ?? "", tipo: a.tipo ?? "relacion" });
                    }}
                  />
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="color-mix(in srgb, var(--primary) 20%, transparent)"
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                    style={{ pointerEvents: "none" }}
                  />
                  {(a.label || (a.tipo && a.tipo !== "relacion")) && (
                    <text
                      x={mx} y={my - 5}
                      textAnchor="middle"
                      fontSize={8}
                      fill="color-mix(in srgb, var(--primary) 45%, transparent)"
                      fontWeight="500"
                      style={{ pointerEvents: "none" }}
                    >
                      {a.label || a.tipo}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Línea temporal */}
            {lineTemp && (
              <line
                x1={lineTemp.x1} y1={lineTemp.y1}
                x2={lineTemp.x2} y2={lineTemp.y2}
                stroke="color-mix(in srgb, var(--primary) 40%, transparent)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* Nodos */}
            {nodos.map((nodo) => (
              <NodoCanvas
                key={nodo.id}
                nodo={nodo}
                selected={selectedId === nodo.id}
                connecting={connecting}
                isConnectSource={connectSource === nodo.id}
                onSelect={(id, e) => { e.stopPropagation(); setSelectedId(id); }}
                onDragStart={handleDragStart}
                onConnectClick={handleConnectClick}
                onDelete={eliminarNodo}
                onEdit={setEditingNodo}
              />
            ))}
          </g>
        </svg>

        {/* Canvas vacío */}
        {nodos.length === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"
            style={{ color: "color-mix(in srgb, var(--primary) 18%, transparent)" }}
          >
            <Settings2 size={28} strokeWidth={1} />
            <p className="text-sm font-medium">Lienzo vacío</p>
            <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 14%, transparent)" }}>
              Selecciona un tipo y busca entidades en el panel
            </p>
          </div>
        )}
      </div>

      {/* Modales */}
      {editingNodo && (
        <ModalEditarNodo
          nodo={editingNodo}
          onSave={async (id, label, color) => {
            await editarNodoLabel(id, label);
            await editarNodoColor(id, color);
          }}
          onClose={() => setEditingNodo(null)}
        />
      )}
      {editingArista && (
        <ModalEditarArista
          label={editingArista.label}
          tipo={editingArista.tipo}
          onSave={(label, tipo) => editarArista(editingArista.id, { label, tipo })}
          onDelete={() => eliminarArista(editingArista.id)}
          onClose={() => setEditingArista(null)}
        />
      )}
    </div>
  );
}

// ── Componente raíz ────────────────────────────────────────────────────────
export function PizarronSection() {
  const { lienzos, loading, crearLienzo, renombrarLienzo, eliminarLienzo } = useLienzos();
  const [lienzoActivo, setLienzoActivo] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [nombreTemp, setNombreTemp] = useState("");

  useEffect(() => {
    if (!lienzoActivo && lienzos.length > 0) setLienzoActivo(lienzos[0].id);
  }, [lienzos, lienzoActivo]);

  const lienzoActual = lienzos.find((l) => l.id === lienzoActivo);

  const handleCrear = async () => {
    const nuevo = await crearLienzo();
    if (nuevo) { setLienzoActivo(nuevo.id); setMenuAbierto(false); }
  };

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: "100%" }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 shrink-0"
        style={{
          height: 44,
          borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "var(--bg-main)",
        }}
      >
        <Settings2 size={14} style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
          Pizarrón
        </span>

        {/* Selector de lienzo */}
        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
              color: "var(--primary)",
              maxWidth: 200,
            }}
          >
            <span className="truncate">{lienzoActual?.nombre ?? "Sin lienzo"}</span>
            <ChevronDown size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
          </button>

          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-[1000]" onClick={() => setMenuAbierto(false)} />
              <div
                className="absolute top-full left-0 mt-1 z-[1001] py-1 flex flex-col"
                style={{
                  minWidth: 200,
                  background: "var(--bg-main)",
                  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderRadius: "var(--radius-card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {loading && (
                  <div className="px-3 py-2 flex items-center gap-2" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)", fontSize: 12 }}>
                    <Loader2 size={12} className="animate-spin" /> Cargando…
                  </div>
                )}
                {lienzos.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-1 px-2 py-1.5 group"
                    style={{
                      background: lienzoActivo === l.id
                        ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                        : "transparent",
                    }}
                  >
                    {renombrando === l.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={nombreTemp}
                        onChange={(e) => setNombreTemp(e.target.value)}
                        onBlur={() => { renombrarLienzo(l.id, nombreTemp); setRenombrando(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renombrarLienzo(l.id, nombreTemp); setRenombrando(null); }
                          if (e.key === "Escape") setRenombrando(null);
                        }}
                        className="flex-1 text-xs bg-transparent outline-none"
                        style={{ color: "var(--primary)" }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex-1 text-left text-xs truncate"
                        style={{
                          color: lienzoActivo === l.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)",
                          fontWeight: lienzoActivo === l.id ? 600 : 400,
                        }}
                        onClick={() => { setLienzoActivo(l.id); setMenuAbierto(false); }}
                      >
                        {l.nombre}
                      </button>
                    )}
                    <button
                      type="button"
                      title="Renombrar"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => { setRenombrando(l.id); setNombreTemp(l.nombre); }}
                    >
                      <Edit2 size={10} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (lienzoActivo === l.id) setLienzoActivo(lienzos.find((x) => x.id !== l.id)?.id ?? null);
                        eliminarLienzo(l.id);
                      }}
                    >
                      <X size={10} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
                    </button>
                  </div>
                ))}
                <div style={{
                  height: "1px",
                  background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                  margin: "4px 8px",
                }} />
                <button
                  type="button"
                  onClick={handleCrear}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs transition-all"
                  style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}
                >
                  <Plus size={11} /> Nuevo lienzo
                </button>
              </div>
            </>
          )}
        </div>

        {/* Botón nuevo lienzo */}
        <button
          type="button"
          title="Nuevo lienzo"
          onClick={handleCrear}
          className="flex items-center justify-center ml-auto transition-all"
          style={{
            width: 26, height: 26,
            borderRadius: "var(--radius-btn)",
            background: "transparent",
            border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Canvas o estado vacío */}
      {lienzoActivo ? (
        <div className="flex flex-1 min-h-0">
          <CanvasPizarron key={lienzoActivo} lienzoId={lienzoActivo} />
        </div>
      ) : (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3"
          style={{ color: "color-mix(in srgb, var(--primary) 22%, transparent)" }}
        >
          <Settings2 size={32} strokeWidth={1} />
          <p className="text-sm font-medium">Sin lienzos</p>
          <button
            type="button"
            onClick={handleCrear}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 6%, transparent)",
              color: "var(--primary)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}
          >
            <Plus size={12} /> Crear lienzo
          </button>
        </div>
      )}
    </div>
  );
}
