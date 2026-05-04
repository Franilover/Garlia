"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Music, Plus, SlidersHorizontal, ChevronDown, BookOpen,
  Loader2, Eye, EyeOff, X, ArrowLeft, Search,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { normalize, unique } from "@/components/templates/EstudioTemplates";
import { useLastOpenedId } from "@/hooks/useEditorShared";

import { useCanciones } from "./hooks/useCanciones";
import { ESTADOS, ESTADO_COLOR, FILTROS_VACIOS } from "./constants";
import { SidebarItem } from "./components/sidebar/SidebarItem";
import { PanelFiltros } from "./components/sidebar/PanelFiltros";
import { PanelEditor } from "./components/editor/PanelEditor";
import { ModalNuevaCancion } from "./components/modals/ModalNuevaCancion";
import { ModalEditarCancion } from "./components/modals/ModalEditarCancion";

import type { Cancion, Filtros } from "./types";

/* ─── Estilos compartidos con el MarkdownEditor ─────────────────────────────── */
/*
  Estrategia de contraste:
  - Texto legible: usamos --foreground directamente (sin mezcla) para texto principal,
    y opacity CSS para los matices sutiles — así escala bien en todos los temas.
  - Bordes: color-mix al 15–20% de --primary (más estable que --foreground) sobre --bg-main.
  - Fondos de controles: --input-bg del tema, que ya está calibrado para cada modo.
  - Hover: --primary al 10–12% de fondo, --primary directo para texto.
*/
const SEARCH_STYLES = `
  /* ── Barra de búsqueda ── */
  .search-bar-wrap {
    display: flex;
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--input-bg);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .search-bar-wrap:focus-within {
    border-color: color-mix(in srgb, var(--primary) 50%, transparent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
  }
  .search-bar-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    color: var(--primary);
    opacity: 0.45;
    flex-shrink: 0;
  }
  .search-bar-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 9px 0;
    font-size: 12px;
    font-family: var(--font-mono, monospace);
    color: var(--input-text);
    letter-spacing: 0.02em;
  }
  .search-bar-input::placeholder {
    color: var(--input-text);
    opacity: 0.35;
    font-style: italic;
  }
  .search-bar-clear {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-right: 3px;
    border-radius: 5px;
    border: none;
    background: transparent;
    color: var(--primary);
    opacity: 0.5;
    cursor: pointer;
    transition: opacity 0.1s, background 0.1s;
  }
  .search-bar-clear:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }
  .search-bar-divider {
    width: 1px;
    height: 16px;
    background: color-mix(in srgb, var(--primary) 18%, transparent);
    flex-shrink: 0;
    margin: 0 2px;
  }

  /* ── Botón filtros (vive dentro de la barra) ── */
  .filters-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    height: 100%;
    border: none;
    background: transparent;
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--primary);
    opacity: 0.55;
    cursor: pointer;
    transition: opacity 0.1s, background 0.1s;
    white-space: nowrap;
  }
  .filters-btn:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--primary) 8%, transparent);
  }
  .filters-btn.active {
    opacity: 1;
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, transparent);
  }
  .filters-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--primary);
    color: var(--btn-text);
    font-size: 7px;
    font-weight: 900;
  }

  /* ── Cards de canciones ── */
  .song-card {
    border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
    border-radius: 8px;
    overflow: hidden;
    background: var(--white-custom);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
  }
  .song-card:hover {
    border-color: color-mix(in srgb, var(--primary) 45%, transparent);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--primary) 10%, transparent);
  }
  .song-card-accent {
    height: 2px;
    width: 100%;
    background: color-mix(in srgb, var(--primary) 25%, transparent);
  }
  .song-card-accent.terminada {
    background: color-mix(in srgb, var(--callout-success-border) 55%, transparent);
  }
  .song-card-accent.en-proceso {
    background: color-mix(in srgb, var(--callout-warning-border) 55%, transparent);
  }
  .song-card-body {
    padding: 12px 14px 14px;
  }
  .song-card-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid;
    font-size: 7px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 7px;
  }
  .song-card-title {
    font-size: 11px;
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1.3;
    color: var(--primary);
    margin-bottom: 5px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .song-card-sub {
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    color: var(--text-on-card);
    opacity: 0.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.04em;
  }
  .song-card-lang {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-on-card);
    opacity: 0.3;
    margin-top: 4px;
  }
  .song-card-actions {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  /* ── Estado vacío ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 24px;
    gap: 12px;
  }
  .empty-state-icon {
    width: 40px;
    height: 40px;
    border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--white-custom);
    color: var(--primary);
    opacity: 0.5;
    margin-bottom: 4px;
  }
  .empty-state-label {
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--foreground);
    opacity: 0.35;
  }
  .empty-state-clear {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--primary);
    opacity: 0.55;
    background: none;
    border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.1s, border-color 0.1s;
    padding: 4px 10px;
  }
  .empty-state-clear:hover {
    opacity: 1;
    border-color: color-mix(in srgb, var(--primary) 50%, transparent);
  }

  /* ── Contador de resultados ── */
  .results-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .results-count {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--foreground);
    opacity: 0.4;
  }
  .results-clear {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent);
    opacity: 0.7;
    background: none;
    border: none;
    cursor: pointer;
    transition: opacity 0.1s;
  }
  .results-clear:hover {
    opacity: 1;
  }

  /* ── Panel filtros desplegable ── */
  .filters-panel {
    border-top: 1px solid color-mix(in srgb, var(--primary) 12%, transparent);
    background: color-mix(in srgb, var(--primary) 5%, var(--bg-main));
  }

  /* ── Header ── */
  .page-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background: var(--bg-main);
    border-bottom: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  }
  .header-inner {
    max-width: 1152px;
    margin: 0 auto;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @media (min-width: 640px) {
    .header-inner {
      padding: 10px 24px;
      gap: 10px;
    }
  }
  .header-brand {
    display: none;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    border-right: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
    padding-right: 12px;
    margin-right: 2px;
  }
  @media (min-width: 640px) {
    .header-brand {
      display: flex;
    }
  }
  .header-brand-label {
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--foreground);
    opacity: 0.45;
  }

  /* ── Botón "Nueva canción" ── */
  .new-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 10px;
    height: 36px;
    border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
    border-radius: 6px;
    background: transparent;
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--primary);
    opacity: 0.7;
    cursor: pointer;
    transition: opacity 0.15s, background 0.15s, border-color 0.15s;
    flex-shrink: 0;
    white-space: nowrap;
  }
  @media (min-width: 640px) {
    .new-btn {
      padding: 0 12px;
    }
  }
  .new-btn:hover {
    opacity: 1;
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }
`;

/* ─── Estado de badge según estado ─────────────────────────────────────────── */
// Los badges usan CSS custom properties del tema (--primary, --accent) + colores
// semánticos absolutos. El fondo del badge siempre es --white-custom (background de la card),
// pero en dark mode ese fondo es oscuro (#28202f), así que necesitamos que el COLOR
// del texto sea legible sobre ambos fondos. Solución: usar opacity sobre colores base
// que el tema ya tiene calibrados.
const estadoBadgeStyle = (estado: string): React.CSSProperties => {
  if (estado === "TERMINADA") return {
    borderColor: "color-mix(in srgb, var(--callout-success-border) 50%, transparent)",
    color: "var(--callout-success-title)",
    background: "color-mix(in srgb, var(--callout-success-border) 10%, transparent)",
  };
  if (estado === "EN PROCESO") return {
    borderColor: "color-mix(in srgb, var(--callout-warning-border) 50%, transparent)",
    color: "var(--callout-warning-title)",
    background: "color-mix(in srgb, var(--callout-warning-border) 10%, transparent)",
  };
  // PENDIENTE — usa el primary del tema
  return {
    borderColor: "color-mix(in srgb, var(--primary) 30%, transparent)",
    color: "var(--primary)",
    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
  };
};

const estadoLabel = (estado: string) => {
  if (estado === "EN PROCESO") return "WIP";
  if (estado === "TERMINADA") return "done";
  return "pending";
};

const estadoAccentClass = (estado: string) => {
  if (estado === "TERMINADA") return "terminada";
  if (estado === "EN PROCESO") return "en-proceso";
  return "";
};

/* ─── Card de canción ─────────────────────────────────────────────────────── */
const CancionCard = ({
  cancion,
  onClick,
  onEdit,
  onDelete,
  onToggleVisible,
}: {
  cancion: Cancion;
  onClick: () => void;
  onEdit: (c: Cancion) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
}) => {
  const [hovered, setHovered] = useState(false);

  const nombre = (() => {
    const p = cancion.personaje;
    return (Array.isArray(p) ? p[0]?.nombre : p?.nombre) || cancion.cantante;
  })();

  return (
    <div
      className="song-card"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Acento de estado */}
      <div className={`song-card-accent ${estadoAccentClass(cancion.estado)}`} />

      <div className="song-card-body">
        {/* Badge */}
        <span className="song-card-badge" style={estadoBadgeStyle(cancion.estado)}>
          {estadoLabel(cancion.estado)}
        </span>

        {/* Título */}
        <div className="song-card-title">{cancion.titulo}</div>

        {/* Subtítulo */}
        {nombre && <div className="song-card-sub">{nombre}</div>}
        {cancion.idioma && <div className="song-card-lang">{cancion.idioma}</div>}

        {/* Acciones */}
        <div className="song-card-actions" onClick={e => e.stopPropagation()}>
          <CardActions
            cancion={cancion}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleVisible={onToggleVisible}
            isCardHovered={hovered}
          />
        </div>
      </div>
    </div>
  );
};

/* ─── Acciones flotantes de la card ──────────────────────────────────────── */
import { useConfirm } from "@/components/ui/ConfirmModal";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const CardActions = ({
  cancion, onEdit, onDelete, onToggleVisible, isCardHovered,
}: {
  cancion: Cancion;
  onEdit: (c: Cancion) => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
  isCardHovered: boolean;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { confirm, ConfirmModal } = useConfirm();

  const handleToggleVisible = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toggling) return;
    setToggling(true);
    const nuevoVisible = !cancion.visible;
    try {
      await supabase.from("canciones").update({ visible: nuevoVisible }).eq("id", cancion.id);
      onToggleVisible(cancion.id, nuevoVisible);
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Estrategia: color fijo via --primary + opacity CSS, sin color-mix sobre --foreground
  // Esto funciona igual en temas claros y oscuros porque opacity es relativo al color base.
  const iconBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 4,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "var(--primary)",
    transition: "opacity 0.1s, background 0.1s",
  };

  const onHoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.opacity = "1";
    e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 10%, transparent)";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {/* Visibilidad */}
      <button
        onClick={handleToggleVisible}
        title={cancion.visible ? "Ocultar" : "Mostrar"}
        style={{ ...iconBase, opacity: cancion.visible ? (isCardHovered ? 0.55 : 0) : 0.55 }}
        onMouseEnter={onHoverIn}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = cancion.visible ? (isCardHovered ? "0.55" : "0") : "0.55";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {toggling
          ? <Loader2 size={11} className="animate-spin" />
          : cancion.visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>

      {/* Menú */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(m => !m); }}
          style={{
            ...iconBase,
            opacity: menuOpen ? 1 : (isCardHovered ? 0.55 : 0),
            background: menuOpen ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
          }}
          onMouseEnter={onHoverIn}
          onMouseLeave={e => {
            if (!menuOpen) {
              e.currentTarget.style.opacity = isCardHovered ? "0.55" : "0";
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <MoreHorizontal size={11} />
        </button>

        {menuOpen && (
          <div style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 50,
            minWidth: 144,
            background: "var(--white-custom)",
            border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
            borderRadius: 6,
            boxShadow: "0 8px 20px color-mix(in srgb, var(--primary) 12%, transparent)",
            padding: "3px",
            overflow: "hidden",
          }}>
            {/* Editar */}
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(cancion); }}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "transparent",
                fontSize: 9,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "var(--text-on-card)",
                opacity: 0.65,
                cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = "0.65";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Pencil size={10} /> Editar
            </button>

            <div style={{ height: 1, background: "color-mix(in srgb, var(--primary) 14%, transparent)", margin: "2px 6px" }} />

            {/* Eliminar — usa --accent del tema, que en todos los temas tiene buen contraste sobre --white-custom */}
            <button
              onClick={async e => {
                e.stopPropagation();
                setMenuOpen(false);
                const ok = await confirm({ message: `¿Eliminar "${cancion.titulo}"?`, danger: true });
                if (ok) onDelete(cancion.id);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 10px",
                borderRadius: 4,
                border: "none",
                background: "transparent",
                fontSize: 9,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "var(--accent)",
                opacity: 0.75,
                cursor: "pointer",
                transition: "opacity 0.1s, background 0.1s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.background = "color-mix(in srgb, var(--accent) 10%, transparent)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = "0.75";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Trash2 size={10} /> Eliminar
            </button>
          </div>
        )}
      </div>
      <ConfirmModal />
    </div>
  );
};

/* ─── Vista principal ─────────────────────────────────────────────────────── */
export default function EstudioLetras() {
  const { canciones, setCanciones, loading: loadingLista, isOffline: listaOffline, refetch } = useCanciones();
  const [lastId, setLastId] = useLastOpenedId("estudio-letras-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(null);

  const setSelectedId = (id: string | null) => {
    _setSelectedId(id);
    setLastId(id);
  };

  const [busqueda,        setBusqueda]        = useState("");
  const [filtros,         setFiltros]         = useState<Filtros>(FILTROS_VACIOS);
  const [showFiltros,     setShowFiltros]     = useState(false);
  const [showNueva,       setShowNueva]       = useState(false);
  const [editandoCancion, setEditandoCancion] = useState<Cancion | null>(null);

  const opciones = useMemo(() => ({
    idiomas:      unique(canciones.map(c => c.idioma     || "")),
    cantantes:    unique(canciones.map(c => c.cantante   || "")),
    compositores: unique(canciones.map(c => c.compositor || "")),
    personajes:   unique(canciones.map(c => { const p = c.personaje; return (Array.isArray(p) ? p[0]?.nombre : p?.nombre) || ""; })),
  }), [canciones]);

  const ORDEN_ESTADO: Record<string, number> = { TERMINADA: 0, "EN PROCESO": 1, PENDIENTE: 2 };

  const filtradas = useMemo(() => canciones.filter(c => {
    if (busqueda) {
      const q = normalize(busqueda);
      if (
        !normalize(c.titulo).includes(q) &&
        !normalize((Array.isArray(c.personaje) ? c.personaje[0]?.nombre : c.personaje?.nombre) || "").includes(q) &&
        !normalize(c.cantante   || "").includes(q) &&
        !normalize(c.compositor || "").includes(q)
      ) return false;
    }
    if (filtros.estado     && c.estado      !== filtros.estado)        return false;
    if (filtros.visible    && String(c.visible) !== filtros.visible)   return false;
    if (filtros.idioma     && c.idioma      !== filtros.idioma)        return false;
    if (filtros.cantante   && c.cantante    !== filtros.cantante)      return false;
    if (filtros.compositor && c.compositor  !== filtros.compositor)    return false;
    if (filtros.personaje  && ((Array.isArray(c.personaje) ? c.personaje[0]?.nombre : c.personaje?.nombre) !== filtros.personaje)) return false;
    return true;
  }).sort((a, b) => {
    const estadoA = ORDEN_ESTADO[a.estado] ?? 9;
    const estadoB = ORDEN_ESTADO[b.estado] ?? 9;
    if (estadoA !== estadoB) return estadoA - estadoB;
    if (a.estado === "TERMINADA") return (b.visible ? 1 : 0) - (a.visible ? 1 : 0);
    return 0;
  }), [canciones, busqueda, filtros]);

  const numFiltros = Object.values(filtros).filter(Boolean).length;

  const handleCancionCreada = (c: Cancion) => {
    setCanciones(prev => [c, ...prev]);
    setSelectedId(c.id);
  };

  const handleCancionEditada = (c: Cancion) => {
    setCanciones(prev => prev.map(x => x.id === c.id ? c : x));
  };

  const handleCancionEliminada = async (id: string) => {
    try {
      await supabase.from("canciones").delete().eq("id", id);
      setCanciones(prev => prev.filter(c => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) { console.error(e); }
  };

  const handleToggleVisible = useCallback((id: string, visible: boolean) => {
    setCanciones(prev => prev.map(c => c.id === id ? { ...c, visible } : c));
  }, [setCanciones]);

  /* ── Vista editor ── */
  if (selectedId) {
    return (
      <>
        <div className="min-h-screen bg-bg-main flex flex-col">
          <header style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "var(--bg-main)",
            borderBottom: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 9,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--primary)",
                opacity: 0.5,
                background: "none",
                border: "none",
                cursor: "pointer",
                transition: "color 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.5"; }}
            >
              <ArrowLeft size={11} /> Canciones
            </button>

            <div style={{ width: 1, height: 14, background: "color-mix(in srgb, var(--primary) 18%, transparent)" }} />

            <span style={{
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {canciones.find(c => c.id === selectedId)?.titulo ?? ""}
            </span>
          </header>

          <div className="flex-1">
            <PanelEditor key={selectedId} cancionId={selectedId} />
          </div>
        </div>

        {editandoCancion && (
          <ModalEditarCancion
            cancion={editandoCancion}
            onSaved={handleCancionEditada}
            onClose={() => setEditandoCancion(null)}
          />
        )}
      </>
    );
  }

  /* ── Vista lista ── */
  return (
    <>
      <style>{SEARCH_STYLES}</style>
      <div className="min-h-screen bg-bg-main">

        {/* ── Header ── */}
        <header className="page-header">
          <div className="header-inner">

            {/* Brand — solo visible en sm+ */}
            <div className="header-brand">
              <span style={{ color: "var(--primary)", opacity: 0.4 }}>
                <Music size={12} />
              </span>
              <span className="header-brand-label">Canciones</span>
            </div>

            {/* ── Buscador — misma estética que el toolbar del MarkdownEditor ── */}
            <div className="search-bar-wrap" style={{ flex: 1, height: 36 }}>
              <div className="search-bar-icon">
                <Search size={12} />
              </div>

              <input
                type="text"
                value={busqueda}
                onChange={e => {
                  const val = e.target.value;
                  if (val.toLowerCase() === "add") {
                    setBusqueda("");
                    setShowNueva(true);
                  } else {
                    setBusqueda(val);
                  }
                }}
                placeholder="buscar… (escribe «add» para añadir)"
                className="search-bar-input"
              />

              {busqueda && (
                <>
                  <div className="search-bar-divider" />
                  <button
                    className="search-bar-clear"
                    onClick={() => setBusqueda("")}
                    title="Limpiar búsqueda"
                  >
                    <X size={11} />
                  </button>
                </>
              )}

              {/* Separador antes de filtros */}
              <div className="search-bar-divider" />

              {/* Filtros integrados en la barra */}
              <button
                className={`filters-btn ${numFiltros > 0 ? "active" : ""}`}
                onClick={() => setShowFiltros(f => !f)}
              >
                <SlidersHorizontal size={10} />
                <span className="hidden sm:inline">filtros</span>
                {numFiltros > 0 && (
                  <span className="filters-badge">{numFiltros}</span>
                )}
                <ChevronDown
                  size={9}
                  style={{
                    transition: "transform 0.2s",
                    transform: showFiltros ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
            </div>

            {/* Nueva canción */}
            <button
              className="new-btn"
              onClick={() => setShowNueva(true)}
            >
              <Plus size={11} />
              <span className="hidden sm:inline">Nueva</span>
            </button>

            {/* Offline */}
            {listaOffline && (
              <button
                onClick={refetch}
                style={{
                  fontSize: 8,
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--accent)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                sin conexión · reintentar
              </button>
            )}
          </div>

          {/* Panel de filtros desplegable */}
          {showFiltros && (
            <div className="filters-panel">
              <div style={{ maxWidth: 1152, margin: "0 auto", padding: "14px 24px" }}>
                <PanelFiltros filtros={filtros} onChange={setFiltros} opciones={opciones} />
              </div>
            </div>
          )}
        </header>

        {/* ── Cuerpo ── */}
        <main style={{ maxWidth: 1152, margin: "0 auto", padding: "20px 24px" }}>

          {/* Contador / meta */}
          <div className="results-meta">
            <span className="results-count">
              {filtradas.length} {filtradas.length === 1 ? "canción" : "canciones"}
              {(busqueda || numFiltros > 0) ? ` · de ${canciones.length} totales` : ""}
            </span>
            {(busqueda || numFiltros > 0) && (
              <button
                className="results-clear"
                onClick={() => { setBusqueda(""); setFiltros(FILTROS_VACIOS); }}
              >
                ✕ limpiar todo
              </button>
            )}
          </div>

          {/* Contenido */}
          {loadingLista ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 0",
              color: "var(--primary)",
              opacity: 0.35,
            }}>
              <Loader2 size={18} className="animate-spin" />
            </div>

          ) : filtradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BookOpen size={18} strokeWidth={1.5} />
              </div>
              <span className="empty-state-label">sin resultados</span>
              {(busqueda || numFiltros > 0) && (
                <button
                  className="empty-state-clear"
                  onClick={() => { setBusqueda(""); setFiltros(FILTROS_VACIOS); }}
                >
                  limpiar filtros
                </button>
              )}
            </div>

          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 8,
            }}>
              {filtradas.map(c => (
                <CancionCard
                  key={c.id}
                  cancion={c}
                  onClick={() => setSelectedId(c.id)}
                  onEdit={setEditandoCancion}
                  onDelete={handleCancionEliminada}
                  onToggleVisible={handleToggleVisible}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {showNueva && (
        <ModalNuevaCancion
          onCreated={handleCancionCreada}
          onClose={() => setShowNueva(false)}
        />
      )}
      {editandoCancion && (
        <ModalEditarCancion
          cancion={editandoCancion}
          onSaved={handleCancionEditada}
          onClose={() => setEditandoCancion(null)}
        />
      )}
    </>
  );
}