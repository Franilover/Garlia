"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Music, Loader2, Eye, EyeOff, ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useLastOpenedId } from "@/hooks/useEditorShared";
import { db } from "@/lib/api/client/db";
import { enqueueOperation } from "@/hooks/data/useOfflineSync";

import { useCanciones } from "./hooks/useCanciones";
import { ESTADOS, ESTADO_COLOR } from "./constants";
import { SidebarItem } from "./components/sidebar/SidebarItem";
import { PanelEditor } from "./components/editor/PanelEditor";
import { ModalNuevaCancion } from "./components/modals/ModalNuevaCancion";
import { ModalEditarCancion } from "./components/modals/ModalEditarCancion";

import type { Cancion } from "./types";

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

  /* ── Pills de canciones ── */
  .song-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px 5px 6px;
    border: 1px solid color-mix(in srgb, var(--primary) 12%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--primary) 3%, transparent);
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
    position: relative;
    width: 100%;
    text-align: left;
  }
  .song-card:hover {
    background: color-mix(in srgb, var(--primary) 7%, transparent);
    border-color: color-mix(in srgb, var(--primary) 22%, transparent);
  }
  .song-card-accent {
    flex-shrink: 0;
    width: 3px;
    height: 28px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--primary) 20%, transparent);
  }
  .song-card-accent.terminada {
    background: color-mix(in srgb, var(--callout-success-border) 70%, transparent);
  }
  .song-card-accent.en-proceso {
    background: color-mix(in srgb, var(--callout-warning-border) 70%, transparent);
  }
  .song-card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .song-card-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid;
    font-size: 7px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    width: fit-content;
    margin-bottom: 2px;
  }
  .song-card-title {
    font-size: 11px;
    font-weight: 900;
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
    color: var(--primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .song-card-sub {
    font-size: 9px;
    font-family: var(--font-mono, monospace);
    color: var(--primary);
    opacity: 0.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.03em;
  }
  .song-card-lang {
    font-size: 8px;
    font-family: var(--font-mono, monospace);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--primary);
    opacity: 0.25;
  }
  .song-card-actions {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .song-card:hover .song-card-actions {
    opacity: 1;
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
  onToggleVisible: (id: string, visible: boolean) => void | Promise<void>;
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
      {/* Acento de estado — barra vertical izquierda */}
      <div className={`song-card-accent ${estadoAccentClass(cancion.estado)}`} />

      <div className="song-card-body">
        {/* Badge de estado */}
        <span className="song-card-badge" style={estadoBadgeStyle(cancion.estado)}>
          {estadoLabel(cancion.estado)}
        </span>
        {/* Título */}
        <div className="song-card-title">{cancion.titulo}</div>
        {/* Subtítulo: personaje o cantante */}
        {nombre && <div className="song-card-sub">{nombre}</div>}
        {/* Idioma */}
        {cancion.idioma && <div className="song-card-lang">{cancion.idioma}</div>}
      </div>

      {/* Acciones en hover */}
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
  onToggleVisible: (id: string, visible: boolean) => void | Promise<void>;
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
    // Llamamos al handler del padre que ya maneja offline
    await onToggleVisible(cancion.id, nuevoVisible);
    setToggling(false);
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
  const [selectedId, _setSelectedId] = useState<string | null>(lastId);

  const setSelectedId = (id: string | null) => {
    _setSelectedId(id);
    setLastId(id);
  };

  const [showNueva,       setShowNueva]       = useState(false);
  const [editandoCancion, setEditandoCancion] = useState<Cancion | null>(null);

  // Señal desde el buscador para abrir "nueva canción" al montar
  useEffect(() => {
    const action = localStorage.getItem("estudio-letras-action");
    if (!action) return;
    localStorage.removeItem("estudio-letras-action");
    if (action === "nueva-cancion") setTimeout(() => setShowNueva(true), 120);
  }, []);

  const ORDEN_ESTADO: Record<string, number> = { TERMINADA: 0, "EN PROCESO": 1, PENDIENTE: 2 };

  const cancionesOrdenadas = useMemo(() => [...canciones].sort((a, b) => {
    const estadoA = ORDEN_ESTADO[a.estado] ?? 9;
    const estadoB = ORDEN_ESTADO[b.estado] ?? 9;
    if (estadoA !== estadoB) return estadoA - estadoB;
    if (a.estado === "TERMINADA") return (b.visible ? 1 : 0) - (a.visible ? 1 : 0);
    return 0;
  }), [canciones]);

  const handleCancionCreada = (c: Cancion) => {
    setCanciones(prev => [c, ...prev]);
    setSelectedId(c.id);
  };

  const handleCancionEditada = (c: Cancion) => {
    setCanciones(prev => prev.map(x => x.id === c.id ? c : x));
  };

  const handleCancionEliminada = async (id: string) => {
    // Optimista: quitar de UI inmediatamente
    setCanciones(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);

    if (!navigator.onLine) {
      try { await (db as any)["canciones"]?.update(id, { deleted: true, status: "pending" }); } catch {}
      await enqueueOperation("canciones", "delete", id);
      return;
    }
    try {
      await supabase.from("canciones").delete().eq("id", id);
      try { await (db as any)["canciones"]?.delete(id); } catch {}
    } catch {
      try { await (db as any)["canciones"]?.update(id, { deleted: true, status: "pending" }); } catch {}
      await enqueueOperation("canciones", "delete", id);
    }
  };

  const handleToggleVisible = useCallback((id: string, visible: boolean) => {
    setCanciones(prev => prev.map(c => c.id === id ? { ...c, visible } : c));
  }, [setCanciones]);

  // handleToggleVisibleWrite: persiste el cambio con fallback offline
  const handleToggleVisibleWrite = useCallback(async (id: string, visible: boolean) => {
    handleToggleVisible(id, visible); // optimista
    const payload = { visible };
    if (!navigator.onLine) {
      try { await (db as any)["canciones"]?.update(id, { ...payload, status: "pending" }); } catch {}
      await enqueueOperation("canciones", "update", id, payload);
      return;
    }
    try {
      await supabase.from("canciones").update(payload).eq("id", id);
      try { await (db as any)["canciones"]?.update(id, { ...payload, status: "synced" }); } catch {}
    } catch {
      try { await (db as any)["canciones"]?.update(id, { ...payload, status: "pending" }); } catch {}
      await enqueueOperation("canciones", "update", id, payload);
    }
  }, [handleToggleVisible]);

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
      <div style={{ padding: "8px 10px" }}>
        {loadingLista ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0", color: "var(--primary)", opacity: 0.3 }}>
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : canciones.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "40px 0", color: "var(--primary)", opacity: 0.25 }}>
            <Music size={18} strokeWidth={1.5} />
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>sin canciones</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {cancionesOrdenadas.map(c => (
              <CancionCard
                key={c.id}
                cancion={c}
                onClick={() => setSelectedId(c.id)}
                onEdit={setEditandoCancion}
                onDelete={handleCancionEliminada}
                onToggleVisible={handleToggleVisibleWrite}
              />
            ))}
          </div>
        )}
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