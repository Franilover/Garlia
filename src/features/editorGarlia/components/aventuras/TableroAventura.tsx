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

import { BookOpen, UserRound } from "lucide-react";
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

/** Tamaño del círculo-ficha (token) del propio personaje del jugador en el
 *  pizarrón — mismo diámetro tanto si tiene foto como si muestra el ícono
 *  de persona por defecto. */
export const TABLERO_TOKEN_SIZE = 64;

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
  /** Mantener presionada una tarjeta/token (sin arrastrar) más de
   *  LONG_PRESS_MS: pensado para "ver descripción" sin disparar la acción
   *  normal de onClickItem (ej. entrar en combate). Si se pasa, un click
   *  corto sigue llamando a onClickItem como siempre; solo la presión
   *  larga dispara esto en su lugar. */
  onLongPressItem?: (id: string) => void;
  /** Se dispara al soltar una tarjeta arrastrada (editable=true) sobre
   *  otra tarjeta distinta — sus áreas se solapan lo suficiente al momento
   *  de soltar. Pensado para "arrastrar una criatura sobre otra para
   *  agruparlas en una horda". No interfiere con onMove: si hay
   *  solapamiento se llama a onDropOnItem en vez de onMove (agrupar tiene
   *  prioridad sobre reposicionar libremente encima de otra tarjeta). */
  onDropOnItem?: (draggedId: string, targetId: string) => void;
  /** Click en un punto vacío del lienzo (fuera de cualquier tarjeta):
   *  reporta la posición lógica (ya dividida por zoom, mismas unidades
   *  que pos_x/pos_y). Se usa para "mover con un click" — el jugador
   *  clickea el pizarrón y su ficha salta ahí. No interfiere con el
   *  drag del DM ni con onClickItem de las tarjetas. */
  onCanvasClick?: (x: number, y: number) => void;
  renderBadge?: (item: TableroItem) => React.ReactNode;
  emptyHint?: string;
  /** Ancho de cada tarjeta en px. Default 260 (admin); usar ~360 en público. */
  cardWidth?: number;
  /** Alto de cada tarjeta en px. Default 96 (admin); usar ~140 en público. */
  cardHeight?: number;
  /** Ancho de la imagen dentro de la tarjeta en px. Default = cardHeight. */
  imageWidth?: number;
  /** Zoom del pizarrón completo (1 = 100%). A diferencia de cardWidth/
   *  cardHeight (que cambian el tamaño real de cada tarjeta y su layout
   *  interno), esto escala el lienzo entero con CSS transform: todas las
   *  tarjetas y sus posiciones relativas quedan intactas, solo cambia
   *  cuánto ocupan en pantalla — como el zoom de un mapa. */
  zoom?: number;
  /** Si se pasa, el lienzo se mantiene centrado en este item (típicamente
   *  la propia ficha del jugador): al montar, al cambiar el zoom, y cada
   *  vez que el item se mueve (moverPosicion vía click u onMove), el
   *  scroll se reajusta para que quede en el centro del viewport. No pelea
   *  con el pan manual del usuario en otros momentos — solo re-centra en
   *  esos triggers puntuales, no en cada scroll. */
  centrarEnId?: string | null;
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
  onLongPressItem,
  onDropOnItem,
  onCanvasClick,
  renderBadge,
  emptyHint = "Todavía no hay nada aquí.",
  cardWidth = TABLERO_CARD_SIZE.width,
  cardHeight = TABLERO_CARD_SIZE.height,
  imageWidth,
  zoom = 1,
  centrarEnId = null,
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
  // ── Long press: si el pointer se mantiene quieto (sin drag) sobre una
  // tarjeta/token por LONG_PRESS_MS, se dispara onLongPressItem en vez de
  // la acción normal de click. Se cancela si hay drag o si se suelta
  // antes. `longPressFiredRef` evita que handlePointerUp además ejecute
  // el onClickItem normal cuando ya disparamos el long press.
  const LONG_PRESS_MS = 500;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const dragMovedRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const canvasW = Math.max(
    CANVAS_MIN_W,
    ...resueltos.map((i) => (i.pos_x ?? 0) + CARD_W + 60),
  );
  const canvasH = Math.max(
    CANVAS_MIN_H,
    ...resueltos.map((i) => (i.pos_y ?? 0) + CARD_H + 60),
  );

  // ── Auto-centrado en el propio personaje ──────────────────────────────
  // Mantiene al jugador siempre orientado: su ficha queda en el centro del
  // viewport sin importar cuánto haga zoom o hacia dónde se mueva. Se
  // re-centra en tres momentos puntuales (no en cada scroll, para no pelear
  // con un pan manual que el usuario quisiera hacer mientras mira el
  // pizarrón): al montar/cambiar de item objetivo, cuando cambia el zoom,
  // y cuando el item objetivo cambia de posición lógica (se movió, sea por
  // click propio o porque llegó por realtime).
  const itemCentrado = centrarEnId
    ? resueltos.find((i) => i.id === centrarEnId)
    : undefined;
  const centroX = itemCentrado?.pos_x ?? null;
  const centroY = itemCentrado?.pos_y ?? null;

  React.useEffect(() => {
    return () => clearLongPressTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!centrarEnId || centroX === null || centroY === null) return;
    const el = containerRef.current;
    if (!el) return;
    // Coordenadas del punto lógico ya escaladas al espacio de pantalla
    // (mismo espacio en el que vive el scroll), igual que en
    // handlePointerMove/onCanvasClick.
    const targetLeft = centroX * zoom - el.clientWidth / 2;
    const targetTop = centroY * zoom - el.clientHeight / 2;
    el.scrollTo({
      left: Math.max(0, targetLeft),
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centrarEnId, centroX, centroY, zoom]);


  // ── Drop target durante el arrastre: se recalcula en cada render
  // mientras se arrastra (livePos cambia) — así la tarjeta objetivo se
  // resalta ANTES de soltar, dándole feedback visual al DM de "esto se va
  // a agrupar si soltás acá". handlePointerUp reutiliza este mismo valor
  // al soltar, así no hay dos implementaciones del cálculo de solapamiento
  // que puedan desincronizarse.
  const dragItem = dragId ? resueltos.find((i) => i.id === dragId) : undefined;
  const dropTargetId = useMemo(() => {
    if (!dragId || !dragItem || !onDropOnItem) return null;
    const live = livePos[dragId];
    if (!live) return null;
    const centerX = live.x + (dragItem.destacado ? 0 : CARD_W / 2);
    const centerY = live.y + (dragItem.destacado ? 0 : CARD_H / 2);
    const objetivo = resueltos.find((other) => {
      if (other.id === dragId) return false;
      const ox = (other.pos_x ?? 0) + (other.destacado ? 0 : CARD_W / 2);
      const oy = (other.pos_y ?? 0) + (other.destacado ? 0 : CARD_H / 2);
      const radio =
        (dragItem.destacado ? TABLERO_TOKEN_SIZE / 2 : CARD_W / 2) +
        (other.destacado ? TABLERO_TOKEN_SIZE / 2 : CARD_W / 2);
      return Math.hypot(centerX - ox, centerY - oy) < radio * 0.6;
    });
    return objetivo?.id ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId, dragItem, livePos, resueltos, onDropOnItem, CARD_W, CARD_H]);

  const handlePointerDown = (e: React.PointerEvent, item: TableroItem) => {
    // En modo público (no editable) igual necesitamos trackear el
    // pointer down→up para poder distinguir "click" de "arrastre" y
    // abrir el modal de detalle — solo se salta la lógica de mover.
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragId(item.id);
    setDragMoved(false);

    longPressFiredRef.current = false;
    dragMovedRef.current = false;
    if (onLongPressItem) {
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        // Si para entonces ya se movió (drag), no cuenta como long press.
        if (dragMovedRef.current) return;
        longPressFiredRef.current = true;
        onLongPressItem(item.id);
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragId || !containerRef.current || !editable) return;
    const canvasRect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    // clientX/Y, canvasRect y scroll están todos en píxeles de pantalla
    // (ya escalados por el zoom, porque el lienzo interno tiene
    // transform: scale). Se resta todo en ese mismo espacio y recién al
    // final se divide por zoom para volver a las coordenadas lógicas
    // (sin escalar) en las que se guardan pos_x/pos_y.
    const x = (e.clientX - canvasRect.left + scrollLeft - dragOffset.current.dx) / zoom;
    const y = (e.clientY - canvasRect.top + scrollTop - dragOffset.current.dy) / zoom;
    const clampedX = Math.max(0, x);
    const clampedY = Math.max(0, y);
    setLivePos((prev) => ({ ...prev, [dragId]: { x: clampedX, y: clampedY } }));
    setDragMoved(true);
    dragMovedRef.current = true;
    clearLongPressTimer();
  };

  const handlePointerUp = (e: React.PointerEvent, item: TableroItem) => {
    if (dragId !== item.id) return;
    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    const final = livePos[item.id];
    // dropTargetId ya está calculado con la misma posición livePos[item.id]
    // que estamos por soltar (se recalcula en cada render mientras se
    // arrastra) — lo leemos ahora, antes de limpiar el drag, para no
    // duplicar la lógica de solapamiento acá.
    const objetivoId = dropTargetId;
    setDragId(null);
    clearLongPressTimer();
    if (final && dragMoved) {
      if (objetivoId) {
        // Soltó sobre otra tarjeta/token: se interpreta como "agrupar",
        // no como reposicionar libremente encima de ella.
        onDropOnItem?.(item.id, objetivoId);
      } else {
        onMove?.(item.id, Math.round(final.x), Math.round(final.y));
      }
    } else if (!dragMoved && !longPressFiredRef.current) {
      // Si el long press ya se disparó (mantuvo presionado), no
      // ejecutamos también el click normal al soltar.
      onClickItem?.(item.id);
    }
    longPressFiredRef.current = false;
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
      className="relative flex-1 min-h-0 min-w-0 overflow-auto rounded-xl"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 39px, color-mix(in srgb, var(--primary) 6%, transparent) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, color-mix(in srgb, var(--primary) 6%, transparent) 40px)",
        touchAction: editable ? "none" : "pan-x pan-y",
      }}
    >
      {/* ── Wrapper de tamaño real: mismo ancho/alto que ocupa el lienzo
          escalado en pantalla, para que el scroll del contenedor sepa
          cuánto hay que scrollear. El lienzo interno (tamaño lógico, sin
          escalar) se encoge/agranda visualmente con transform: scale —
          las tarjetas y sus posiciones no cambian, solo el zoom. ── */}
      <div style={{ width: canvasW * zoom, height: canvasH * zoom }}>
        <div
          className="relative"
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            cursor: onCanvasClick ? "crosshair" : undefined,
          }}
          onClick={(e) => {
            // Solo cuenta como "click en el lienzo" si el click no vino
            // burbujeado desde una tarjeta (e.target sería ese div hijo,
            // no este contenedor). Las tarjetas ya paran la propagación
            // en pointerdown/up, pero este chequeo es la red de seguridad
            // real para no mover la ficha al clickear encima de otra cosa.
            if (!onCanvasClick || e.target !== e.currentTarget) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            onCanvasClick(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)));
          }}
        >
        {resueltos.map((item) => {
          const live = livePos[item.id];
          const x = live?.x ?? item.pos_x ?? 0;
          const y = live?.y ?? item.pos_y ?? 0;
          const isDraggingThis = dragId === item.id;

          // ── Token circular: la propia ficha del jugador. pos_x/pos_y
          // guardan el CENTRO del círculo (no la esquina como las
          // tarjetas normales), así que al clickear el pizarrón el
          // círculo queda centrado justo en el punto clickeado — se
          // resta la mitad del diámetro acá, en el único lugar que
          // dibuja el token, para no tener que ajustar la lógica de
          // click/drag en ningún otro lado.
          //
          // El nombre va en una etiqueta aparte debajo del círculo, en un
          // wrapper sin overflow-hidden (el círculo sí lo tiene, para
          // recortar la imagen) — así el texto no queda recortado. Los
          // handlers de pointer siguen solo en el círculo: el wrapper es
          // puramente de layout, no agranda el área de drag. ──
          if (item.destacado) {
            const size = TABLERO_TOKEN_SIZE;
            const esDropTarget = dropTargetId === item.id;
            return (
              <div
                key={item.id}
                className="absolute flex flex-col items-center select-none"
                style={{
                  left: x - size / 2,
                  top: y - size / 2,
                  width: size,
                  zIndex: isDraggingThis ? 30 : 2,
                }}
              >
                <div
                  onPointerDown={(e) => handlePointerDown(e, item)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(e, item)}
                  title={item.nombre}
                  className="group rounded-full overflow-hidden flex items-center justify-center shrink-0"
                  style={{
                    width: size,
                    height: size,
                    background: item.imagen_url
                      ? undefined
                      : "color-mix(in srgb, var(--primary) 12%, transparent)",
                    border: esDropTarget
                      ? "2.5px dashed #22c55e"
                      : "2.5px solid var(--primary)",
                    cursor: editable ? (isDraggingThis ? "grabbing" : "grab") : "pointer",
                    touchAction: "manipulation",
                    boxShadow: esDropTarget
                      ? "0 0 0 4px rgba(34,197,94,0.25)"
                      : isDraggingThis
                        ? "0 10px 24px rgba(0,0,0,0.22)"
                        : "0 2px 6px rgba(0,0,0,0.15)",
                    transition: isDraggingThis ? "none" : "box-shadow 0.15s ease, border-color 0.15s ease",
                  }}
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
                    <UserRound
                      size={Math.round(size * 0.55)}
                      style={{ color: "var(--primary)" }}
                    />
                  )}
                </div>
                <span
                  className="mt-1 px-1.5 py-0.5 rounded-full text-micro font-bold truncate text-center pointer-events-none"
                  style={{
                    maxWidth: size + 40,
                    color: "var(--primary)",
                    background: "color-mix(in srgb, var(--white-custom) 85%, transparent)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                  }}
                >
                  {item.nombre}
                </span>
              </div>
            );
          }

          const tieneImagen = !!item.imagen_url;
          // Con imagen: tarjeta cuadrada (imagen ocupa todo el cuadro),
          // nombre y tipo abajo superpuestos con degradé, ej. "Personaje | Abel".
          // Sin imagen: layout anterior, imagen placeholder a la izquierda + texto.
          const cardStyleWidth = tieneImagen ? CARD_H : CARD_W;
          const esDropTarget = dropTargetId === item.id;
          return (
            <div
              key={item.id}
              onPointerDown={(e) => handlePointerDown(e, item)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, item)}
              className={`group absolute rounded-2xl border overflow-hidden shadow-sm select-none ${
                tieneImagen ? "" : "flex items-stretch gap-3"
              }`}
              style={{
                left: x,
                top: y,
                width: cardStyleWidth,
                height: CARD_H,
                background: "var(--white-custom)",
                borderColor: esDropTarget
                  ? "#22c55e"
                  : "color-mix(in srgb, var(--primary) 12%, transparent)",
                borderWidth: esDropTarget ? 2 : 1,
                borderStyle: esDropTarget ? "dashed" : "solid",
                cursor: editable ? (isDraggingThis ? "grabbing" : "grab") : "pointer",
                touchAction: "manipulation",
                zIndex: isDraggingThis ? 30 : 1,
                boxShadow: esDropTarget
                  ? "0 0 0 4px rgba(34,197,94,0.2)"
                  : isDraggingThis
                    ? "0 10px 24px rgba(0,0,0,0.18)"
                    : "0 1px 3px rgba(0,0,0,0.06)",
                transition: isDraggingThis ? "none" : "box-shadow 0.15s ease, border-color 0.15s ease",
              }}
            >
              {tieneImagen ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imagen_url!}
                    alt={item.nombre}
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 px-2.5 py-2"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.35) 60%, transparent)",
                    }}
                  >
                    {item.subtitulo && (
                      <span className="block text-micro font-black uppercase tracking-widest text-white/70 truncate">
                        {item.subtitulo}
                      </span>
                    )}
                    <h3 className="font-serif italic text-white truncate text-sm">
                      {item.nombre}
                    </h3>
                  </div>
                  {renderBadge && (
                    <div className="absolute top-1 right-1">{renderBadge(item)}</div>
                  )}
                </>
              ) : (
                <>
                  <div
                    className="relative h-full shrink-0 bg-primary/5 overflow-hidden"
                    style={{ width: IMG_W }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen size={18} className="text-primary/20" />
                    </div>
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
                </>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
