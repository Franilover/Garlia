"use client";

import { Music, Loader2, ArrowLeft } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";


import { PanelEditor } from "@/features/editorGarlia/components/canciones/editor/PanelEditor";
import { ModalNuevaCancion } from "@/features/editorGarlia/components/canciones/modals/ModalNuevaCancion";
import { useCanciones } from "@/features/editorGarlia/hooks/canciones/useCanciones";
import type { Cancion } from "@/features/editorGarlia/hooks/canciones/types";
import { useLastOpenedId } from "@/hooks/useEditorShared";

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

/* ─── Pill de canción — estilo "todo" de EditorMundo ─────────────────────── */
const ESTADO_DOT: Record<string, string> = {
  TERMINADA:    "color-mix(in srgb, var(--callout-success-border) 80%, transparent)",
  "EN PROCESO": "color-mix(in srgb, var(--callout-warning-border) 80%, transparent)",
};

const CancionCard = ({
  cancion,
  onClick,
}: {
  cancion: Cancion;
  onClick: () => void;
}) => (
  <button
    key={cancion.id}
    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
    type="button"
    onClick={onClick}
  >
    {/* Icono con dot de color por estado */}
    <div className="w-6 h-6 rounded-lg border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center relative">
      <Music className="text-primary/25" size={10} />
      {ESTADO_DOT[cancion.estado] && (
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_DOT[cancion.estado] }} />
      )}
    </div>
    <span className="text-[11px] font-bold text-primary/70 truncate max-w-[90px]">{cancion.titulo}</span>
  </button>
);

/* ─── Acciones flotantes de la card ──────────────────────────────────────── */
/* ─── Vista principal ─────────────────────────────────────────────────────── */
export default function EstudioLetras() {
  const { canciones, setCanciones, loading: loadingLista } = useCanciones();
  const [lastId, setLastId] = useLastOpenedId("estudio-letras-last-id");
  const [selectedId, _setSelectedId] = useState<string | null>(lastId);

  const setSelectedId = (id: string | null) => {
    _setSelectedId(id);
    setLastId(id);
  };

  const [showNueva, setShowNueva] = useState(false);

  // Señal desde el buscador para abrir "nueva canción"
  // Usamos también el evento "storage" para detectar la señal cuando el componente
  // ya estaba montado (el useEffect con [] solo corre al montar por primera vez).
  useEffect(() => {
    const check = () => {
      const action = localStorage.getItem("estudio-letras-action");
      if (!action) return;
      localStorage.removeItem("estudio-letras-action");
      if (action === "nueva-cancion") setTimeout(() => setShowNueva(true), 120);
    };
    check(); // revisar al montar
    window.addEventListener("estudio-letras-action", check);
    return () => window.removeEventListener("estudio-letras-action", check);
  }, []);

  const ORDEN_ESTADO: Record<string, number> = { TERMINADA: 0, "EN PROCESO": 1, PENDIENTE: 2 };

  const cancionesOrdenadas = useMemo(() => [...canciones].sort((a, b) => {
    const estadoA = ORDEN_ESTADO[a.estado] ?? 9;
    const estadoB = ORDEN_ESTADO[b.estado] ?? 9;
    if (estadoA !== estadoB) return estadoA - estadoB;
    return 0;
  }), [canciones]);

  const handleCancionCreada = (c: Cancion) => {
    setCanciones(prev => [c, ...prev]);
    setSelectedId(c.id);
  };

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
              onClick={() => setSelectedId(null)}
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
      </>
    );
  }

  /* ── Vista lista ── */
  return (
    <>
      <div style={{ padding: "8px 10px" }}>
        {loadingLista ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0", color: "var(--primary)", opacity: 0.3 }}>
            <Loader2 className="animate-spin" size={16} />
          </div>
        ) : canciones.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "40px 0", color: "var(--primary)", opacity: 0.25 }}>
            <Music size={18} strokeWidth={1.5} />
            <span style={{ fontSize: 9, fontFamily: "var(--font-mono, monospace)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>sin canciones</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cancionesOrdenadas.map(c => (
              <CancionCard
                key={c.id}
                cancion={c}
                onClick={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showNueva && (
        <ModalNuevaCancion
          onClose={() => setShowNueva(false)}
          onCreated={handleCancionCreada}
        />
      )}
    </>
  );
}