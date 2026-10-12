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
} from "lucide-react";
import React, {
  useCallback, useEffect, useRef, useState, useMemo,
} from "react";
import { buscarEntidades, useLienzoCanvas, useLienzos } from "./usePizarron";
import {
  TIPO_ENTIDAD_CONFIG, type PizarronNodo, type TipoEntidadPizarron,
} from "./types";

// ── Constantes de colores de tema ─────────────────────────────────────────
const COLORES_PRESET = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6b7280",
];

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
  connecting: boolean; // modo conexión activo globalmente
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
  const color = nodo.color ?? cfg.color;
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
        rx={10}
        width={nodo.width}
        height={nodo.height}
        fill="rgba(0,0,0,0.18)"
        transform="translate(3,4)"
      />
      {/* Fondo */}
      <rect
        rx={10}
        width={nodo.width}
        height={nodo.height}
        fill={isText ? "color-mix(in srgb, var(--bg-main) 95%, transparent)" : `${color}22`}
        stroke={selected || isConnectSource ? color : `${color}66`}
        strokeWidth={selected || isConnectSource ? 2.5 : 1.5}
        strokeDasharray={isConnectSource ? "6 3" : undefined}
      />
      {/* Franja de color lateral */}
      {!isText && (
        <rect
          x={0} y={0} width={4} height={nodo.height}
          rx={10} fill={color} opacity={0.85}
        />
      )}
      {/* Emoji / icono */}
      {!isText && (
        <text x={16} y={nodo.height / 2 + 5} fontSize={16} textAnchor="middle">
          {nodo.icono ?? cfg.emoji}
        </text>
      )}
      {/* Label */}
      <foreignObject
        x={isText ? 10 : 30}
        y={8}
        width={isText ? nodo.width - 20 : nodo.width - 44}
        height={nodo.height - 16}
      >
        <div
          style={{
            fontSize: isText ? "12px" : "11px",
            fontWeight: isText ? 400 : 700,
            color: "var(--primary)",
            lineHeight: 1.35,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: isText ? 4 : 2,
            wordBreak: "break-word",
            opacity: isText ? 0.75 : 1,
          }}
        >
          {nodo.label ?? cfg.label}
        </div>
      </foreignObject>
      {/* Tipo chip (no texto) */}
      {!isText && (
        <text
          x={nodo.width - 6}
          y={nodo.height - 6}
          fontSize={9}
          textAnchor="end"
          fill={color}
          opacity={0.6}
          fontWeight="bold"
          style={{ textTransform: "uppercase", letterSpacing: 1 }}
        >
          {cfg.label}
        </text>
      )}
      {/* Botones (solo si seleccionado) */}
      {selected && !connecting && (
        <>
          {/* Editar */}
          <g
            style={{ cursor: "pointer" }}
            transform={`translate(${nodo.width - 52},${-14})`}
            onClick={(e) => { e.stopPropagation(); onEdit(nodo); }}
          >
            <circle r={10} fill="var(--bg-main)" stroke={color} strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={10} fill={color}>✏️</text>
          </g>
          {/* Conectar */}
          <g
            style={{ cursor: "pointer" }}
            transform={`translate(${nodo.width - 28},${-14})`}
            onClick={(e) => { e.stopPropagation(); onConnectClick(nodo.id); }}
          >
            <circle r={10} fill="var(--bg-main)" stroke={color} strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={10} fill={color}>🔗</text>
          </g>
          {/* Eliminar */}
          <g
            style={{ cursor: "pointer" }}
            transform={`translate(${nodo.width - 4},${-14})`}
            onClick={(e) => { e.stopPropagation(); onDelete(nodo.id); }}
          >
            <circle r={10} fill="var(--bg-main)" stroke="#ef4444" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={10} fill="#ef4444">✕</text>
          </g>
        </>
      )}
    </g>
  );
}

// ── Panel lateral: buscar y añadir entidades ──────────────────────────────
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

  const tiposOrden: TipoEntidadPizarron[] = [
    "texto", "personaje", "criatura", "reino", "ciudad", "item",
    "compuesto", "elemento", "runa", "material", "organismo",
    "celula", "tejido", "organo", "ecosistema", "bioma", "proceso",
  ];

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ width: 220, borderRight: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
    >
      {/* Selector de tipo */}
      <div className="p-2 flex flex-col gap-1" style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>
        <p className="text-micro font-black uppercase tracking-widest px-1 mb-1" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
          Tipo de entidad
        </p>
        <div className="flex flex-wrap gap-1">
          {tiposOrden.map((t) => {
            const c = TIPO_ENTIDAD_CONFIG[t];
            return (
              <button
                key={t}
                type="button"
                title={c.label}
                onClick={() => { setTipoActivo(t); setQuery(""); setResultados([]); }}
                style={{
                  fontSize: 16,
                  borderRadius: "var(--radius-btn)",
                  padding: "3px 6px",
                  background: tipoActivo === t
                    ? `${c.color}33`
                    : "color-mix(in srgb, var(--primary) 4%, transparent)",
                  border: tipoActivo === t
                    ? `1.5px solid ${c.color}`
                    : "1.5px solid transparent",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                {c.emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Texto libre */}
      {tipoActivo === "texto" ? (
        <div className="p-3 flex flex-col gap-2">
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
            Añade un bloque de texto libre al lienzo.
          </p>
          <button
            type="button"
            onClick={() => onAgregar("texto", null, "Texto...")}
            className="flex items-center gap-2 px-3 py-2 transition-all text-xs font-bold uppercase tracking-widest"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              border: "1.5px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <Type size={13} /> Añadir texto
          </button>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Búsqueda */}
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5" style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1.5px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            }}>
              {buscando ? <Loader2 size={12} className="animate-spin" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                : <Search size={12} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />}
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
                  <X size={11} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
                </button>
              )}
            </div>
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1">
            {resultados.length === 0 && query.trim() && !buscando && (
              <p className="text-xs py-3 text-center" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
                Sin resultados
              </p>
            )}
            {resultados.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onAgregar(tipoActivo, r.id, r.nombre)}
                className="flex items-center gap-2 px-2 py-1.5 text-left transition-all"
                style={{
                  borderRadius: "var(--radius-btn)",
                  background: "color-mix(in srgb, var(--primary) 3%, transparent)",
                  border: "1.5px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                  fontSize: 12,
                  color: "var(--primary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${TIPO_ENTIDAD_CONFIG[tipoActivo].color}22`;
                  (e.currentTarget as HTMLElement).style.borderColor = TIPO_ENTIDAD_CONFIG[tipoActivo].color;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
                  (e.currentTarget as HTMLElement).style.borderColor = "color-mix(in srgb, var(--primary) 8%, transparent)";
                }}
              >
                <span style={{ fontSize: 14 }}>{TIPO_ENTIDAD_CONFIG[tipoActivo].emoji}</span>
                <span className="flex-1 truncate">{r.nombre}</span>
                <Plus size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
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
  const [color, setColor] = useState(nodo.color ?? cfg.color);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-4 p-5"
        style={{
          background: "var(--bg-main)",
          borderRadius: "var(--radius-card)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
          boxShadow: "var(--shadow-card)",
          minWidth: 280,
          maxWidth: 360,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
            {cfg.emoji} Editar {cfg.label}
          </p>
          <button type="button" onClick={onClose}>
            <X size={14} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-micro font-bold uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            Etiqueta
          </label>
          <textarea
            rows={3}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 text-sm outline-none resize-none"
            style={{
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1.5px solid color-mix(in srgb, var(--primary) 15%, transparent)",
              borderRadius: "var(--radius-btn)",
              color: "var(--primary)",
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-micro font-bold uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORES_PRESET.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: c,
                  border: color === c ? "3px solid var(--primary)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { onSave(nodo.id, label, color); onClose(); }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all"
          style={{
            borderRadius: "var(--radius-btn)",
            background: color,
            color: "#fff",
          }}
        >
          <Check size={13} /> Guardar
        </button>
      </div>
    </div>
  );
}

// ── Modal editar arista ───────────────────────────────────────────────────
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
  const tipos = ["relacion", "proceso", "contiene", "depende", "influye", "opuesto", "transforma"];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-4 p-5"
        style={{
          background: "var(--bg-main)",
          borderRadius: "var(--radius-card)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
          boxShadow: "var(--shadow-card)",
          minWidth: 260,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
            🔗 Editar conexión
          </p>
          <button type="button" onClick={onClose}><X size={14} /></button>
        </div>
        <input
          type="text"
          placeholder="Etiqueta de la conexión…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="px-3 py-2 text-sm outline-none"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            borderRadius: "var(--radius-btn)",
            color: "var(--primary)",
          }}
        />
        <div className="flex flex-wrap gap-1">
          {tipos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className="px-2 py-1 text-micro font-bold uppercase tracking-widest transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                background: tipo === t
                  ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                  : "color-mix(in srgb, var(--primary) 4%, transparent)",
                color: tipo === t ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                border: tipo === t
                  ? "1.5px solid color-mix(in srgb, var(--primary) 25%, transparent)"
                  : "1.5px solid transparent",
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
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "#ef444420",
              color: "#ef4444",
              border: "1.5px solid #ef444440",
            }}
          >
            <Trash2 size={11} /> Eliminar
          </button>
          <button
            type="button"
            onClick={() => { onSave(label, tipo); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              border: "1.5px solid color-mix(in srgb, var(--primary) 15%, transparent)",
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

  // Línea temporal mientras se arrastra una conexión
  const [lineTemp, setLineTemp] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const handleAgregar = useCallback(async (
    tipo: TipoEntidadPizarron, entidadId: string | null, label: string,
  ) => {
    const cfg = TIPO_ENTIDAD_CONFIG[tipo];
    await agregarNodo({
      tipo_entidad: tipo,
      entidad_id: entidadId,
      label,
      color: cfg.color,
      icono: cfg.emoji,
      x: 100 + Math.random() * 300 - pan.x / zoom,
      y: 100 + Math.random() * 200 - pan.y / zoom,
    });
  }, [agregarNodo, pan, zoom]);

  // ── Drag nodos ────────────────────────────────────────────────────────
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
      const nx = e.clientX / zoom - dragging.ox;
      const ny = e.clientY / zoom - dragging.oy;
      moverNodo(dragging.id, nx, ny);
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

  // ── Pan con click derecho o botón medio ───────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setIsPanning(true);
      panStart.current = { mx: e.clientX - rect.left, my: e.clientY - rect.top, px: pan.x, py: pan.y };
      return;
    }
    // Click en fondo: deseleccionar
    setSelectedId(null);
    if (connecting && !connectSource) {
      setConnecting(false);
    }
  }, [pan, connecting, connectSource]);

  // ── Zoom con rueda ────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(3, Math.max(0.2, z * factor)));
  }, []);

  // ── Conectar ──────────────────────────────────────────────────────────
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

  // Cancelar conexión con Escape
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
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex overflow-hidden">
      {/* Panel lateral de entidades */}
      <PanelEntidades onAgregar={handleAgregar} />

      {/* Zona de canvas */}
      <div className="relative flex-1 overflow-hidden" style={{ background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
        {/* Controles de zoom */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button
            type="button"
            title="Acercar"
            onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
            className="flex items-center justify-center transition-all"
            style={{
              width: 30, height: 30, borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            title="Alejar"
            onClick={() => setZoom((z) => Math.max(0.2, z * 0.8))}
            className="flex items-center justify-center transition-all"
            style={{
              width: 30, height: 30, borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            title="Resetear vista"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="flex items-center justify-center transition-all"
            style={{
              width: 30, height: 30, borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--bg-main) 90%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "color-mix(in srgb, var(--primary) 60%, transparent)",
              backdropFilter: "blur(8px)",
            }}
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Indicador modo conexión */}
        {connecting && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "#8b5cf6ee",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              backdropFilter: "blur(8px)",
              letterSpacing: 1,
            }}
          >
            <LinkIcon size={11} />
            Haz click en otro nodo para conectar · ESC para cancelar
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
          {/* Grid de fondo */}
          <defs>
            <pattern id="grid" width={40 * zoom} height={40 * zoom} patternUnits="userSpaceOnUse"
              x={pan.x % (40 * zoom)} y={pan.y % (40 * zoom)}>
              <path
                d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
                fill="none"
                stroke="color-mix(in srgb, var(--primary) 5%, transparent)"
                strokeWidth={1}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Grupo principal con transform */}
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Aristas */}
            {aristas.map((a) => {
              const origen = nodos.find((n) => n.id === a.origen_id);
              const destino = nodos.find((n) => n.id === a.destino_id);
              if (!origen || !destino) return null;
              const { x1, y1, x2, y2 } = calcularPuntosBorde(origen, destino);
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              const color = a.color ?? "#6b7280";
              return (
                <g key={a.id}>
                  {/* Línea clickeable (área de hit) */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent" strokeWidth={16}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingArista({ id: a.id, label: a.label ?? "", tipo: a.tipo ?? "relacion" });
                    }}
                  />
                  {/* Línea visible */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={`${color}88`}
                    strokeWidth={1.5}
                    markerEnd="url(#arrow)"
                    style={{ pointerEvents: "none" }}
                  />
                  {/* Etiqueta */}
                  {a.label && (
                    <text
                      x={mx} y={my - 6}
                      textAnchor="middle"
                      fontSize={9}
                      fill={color}
                      fontWeight="bold"
                      style={{ pointerEvents: "none", textTransform: "uppercase", letterSpacing: 1 }}
                    >
                      {a.label}
                    </text>
                  )}
                  {/* Tipo (si no hay label) */}
                  {!a.label && a.tipo && a.tipo !== "relacion" && (
                    <text
                      x={mx} y={my - 6}
                      textAnchor="middle"
                      fontSize={8}
                      fill={`${color}88`}
                      style={{ pointerEvents: "none" }}
                    >
                      {a.tipo}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Línea temporal al conectar */}
            {lineTemp && (
              <line
                x1={lineTemp.x1} y1={lineTemp.y1}
                x2={lineTemp.x2} y2={lineTemp.y2}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="6 3"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* Flecha */}
            <defs>
              <marker id="arrow" markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#6b728088" />
              </marker>
            </defs>

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
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none"
            style={{ color: "color-mix(in srgb, var(--primary) 20%, transparent)" }}
          >
            <span style={{ fontSize: 48 }}>🎨</span>
            <p className="text-sm font-bold">Lienzo vacío</p>
            <p className="text-xs">Busca entidades en el panel izquierdo para añadirlas</p>
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

  // Auto-seleccionar el primero
  useEffect(() => {
    if (!lienzoActivo && lienzos.length > 0) {
      setLienzoActivo(lienzos[0].id);
    }
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
          height: 48,
          borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
          background: "color-mix(in srgb, var(--bg-main) 98%, transparent)",
        }}
      >
        <span style={{ fontSize: 18 }}>🎨</span>
        <span className="text-sm font-black tracking-wide" style={{ color: "var(--primary)" }}>
          Pizarrón
        </span>

        {/* Selector de lienzo */}
        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 5%, transparent)",
              border: "1.5px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              color: "var(--primary)",
              maxWidth: 180,
            }}
          >
            <span className="truncate">{lienzoActual?.nombre ?? "Sin lienzo"}</span>
            <ChevronDown size={11} style={{ flexShrink: 0 }} />
          </button>

          {menuAbierto && (
            <>
              <div className="fixed inset-0 z-[1000]" onClick={() => setMenuAbierto(false)} />
              <div
                className="absolute top-full left-0 mt-1 z-[1001] py-1 flex flex-col"
                style={{
                  minWidth: 200,
                  background: "var(--bg-main)",
                  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  borderRadius: "var(--radius-card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {loading && (
                  <div className="px-3 py-2 flex items-center gap-2" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: 12 }}>
                    <Loader2 size={12} className="animate-spin" /> Cargando…
                  </div>
                )}
                {lienzos.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-1 px-2 py-1.5 group"
                    style={{ background: lienzoActivo === l.id ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent" }}
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
                        style={{ color: "var(--primary)" }}
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
                      <Edit2 size={10} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />
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
                      <X size={10} style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                ))}
                <div style={{ height: "var(--border-width)", background: "color-mix(in srgb, var(--primary) 8%, transparent)", margin: "4px 8px" }} />
                <button
                  type="button"
                  onClick={handleCrear}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all"
                  style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}
                >
                  <Plus size={11} /> Nuevo lienzo
                </button>
              </div>
            </>
          )}
        </div>

        {/* Botón nuevo lienzo rápido */}
        <button
          type="button"
          title="Nuevo lienzo"
          onClick={handleCrear}
          className="flex items-center justify-center ml-auto transition-all"
          style={{
            width: 28, height: 28,
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            color: "color-mix(in srgb, var(--primary) 50%, transparent)",
          }}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Canvas */}
      {lienzoActivo ? (
        <div className="flex flex-1 min-h-0">
          <CanvasPizarron key={lienzoActivo} lienzoId={lienzoActivo} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>
          <span style={{ fontSize: 56 }}>🎨</span>
          <p className="text-sm font-bold">No hay lienzos todavía</p>
          <button
            type="button"
            onClick={handleCrear}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
              border: "1.5px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <Plus size={13} /> Crear primer lienzo
          </button>
        </div>
      )}
    </div>
  );
}
