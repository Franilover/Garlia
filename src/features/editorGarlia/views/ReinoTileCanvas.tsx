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
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImageIcon,
  ImagePlus,
  Map,
  Plus,
  Trash2,
  X,
} from "lucide-react";

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

// ─── Toast local (igual que EditorMapa) ───────────────────────────────────────
function Toast({
  msg,
  ok,
  onClose,
}: {
  msg: string;
  ok: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 shadow-lg text-[10px] font-bold uppercase tracking-widest"
      style={{
        background: ok ? "rgba(5,150,105,0.95)" : "rgba(185,28,28,0.95)",
        color: "#fff",
        border: `1px solid ${ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
        borderRadius: "1px",
      }}
    >
      {ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  );
}

// ─── Hourglass (igual que EditorMapa) ─────────────────────────────────────────
function Hourglass({ size = 14 }: { size?: number }) {
  return (
    <svg
      fill="none"
      height={size * 1.45}
      style={{
        animation: "rtc-hg-flip 2.4s ease-in-out infinite",
        transformOrigin: "center",
        flexShrink: 0,
      }}
      viewBox="0 0 22 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`@keyframes rtc-hg-flip{0%,40%{transform:rotate(0deg)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(180deg)}}`}</style>
      <rect
        fill="currentColor"
        height="2.5"
        opacity="0.7"
        rx="0"
        width="20"
        x="1"
        y="0"
      />
      <rect
        fill="currentColor"
        height="2.5"
        opacity="0.7"
        rx="0"
        width="20"
        x="1"
        y="29.5"
      />
      <path
        d="M2 2.5 L11 16 L20 2.5 Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="0.8"
      />
      <path
        d="M2 29.5 L11 16 L20 29.5 Z"
        fill="currentColor"
        fillOpacity="0.5"
        stroke="currentColor"
        strokeOpacity="0.6"
        strokeWidth="0.8"
      />
    </svg>
  );
}

// ─── Modal para crear tile en posición custom (igual que EditorMapa) ─────────
function ModalNuevoTile({
  existingPositions,
  onClose,
  onCreate,
}: {
  existingPositions: { col: number; row: number }[];
  onClose: () => void;
  onCreate: (col: number, row: number) => Promise<boolean>;
}) {
  const [col, setCol] = useState(0);
  const [row, setRow] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOccupied = existingPositions.some(
    (p) => p.col === col && p.row === row,
  );

  const handleCreate = async () => {
    if (isOccupied) {
      setError("Ya existe un tile en esa posición");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const ok = await onCreate(col, row);
      if (!ok) throw new Error();
      onClose();
    } catch {
      setError("Error al crear el tile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-80 p-6 flex flex-col gap-4"
        style={{
          background: "var(--white-custom)",
          border:
            "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          borderRadius: "2px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 opacity-50 hover:opacity-100"
          onClick={onClose}
        >
          <X size={14} />
        </button>

        <h3
          className="font-black uppercase text-sm tracking-[0.15em]"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--foreground)" }}
        >
          Nuevo Tile
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Columna (col)", col, setCol],
            ["Fila (row)", row, setRow],
          ].map(([lbl, val, setter]: any) => (
            <div key={lbl as string} className="flex flex-col gap-1">
              <label
                className="text-[9px] font-bold uppercase tracking-widest"
                style={{
                  color:
                    "color-mix(in srgb, var(--foreground) 50%, transparent)",
                }}
              >
                {lbl as string}
              </label>
              <input
                className="input-brand text-center font-black text-lg py-2"
                min={0}
                style={{ borderRadius: "1px" }}
                type="number"
                value={val as number}
                onChange={(e) =>
                  setter(Math.max(0, parseInt(e.target.value) || 0))
                }
              />
            </div>
          ))}
        </div>

        {isOccupied && (
          <p className="text-[10px] font-bold text-red-400">
            ⚠ [{col},{row}] ya existe
          </p>
        )}
        {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}

        <button
          className="btn-brand w-full justify-center py-2.5 text-[10px] uppercase disabled:opacity-50"
          disabled={saving || isOccupied}
          onClick={handleCreate}
        >
          {saving ? <Hourglass size={11} /> : <Plus size={11} />}
          Crear
        </button>
      </div>
    </div>
  );
}

// ─── Celda compacta de tile (modo grilla, tamaño real) ────────────────────────
function TileGridCell({
  tile,
  onImageSelect,
  onDelete,
}: {
  tile: ReinoTile;
  onImageSelect: (url: string) => void;
  onDelete: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      {pickerOpen && (
        <ImagePickerModal
          title={`Imagen tile [${tile.col}, ${tile.row}]`}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => {
            onImageSelect(url);
            setPickerOpen(false);
          }}
        />
      )}

      <div
        className="relative w-full h-full group cursor-pointer"
        style={{
          background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
        }}
        onClick={() => setPickerOpen(true)}
      >
        {tile.image_url ? (
          <img
            alt={`Tile ${tile.col},${tile.row}`}
            className="w-full h-full object-cover"
            src={tile.image_url}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <ImagePlus
              size={16}
              style={{
                color: "color-mix(in srgb, var(--accent) 30%, transparent)",
              }}
            />
          </div>
        )}

        {/* Overlay al hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-1"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <span
            className="text-[8px] font-black"
            style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            [{tile.col},{tile.row}]
          </span>
          <button
            className="opacity-60 hover:opacity-100 hover:text-red-400 transition-all"
            title="Eliminar tile"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={10} style={{ color: "white" }} />
          </button>
        </div>

        {/* Ícono de cámara centrado al hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Camera size={16} style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </>
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

  return {
    tiles,
    setTiles,
    loading,
    addTile,
    updateTileImage,
    deleteTile,
    reload: load,
  };
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
  const { tiles, setTiles, loading, addTile, updateTileImage, deleteTile } =
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

  // ── Modo: "ciudades" (canvas + pins) vs "tiles" (grilla admin) ───────────────
  const [mode, setMode] = useState<"ciudades" | "tiles">("ciudades");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showModalNuevoTile, setShowModalNuevoTile] = useState(false);
  const [creatingAt, setCreatingAt] = useState<string | null>(null);

  // Drag & drop (reordenar tiles en la grilla)
  const draggedIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const showToast = useCallback(
    (msg: string, ok: boolean) => setToast({ msg, ok }),
    [],
  );

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

  // ── Estado vacío: canvas full-height con overlay centrado ───────────────────
  const emptyState = !loading && tiles.length === 0;

  // ════════════════════════════════════════════════════════════════════════
  // Lógica del modo "Tiles" (grilla admin — igual que EditorMapa)
  // ════════════════════════════════════════════════════════════════════════

  // ── Desplazar todos los tiles (para añadir fila/col arriba/izquierda) ────
  const shiftTiles = async (dCol: number, dRow: number) => {
    try {
      // 1. Mover a posiciones temporales para evitar conflictos de unique
      await Promise.all(
        tiles.map((t) =>
          supabase
            .from("reino_tiles")
            .update({ col: t.col + dCol + 1000, row: t.row + dRow + 1000 })
            .eq("id", t.id),
        ),
      );
      await Promise.all(
        tiles.map((t) =>
          supabase
            .from("reino_tiles")
            .update({ col: t.col + dCol, row: t.row + dRow })
            .eq("id", t.id),
        ),
      );

      // 2. Calcular qué fila/columna de tiles vacíos hay que insertar
      const shiftedTiles = tiles.map((t) => ({
        ...t,
        col: t.col + dCol,
        row: t.row + dRow,
      }));
      const newTiles: { col: number; row: number }[] = [];

      if (dCol > 0) {
        const rows = [...new Set(tiles.map((t) => t.row + dRow))];
        rows.forEach((r) => newTiles.push({ col: 0, row: r }));
      }
      if (dRow > 0) {
        const cols = [...new Set(tiles.map((t) => t.col + dCol))];
        cols.forEach((c) => newTiles.push({ col: c, row: 0 }));
      }

      // 3. Insertar los tiles vacíos nuevos
      const inserted: ReinoTile[] = [];
      for (const pos of newTiles) {
        const { data, error } = await supabase
          .from("reino_tiles")
          .insert({
            reino_id: reinoId,
            col: pos.col,
            row: pos.row,
            order: 0,
          })
          .select()
          .single();
        if (!error && data) inserted.push(data as ReinoTile);
      }

      // 4. Actualizar estado local de una sola vez
      setTiles([...shiftedTiles, ...inserted]);
      await invalidateReinoTiles(reinoId);
    } catch (e) {
      console.error(e);
      showToast("Error al desplazar tiles", false);
    }
  };

  // ── Crear tile al instante en una celda vacía de la grilla ───────────────
  const handleCreateTileAt = async (col: number, row: number) => {
    const key = `${col}-${row}`;
    if (creatingAt) return;
    setCreatingAt(key);
    try {
      const ok = await addTile(col, row);
      if (!ok) throw new Error();
      showToast("Tile creado", true);
    } catch {
      showToast("Error al crear tile", false);
    } finally {
      setCreatingAt(null);
    }
  };

  // ── Eliminar tile con feedback ────────────────────────────────────────────
  const handleDeleteTile = async (tileId: string) => {
    if (!confirm("¿Eliminar este tile? Se perderá la referencia a la imagen."))
      return;
    await deleteTile(tileId);
    showToast("Tile eliminado", true);
  };

  // ── Cambiar imagen con feedback ───────────────────────────────────────────
  const handleImageSelectGrid = async (tileId: string, url: string) => {
    await updateTileImage(tileId, url);
    showToast("Imagen actualizada", true);
  };

  // ── Drag & drop (reordenar col/row) ───────────────────────────────────────
  const handleDragStartGrid = (idx: number) => {
    draggedIdx.current = idx;
  };
  const handleDragOverGrid = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDropGrid = async (targetIdx: number) => {
    const srcIdx = draggedIdx.current;
    if (srcIdx === null || srcIdx === targetIdx) {
      setDragOverIdx(null);
      draggedIdx.current = null;
      return;
    }
    const newTiles = [...tiles];
    const src = { ...newTiles[srcIdx] };
    const tgt = { ...newTiles[targetIdx] };
    [src.col, src.row, tgt.col, tgt.row] = [tgt.col, tgt.row, src.col, src.row];
    newTiles[srcIdx] = src;
    newTiles[targetIdx] = tgt;
    setTiles(newTiles);
    setDragOverIdx(null);
    draggedIdx.current = null;
    try {
      await Promise.all([
        supabase
          .from("reino_tiles")
          .update({ col: src.col, row: src.row })
          .eq("id", src.id),
        supabase
          .from("reino_tiles")
          .update({ col: tgt.col, row: tgt.row })
          .eq("id", tgt.id),
      ]);
      await invalidateReinoTiles(reinoId);
      showToast("Posiciones actualizadas", true);
    } catch {
      showToast("Error al guardar posiciones", false);
    }
  };

  // ── Organizar en grilla visual ────────────────────────────────────────────
  const maxColGrid =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.col)) : 0;
  const maxRowGrid =
    tiles.length > 0 ? Math.max(...tiles.map((t) => t.row)) : 0;
  const getTileAt = (col: number, row: number) =>
    tiles.find((t) => t.col === col && t.row === row) ?? null;
  const existingPositions = tiles.map((t) => ({ col: t.col, row: t.row }));

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}
      {showModalNuevoTile && (
        <ModalNuevoTile
          existingPositions={existingPositions}
          onClose={() => setShowModalNuevoTile(false)}
          onCreate={async (col, row) => {
            const ok = await addTile(col, row);
            if (ok) showToast("Tile creado", true);
            return ok;
          }}
        />
      )}

      {/* ── Toggle de modo — solo editMode y con tiles existentes ── */}
      {editMode && !emptyState && (
        <div
          className="flex shrink-0 border-b z-30"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
          }}
        >
          {(["ciudades", "tiles"] as const).map((m) => (
            <button
              key={m}
              className="flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
              style={{
                background:
                  mode === m
                    ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                    : "transparent",
                color:
                  mode === m
                    ? "color-mix(in srgb, var(--foreground) 55%, transparent)"
                    : "color-mix(in srgb, var(--foreground) 25%, transparent)",
                borderBottom:
                  mode === m
                    ? "1px solid color-mix(in srgb, var(--primary) 30%, transparent)"
                    : "1px solid transparent",
              }}
              onClick={() => {
                setMode(m);
                setSelectedPinId(null);
              }}
            >
              {m === "ciudades" ? "Ciudades" : `Tiles · ${tiles.length}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Modo "ciudades" — canvas con pins, pan/zoom ── */}
      {mode === "ciudades" && (
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ cursor: selectedPinId ? "crosshair" : "grab" }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 touch-none w-full h-full"
            />
          </div>

          {/* Estado vacío — overlay centrado sobre el canvas */}
          {emptyState && editMode && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
              <div
                className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl pointer-events-auto"
                style={{
                  background:
                    "color-mix(in srgb, var(--bg-main) 90%, transparent)",
                  backdropFilter: "blur(12px)",
                  border:
                    "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                <Map className="text-primary/25" size={24} strokeWidth={1} />
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">
                  Sin tiles de mapa
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      [0, 0],
                      [1, 0],
                      [0, 1],
                    ] as [number, number][]
                  ).map(([c, r]) => (
                    <button
                      key={`${c}-${r}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
                      onClick={() => addTile(c, r)}
                    >
                      <Plus size={9} /> {c},{r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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

          {/* Cancelar selección de pin */}
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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* ── Modo "tiles" — grilla admin completa (igual a EditorMapa) ── */}
      {mode === "tiles" && (
        <div className="flex-1 min-h-0 overflow-auto p-3 flex flex-col items-center">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <span
                style={{
                  color: "color-mix(in srgb, var(--accent) 40%, transparent)",
                }}
              >
                <Hourglass size={14} />
              </span>
            </div>
          ) : tiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <Map
                size={24}
                style={{
                  color: "color-mix(in srgb, var(--accent) 20%, transparent)",
                }}
              />
              <button
                className="btn-brand flex items-center gap-1.5 px-3 py-2 text-[10px] uppercase"
                onClick={() => setShowModalNuevoTile(true)}
              >
                <Plus size={11} /> Primer tile
              </button>
            </div>
          ) : (
            <>
              {/* Botones de expandir + nuevo tile */}
              <div className="flex items-center gap-1 mb-3">
                {[
                  { title: "← col", dCol: 1, dRow: 0 },
                  { title: "↑ fila", dCol: 0, dRow: 1 },
                  {
                    title: "↓ fila",
                    dCol: 0,
                    dRow: 0,
                    newRow: maxRowGrid + 1,
                  },
                  {
                    title: "→ col",
                    dCol: 0,
                    dRow: 0,
                    newCol: maxColGrid + 1,
                  },
                ].map(({ title, dCol, dRow, newCol, newRow }) => (
                  <button
                    key={title}
                    className="px-2 py-1 text-[9px] font-black uppercase border transition-opacity hover:opacity-70"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color:
                        "color-mix(in srgb, var(--foreground) 40%, transparent)",
                      borderRadius: "2px",
                    }}
                    title={title}
                    onClick={async () => {
                      if (dCol > 0 || dRow > 0) {
                        await shiftTiles(dCol, dRow);
                      } else {
                        const ok = await addTile(newCol ?? 0, newRow ?? 0);
                        if (!ok) showToast("Error al crear tile", false);
                      }
                    }}
                  >
                    {title}
                  </button>
                ))}
                <button
                  className="w-7 h-7 flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{
                    borderRadius: "2px",
                    flexShrink: 0,
                    background:
                      "color-mix(in srgb, var(--accent) 18%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                    color: "color-mix(in srgb, var(--accent) 80%, transparent)",
                  }}
                  title="Nuevo tile en posición personalizada"
                  onClick={() => setShowModalNuevoTile(true)}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Grilla */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${maxColGrid + 1}, 160px)`,
                  gap: 0,
                  width: "fit-content",
                }}
              >
                {Array.from({ length: maxRowGrid + 1 }, (_, row) =>
                  Array.from({ length: maxColGrid + 1 }, (_, col) => {
                    const tile = getTileAt(col, row);
                    const idx = tile
                      ? tiles.findIndex((t) => t.id === tile.id)
                      : -1;
                    return (
                      <div
                        key={`${col}-${row}`}
                        draggable={!!tile}
                        style={{
                          width: 160,
                          height: 160,
                          position: "relative",
                          outline:
                            dragOverIdx === idx
                              ? `2px solid var(--accent)`
                              : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          outlineOffset: "-1px",
                          opacity: draggedIdx.current === idx ? 0.4 : 1,
                          transition: "outline 0.1s, opacity 0.1s",
                        }}
                        onDragEnd={() => {
                          draggedIdx.current = null;
                          setDragOverIdx(null);
                        }}
                        onDragOver={(e) => tile && handleDragOverGrid(e, idx)}
                        onDragStart={() => tile && handleDragStartGrid(idx)}
                        onDrop={() => tile && handleDropGrid(idx)}
                      >
                        {tile ? (
                          <TileGridCell
                            tile={tile}
                            onDelete={() => handleDeleteTile(tile.id)}
                            onImageSelect={(url) =>
                              handleImageSelectGrid(tile.id, url)
                            }
                          />
                        ) : (
                          <button
                            className="w-full h-full flex items-center justify-center transition-all hover:opacity-60 disabled:opacity-40"
                            disabled={creatingAt === `${col}-${row}`}
                            style={{
                              background:
                                "color-mix(in srgb, var(--primary) 3%, transparent)",
                            }}
                            title="Crear tile aquí"
                            onClick={() => handleCreateTileAt(col, row)}
                          >
                            {creatingAt === `${col}-${row}` ? (
                              <Hourglass size={11} />
                            ) : (
                              <Plus
                                size={11}
                                style={{
                                  color:
                                    "color-mix(in srgb, var(--accent) 25%, transparent)",
                                }}
                              />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
