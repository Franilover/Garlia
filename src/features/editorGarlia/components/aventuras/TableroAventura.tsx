"use client";

/**
 * TableroAventura
 * ───────────────────────────────────────────────────────────────────────────
 * Pizarrón libre: cada entidad de la aventura es una tarjeta (imagen grande +
 * texto al lado) que se puede arrastrar a cualquier posición (x, y libres,
 * no grid fijo). Se usa en dos modos:
 *
 *   - editable=true  (admin, AventuraSection): el DM puede arrastrar cada
 *     tarjeta para reordenar/reubicar el tablero. Al soltar, persiste
 *     pos_x/pos_y vía onMove.
 *   - editable=false (público, /garlia/aventura): mismas posiciones, solo
 *     lectura — clickeable para abrir el detalle.
 *
 * Las posiciones son coordenadas libres en píxeles dentro de un lienzo con
 * scroll (no un grid). Si un item no tiene pos_x/pos_y todavía (recién
 * agregado), se le asigna una posición en cascada automática.
 */

import { BookOpen } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";

const CANVAS_MIN_W = 1400;
const CANVAS_MIN_H = 900;

/**
 * Tamaño estándar de tarjeta, compartido entre admin y público para que el
 * tablero se vea (y se posicione) exactamente igual en los dos lados.
 * Si necesitás otro tamaño en algún lugar, mejor ajustar esto que pasar
 * valores sueltos — así no se vuelven a desincronizar.
 */
export const TABLERO_CARD_SIZE = { width: 360, height: 140, imageWidth: 140 };

export interface TableroItem {
  id: string;
  nombre: string;
  imagen_url: string | null;
  subtitulo?: string | null;
  pos_x: number | null;
  pos_y: number | null;
  destacado?: boolean;
}

interface TableroAventuraProps {
  items: TableroItem[];
  editable?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  onClickItem?: (id: string) => void;
  renderBadge?: (item: TableroItem) => React.ReactNode;
  emptyHint?: string;
  /** Ancho de cada tarjeta en px. Default 260 (admin); usar ~360 en público. */
  cardWidth?: number;
  /** Alto de cada tarjeta en px. Default 96 (admin); usar ~140 en público. */
  cardHeight?: number;
  /** Ancho de la imagen dentro de la tarjeta en px. Default = cardHeight. */
  imageWidth?: number;
}

/** Asigna una posición en cascada a los items que todavía no tienen pos_x/pos_y. */
function usePosicionesResueltas(items: TableroItem[], cardW: number, cardH: number) {
  return useMemo(() => {
    let cascadeIndex = 0;
    return items.map((item) => {
      if (item.pos_x !== null && item.pos_y !== null) return item;
      const col = cascadeIndex % 4;
      const row = Math.floor(cascadeIndex / 4);
      cascadeIndex += 1;
      return {
        ...item,
        pos_x: 24 + col * (cardW + 24),
        pos_y: 24 + row * (cardH + 24),
      };
    });
  }, [items, cardW, cardH]);
}

export function TableroAventura({
  items,
  editable = false,
  onMove,
  onClickItem,
  renderBadge,
  emptyHint = "Todavía no hay nada aquí.",
  cardWidth = TABLERO_CARD_SIZE.width,
  cardHeight = TABLERO_CARD_SIZE.height,
  imageWidth,
}: TableroAventuraProps) {
  const CARD_W = cardWidth;
  const CARD_H = cardHeight;
  const IMG_W = imageWidth ?? TABLERO_CARD_SIZE.imageWidth;
  const resueltos = usePosicionesResueltas(items, CARD_W, CARD_H);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const [livePos, setLivePos] = useState<Record<string, { x: number; y: number }>>({});
  const [dragMoved, setDragMoved] = useState(false);

  const canvasW = Math.max(
    CANVAS_MIN_W,
    ...resueltos.map((i) => (i.pos_x ?? 0) + CARD_W + 60),
  );
  const canvasH = Math.max(
    CANVAS_MIN_H,
    ...resueltos.map((i) => (i.pos_y ?? 0) + CARD_H + 60),
  );

  const handlePointerDown = (e: React.PointerEvent, item: TableroItem) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragId(item.id);
    setDragMoved(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragId || !containerRef.current) return;
    const canvasRect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    const x = e.clientX - canvasRect.left + scrollLeft - dragOffset.current.dx;
    const y = e.clientY - canvasRect.top + scrollTop - dragOffset.current.dy;
    const clampedX = Math.max(0, x);
    const clampedY = Math.max(0, y);
    setLivePos((prev) => ({ ...prev, [dragId]: { x: clampedX, y: clampedY } }));
    setDragMoved(true);
  };

  const handlePointerUp = (e: React.PointerEvent, item: TableroItem) => {
    if (dragId !== item.id) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    const final = livePos[item.id];
    setDragId(null);
    if (final && dragMoved) {
      onMove?.(item.id, Math.round(final.x), Math.round(final.y));
    } else if (!dragMoved) {
      onClickItem?.(item.id);
    }
    setLivePos((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-primary/30">{emptyHint}</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 overflow-auto rounded-xl"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 39px, color-mix(in srgb, var(--primary) 6%, transparent) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, color-mix(in srgb, var(--primary) 6%, transparent) 40px)",
        touchAction: editable ? "none" : "auto",
      }}
    >
      <div
        className="relative"
        style={{ width: canvasW, height: canvasH }}
      >
        {resueltos.map((item) => {
          const live = livePos[item.id];
          const x = live?.x ?? item.pos_x ?? 0;
          const y = live?.y ?? item.pos_y ?? 0;
          const isDraggingThis = dragId === item.id;
          return (
            <div
              key={item.id}
              onPointerDown={(e) => handlePointerDown(e, item)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, item)}
              className="group absolute flex items-stretch gap-3 rounded-2xl border overflow-hidden shadow-sm select-none"
              style={{
                left: x,
                top: y,
                width: CARD_W,
                height: CARD_H,
                background: "var(--white-custom)",
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                cursor: editable ? (isDraggingThis ? "grabbing" : "grab") : "pointer",
                zIndex: isDraggingThis ? 30 : 1,
                boxShadow: isDraggingThis
                  ? "0 10px 24px rgba(0,0,0,0.18)"
                  : "0 1px 3px rgba(0,0,0,0.06)",
                transition: isDraggingThis ? "none" : "box-shadow 0.15s ease",
              }}
            >
              <div
                className="relative h-full shrink-0 bg-primary/5 overflow-hidden"
                style={{ width: IMG_W }}
              >
                {item.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BookOpen size={18} className="text-primary/20" />
                  </div>
                )}
                {renderBadge && (
                  <div className="absolute top-1 right-1">{renderBadge(item)}</div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center py-2 pr-3 gap-0.5">
                {item.subtitulo && (
                  <span className="text-micro font-black uppercase tracking-widest text-primary/35 truncate">
                    {item.subtitulo}
                  </span>
                )}
                <h3
                  className="font-serif italic text-primary truncate"
                  style={{ fontSize: CARD_H >= 130 ? "1.1rem" : undefined }}
                >
                  {item.nombre}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
