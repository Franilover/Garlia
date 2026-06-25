"use client";

/**
 * ReinoTileCanvas
 * ───────────────
 * Mapa de tiles para un reino individual.
 * Reemplaza el <img> único de MapaConPuntos.
 *
 * - Carga los tiles de `reino_tiles` filtrados por reino_id
 * - Compone todos los tiles en un OffscreenCanvas
 * - Dibuja los pins de ciudades encima (coord_x/y en %)
 * - Permite mover pins haciendo click en uno y luego en el mapa
 * - Botón para abrir el picker de imagen por tile
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, Map, MapPin, Plus, Trash2, X } from "lucide-react";

import { supabase } from "@/lib/api/client/supabase";
import {
  invalidateReinoTiles,
  loadReinoTiles,
} from "@/lib/api/client/syncEngine";
import type { Ciudad } from "@/features/editorGarlia/views/EditorCiudad";

// Extiende Ciudad con las coordenadas de tile añadidas en la migración
type CiudadConTile = Ciudad & {
  tile_col?: number | null;
  tile_row?: number | null;
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type ReinoTile = {
  id: string;
  reino_id: string;
  col: number;
  row: number;
  image_url: string | null;
  label?: string | null;
};

// ─── ImagePickerModal (lazy, igual que EditorReino) ───────────────────────────
function ImagePickerModal({
  title,
  onSelect,
  onClose,
}: {
  title?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [Picker, setPicker] = useState<React.ComponentType<any> | null>(null);
  useEffect(() => {
    import("@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker").then(
      (m) => setPicker(() => m.default),
    );
  }, []);

  return (
    <div
      className="fixed inset-0 z-80 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white-custom rounded-t-2xl sm:rounded-2xl shadow-2xl border border-primary/15 w-full sm:max-w-lg p-5 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
            <ImageIcon size={11} /> {title ?? "Elegir imagen"}
          </h3>
          <button
            className="text-primary/30 hover:text-primary transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        {Picker ? (
          <Picker onClose={onClose} onSelect={onSelect} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary/60 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hook: carga y gestión de tiles del reino ─────────────────────────────────
export function useReinoTiles(reinoId: string) {
  const [tiles, setTiles] = useState<ReinoTile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await loadReinoTiles(reinoId, (fresh) => {
      setTiles(fresh as ReinoTile[]);
    });
    setTiles(data as ReinoTile[]);
    setLoading(false);
  }, [reinoId]);

  useEffect(() => {
    load();
  }, [load]);

  const addTile = async (col: number, row: number) => {
    const { data, error } = await supabase
      .from("reino_tiles")
      .insert({ reino_id: reinoId, col, row, order: tiles.length })
      .select()
      .single();
    if (!error && data) setTiles((prev) => [...prev, data as ReinoTile]);
    return !error;
  };

  const updateTileImage = async (tileId: string, image_url: string) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, image_url } : t)),
    );
    await supabase.from("reino_tiles").update({ image_url }).eq("id", tileId);
    await invalidateReinoTiles(reinoId);
  };

  const deleteTile = async (tileId: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== tileId));
    await supabase.from("reino_tiles").delete().eq("id", tileId);
    await invalidateReinoTiles(reinoId);
  };

  return { tiles, loading, addTile, updateTileImage, deleteTile, reload: load };
}

// ─── ReinoTileCanvas ──────────────────────────────────────────────────────────
interface ReinoTileCanvasProps {
  reinoId: string;
  detalles: CiudadConTile[];
  onDetallesChange: (d: CiudadConTile[]) => void;
  editMode?: boolean;
  tileSize?: number;
  onPinClick?: (ciudad: CiudadConTile) => void;
}

export function ReinoTileCanvas({
  reinoId,
  detalles,
  onDetallesChange,
  editMode = false,
  tileSize = 1024,
  onPinClick,
}: ReinoTileCanvasProps) {
  const { tiles, loading, addTile, updateTileImage, deleteTile } =
    useReinoTiles(reinoId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const compositeRef = useRef<OffscreenCanvas | null>(null);
  const compositeReadyRef = useRef(false);
  const [compositeReady, setCompositeReady] = useState(false);

  const camRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef(0);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [pickerTile, setPickerTile] = useState<ReinoTile | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ── Dimensiones ─────────────────────────────────────────────────────────────
  const tilesWithImage = tiles.filter((t) => t.image_url);
  const minCol = tiles.length > 0 ? Math.min(...tiles.map((t) => t.col)) : 0;
  const minRow = tiles.length > 0 ? Math.min(...tiles.map((t) => t.row)) : 0;
  const totalCols =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.col)) - minCol + 1 : 1;
  const totalRows =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.row)) - minRow + 1 : 1;
  const totalW = totalCols * tileSize;
  const totalH = totalRows * tileSize;

  // ── Componer tiles en OffscreenCanvas ────────────────────────────────────────
  useEffect(() => {
    compositeReadyRef.current = false;
    setCompositeReady(false);

    if (tilesWithImage.length === 0) {
      compositeRef.current = null;
      compositeReadyRef.current = true;
      setCompositeReady(true);
      return;
    }

    const oc = new OffscreenCanvas(totalW, totalH);
    const octx = oc.getContext("2d")!;
    let loaded = 0;

    tilesWithImage.forEach((tile) => {
      const img = new window.Image();
      if (tile.image_url!.startsWith("http")) img.crossOrigin = "anonymous";
      img.src = tile.image_url!;
      const drawX = (tile.col - minCol) * tileSize;
      const drawY = (tile.row - minRow) * tileSize;
      img.onload = () => {
        octx.drawImage(img, drawX, drawY, tileSize, tileSize);
        loaded++;
        if (loaded === tilesWithImage.length) {
          compositeRef.current = oc;
          compositeReadyRef.current = true;
          setCompositeReady(true);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === tilesWithImage.length) {
          compositeRef.current = oc;
          compositeReadyRef.current = true;
          setCompositeReady(true);
        }
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tiles.map((t) => `${t.col}:${t.row}:${t.image_url}`).join("|"),
    tileSize,
    totalW,
    totalH,
  ]);

  // ── Centrar ──────────────────────────────────────────────────────────────────
  const centerImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale =
      Math.min(canvas.width / totalW, canvas.height / totalH) * 0.95;
    camRef.current = {
      x: (canvas.width - totalW * scale) / 2,
      y: (canvas.height - totalH * scale) / 2,
      scale,
    };
  }, [totalW, totalH]);

  useEffect(() => {
    if (compositeReady) centerImage();
  }, [compositeReady, centerImage]);

  // ── Resize ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    centerImage();
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      centerImage();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [centerImage]);

  // ── Draw loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (t: number) => {
      pulseRef.current = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fondo
      const bg =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-main")
          .trim() || "#f0e6d0";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { x: cx, y: cy, scale } = camRef.current;
      const iw = totalW * scale;
      const ih = totalH * scale;

      ctx.save();
      ctx.translate(cx, cy);

      // Imagen compuesta
      if (compositeRef.current && compositeReadyRef.current) {
        ctx.drawImage(compositeRef.current, 0, 0, iw, ih);
      } else if (compositeReadyRef.current && tiles.length > 0) {
        // tiles sin imagen: mostrar placeholder por cada tile
        tiles.forEach((tile) => {
          const tx = (tile.col - minCol) * tileSize * scale;
          const ty = (tile.row - minRow) * tileSize * scale;
          ctx.fillStyle = "rgba(0,0,0,0.06)";
          ctx.fillRect(tx, ty, tileSize * scale, tileSize * scale);
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.lineWidth = 1;
          ctx.strokeRect(tx, ty, tileSize * scale, tileSize * scale);
        });
      }

      // Bordes de tiles
      if (tiles.length > 1) {
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 1;
        for (let c = 0; c <= totalCols; c++) {
          ctx.beginPath();
          ctx.moveTo(c * tileSize * scale, 0);
          ctx.lineTo(c * tileSize * scale, ih);
          ctx.stroke();
        }
        for (let r = 0; r <= totalRows; r++) {
          ctx.beginPath();
          ctx.moveTo(0, r * tileSize * scale);
          ctx.lineTo(iw, r * tileSize * scale);
          ctx.stroke();
        }
      }

      // Pins de ciudades
      const pulse = (Math.sin(t / 600) + 1) / 2;
      const accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#c08040";

      for (const d of detalles) {
        // Si tiene tile_col/row, posicionar dentro de ese tile
        // Si no (puntos sin tile asignado), usar coord como % del total
        let mx: number;
        let my: number;
        if (d.tile_col != null && d.tile_row != null) {
          const tileOffsetX = (d.tile_col - minCol) * tileSize * scale;
          const tileOffsetY = (d.tile_row - minRow) * tileSize * scale;
          mx = tileOffsetX + ((d.coord_x ?? 50) / 100) * tileSize * scale;
          my = tileOffsetY + ((d.coord_y ?? 50) / 100) * tileSize * scale;
        } else {
          mx = ((d.coord_x ?? 50) / 100) * iw;
          my = ((d.coord_y ?? 50) / 100) * ih;
        }
        const isSelected = d.id === selectedPinId;

        if (isSelected) {
          const r = 14 + pulse * 4;
          const grd = ctx.createRadialGradient(mx, my, 0, mx, my, r);
          grd.addColorStop(0, `${accent}55`);
          grd.addColorStop(1, `${accent}00`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(mx, my, r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(mx, my, isSelected ? 6 : 5, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? accent : `${accent}cc`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        if (scale > 0.3) {
          const label = d.nombre || "";
          if (label) {
            const fontSize = Math.max(9, Math.min(13, 11 / scale));
            ctx.font = `700 ${fontSize}px 'Cinzel', serif`;
            const tw = ctx.measureText(label).width;
            const pad = 4;
            ctx.fillStyle = "rgba(253,246,238,0.9)";
            ctx.fillRect(mx - tw / 2 - pad, my + 8, tw + pad * 2, fontSize + 5);
            ctx.fillStyle = "#2a1304";
            ctx.fillText(label, mx - tw / 2, my + 8 + fontSize);
          }
        }
      }

      ctx.restore();

      // Hint si hay pin seleccionado
      if (selectedPinId) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "700 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          "Tocá el mapa para mover el punto",
          canvas.width / 2,
          canvas.height - 16,
        );
        ctx.textAlign = "left";
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    compositeReady,
    detalles,
    selectedPinId,
    totalW,
    totalH,
    tileSize,
    tiles,
    minCol,
    minRow,
    totalCols,
    totalRows,
  ]);

  // ── Helpers coord ─────────────────────────────────────────────────────────────
  const canvasToPct = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: cx, y: cy, scale } = camRef.current;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    return {
      x: Math.max(
        0,
        Math.min(100, Math.round(((px - cx) / (totalW * scale)) * 100)),
      ),
      y: Math.max(
        0,
        Math.min(100, Math.round(((py - cy) / (totalH * scale)) * 100)),
      ),
    };
  };

  const findPinAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: cx, y: cy, scale } = camRef.current;
    const iw = totalW * scale;
    const ih = totalH * scale;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    for (const d of [...detalles].reverse()) {
      let mx: number;
      let my: number;
      if (d.tile_col != null && d.tile_row != null) {
        const tileOffsetX = (d.tile_col - minCol) * tileSize * scale;
        const tileOffsetY = (d.tile_row - minRow) * tileSize * scale;
        mx = tileOffsetX + ((d.coord_x ?? 50) / 100) * tileSize * scale + cx;
        my = tileOffsetY + ((d.coord_y ?? 50) / 100) * tileSize * scale + cy;
      } else {
        mx = ((d.coord_x ?? 50) / 100) * iw + cx;
        my = ((d.coord_y ?? 50) / 100) * ih + cy;
      }
      if (Math.hypot(px - mx, py - my) < 14) return d;
    }
    return null;
  };

  // ── Zoom ──────────────────────────────────────────────────────────────────────
  const zoomAt = (clientX: number, clientY: number, delta: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ox = clientX - rect.left;
    const oy = clientY - rect.top;
    const cam = camRef.current;
    const newScale = Math.max(
      0.1,
      Math.min(10, cam.scale * (1 - delta * 0.001)),
    );
    const ratio = newScale / cam.scale;
    camRef.current = {
      scale: newScale,
      x: ox - (ox - cam.x) * ratio,
      y: oy - (oy - cam.y) * ratio,
    };
  };

  // ── Eventos ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY);
    };

    let isPointerDown = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      isPointerDown = true;
      isDragging.current = false;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        camX: camRef.current.x,
        camY: camRef.current.y,
      };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPointerDown) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.hypot(dx, dy) > 6) isDragging.current = true;
      if (isDragging.current) {
        camRef.current = {
          ...camRef.current,
          x: dragStart.current.camX + dx,
          y: dragStart.current.camY + dy,
        };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      isPointerDown = false;
      if (!isDragging.current) {
        const pct = canvasToPct(e.clientX, e.clientY);
        if (!pct) return;

        if (selectedPinId) {
          // Mover pin: calcular tile_col/row + coord local dentro del tile
          const cam = camRef.current;
          const rect2 = canvas.getBoundingClientRect();
          const rawX = e.clientX - rect2.left;
          const rawY = e.clientY - rect2.top;
          // Posición en el canvas virtual (px)
          const canvasX = (rawX - cam.x) / cam.scale;
          const canvasY = (rawY - cam.y) / cam.scale;
          // Determinar qué tile
          const clickedCol = minCol + Math.floor(canvasX / tileSize);
          const clickedRow = minRow + Math.floor(canvasY / tileSize);
          // Coord local dentro del tile (%)
          const localX = Math.max(
            0,
            Math.min(100, Math.round(((canvasX % tileSize) / tileSize) * 100)),
          );
          const localY = Math.max(
            0,
            Math.min(100, Math.round(((canvasY % tileSize) / tileSize) * 100)),
          );
          // Verificar que el tile existe
          const tileExists = tiles.some(
            (t) => t.col === clickedCol && t.row === clickedRow,
          );
          onDetallesChange(
            detalles.map((d) =>
              d.id === selectedPinId
                ? {
                    ...d,
                    coord_x: localX,
                    coord_y: localY,
                    tile_col: tileExists ? clickedCol : (d.tile_col ?? null),
                    tile_row: tileExists ? clickedRow : (d.tile_row ?? null),
                  }
                : d,
            ),
          );
          setSelectedPinId(null);
          return;
        }

        const pin = findPinAt(e.clientX, e.clientY);
        if (pin) {
          setSelectedPinId((prev) => (prev === pin.id ? null : pin.id));
          if (onPinClick) onPinClick(pin);
        }
      }
      isDragging.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastPinchDist.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        zoomAt(mid.x, mid.y, (lastPinchDist.current - dist) * 3);
        lastPinchDist.current = dist;
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", () => {
      lastPinchDist.current = null;
    });

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPinId, detalles, totalW, totalH]);

  // ── Zoom buttons ──────────────────────────────────────────────────────────────
  const zoomIn = () => {
    const c = canvasRef.current;
    if (c) zoomAt(c.width / 2, c.height / 2, -300);
  };
  const zoomOut = () => {
    const c = canvasRef.current;
    if (c) zoomAt(c.width / 2, c.height / 2, 300);
  };

  // ── Estado vacío ──────────────────────────────────────────────────────────────
  if (!loading && tiles.length === 0) {
    return (
      <div
        className="relative w-full flex flex-col items-center justify-center gap-3 py-14 rounded-xl border border-dashed"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <Map className="text-primary/20" size={28} strokeWidth={1} />
        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30">
          Sin tiles de mapa
        </p>
        <div className="flex gap-2">
          {[
            [0, 0],
            [1, 0],
            [0, 1],
          ].map(([c, r]) => (
            <button
              key={`${c}-${r}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
              onClick={() => addTile(c, r)}
            >
              <Plus size={10} /> Tile [{c},{r}]
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Canvas principal */}
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden"
        style={{
          borderColor: selectedPinId
            ? "color-mix(in srgb, var(--primary) 40%, transparent)"
            : "color-mix(in srgb, var(--primary) 10%, transparent)",
          cursor: selectedPinId ? "crosshair" : "grab",
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none w-full h-full"
        />

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
          {[
            { l: "+", fn: zoomIn },
            { l: "−", fn: zoomOut },
          ].map(({ l, fn }) => (
            <button
              key={l}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black shadow transition-all"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 80%, transparent)",
                color: "#fff",
              }}
              onClick={fn}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Cancelar selección */}
        {selectedPinId && (
          <button
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase"
            style={{
              background:
                "color-mix(in srgb, var(--foreground) 70%, transparent)",
              color: "#fff",
            }}
            onClick={() => setSelectedPinId(null)}
          >
            <X size={10} /> Cancelar
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Gestión de tiles — solo en editMode */}
      {editMode && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 flex-1">
              Tiles del mapa ({tiles.length})
            </span>
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/15 text-primary/50 hover:text-primary hover:border-primary/30 transition-all"
                onClick={() => setShowAddMenu((v) => !v)}
              >
                <Plus size={10} /> Añadir tile
              </button>
              {showAddMenu && (
                <div
                  className="absolute right-0 top-full mt-1 z-30 rounded-xl shadow-xl border overflow-hidden"
                  style={{
                    background: "var(--white-custom)",
                    borderColor:
                      "color-mix(in srgb, var(--primary) 12%, transparent)",
                    minWidth: 160,
                  }}
                >
                  {[
                    {
                      label: "→ Columna derecha",
                      col:
                        (tiles.length > 0
                          ? Math.max(...tiles.map((t) => t.col))
                          : -1) + 1,
                      row: minRow,
                    },
                    {
                      label: "↓ Fila abajo",
                      col: minCol,
                      row:
                        (tiles.length > 0
                          ? Math.max(...tiles.map((t) => t.row))
                          : -1) + 1,
                    },
                  ].map(({ label, col, row }) => (
                    <button
                      key={label}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-colors"
                      style={{ color: "var(--foreground)" }}
                      onClick={async () => {
                        await addTile(col, row);
                        setShowAddMenu(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de tiles */}
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className="relative rounded-lg overflow-hidden border group/tile"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                  background:
                    "color-mix(in srgb, var(--primary) 5%, transparent)",
                }}
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video cursor-pointer"
                  onClick={() => setPickerTile(tile)}
                >
                  {tile.image_url ? (
                    <>
                      <img
                        alt={`Tile ${tile.col},${tile.row}`}
                        className="w-full h-full object-cover"
                        src={tile.image_url}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/tile:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover/tile:opacity-100">
                        <ImageIcon className="text-white" size={16} />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-primary/5">
                      <ImageIcon className="text-primary/20" size={16} />
                      <span className="text-[8px] font-black uppercase tracking-widest text-primary/25">
                        Sin imagen
                      </span>
                    </div>
                  )}
                </div>

                {/* Info y acciones */}
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <span className="text-[9px] font-black uppercase text-primary/50 flex-1">
                    [{tile.col}, {tile.row}]
                  </span>
                  <button
                    className="text-primary/20 hover:text-primary/60 transition-colors"
                    title="Cambiar imagen"
                    onClick={() => setPickerTile(tile)}
                  >
                    <ImageIcon size={10} />
                  </button>
                  <button
                    className="text-red-400/30 hover:text-red-400 transition-colors"
                    title="Eliminar tile"
                    onClick={() => deleteTile(tile.id)}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image picker modal */}
      {pickerTile && (
        <ImagePickerModal
          title={`Imagen tile [${pickerTile.col}, ${pickerTile.row}]`}
          onClose={() => setPickerTile(null)}
          onSelect={(url) => {
            updateTileImage(pickerTile.id, url);
            setPickerTile(null);
          }}
        />
      )}
    </div>
  );
}
