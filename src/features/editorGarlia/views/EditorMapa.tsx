"use client";

/**
 * EditorMapa
 * ──────────
 * Panel admin para gestionar los tiles del mapa global.
 * Se importa en EditorMundo como una sección más.
 *
 * Funcionalidades:
 *   - Ver todos los tiles en grilla (posición col/row real)
 *   - Subir / cambiar imagen de cada tile
 *   - Añadir nuevos tiles (expandir el mapa)
 *   - Eliminar tiles
 *   - Reordenar via drag & drop (actualiza col/row)
 *   - Editar label de cada tile
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Camera,
  GripVertical,
  ImagePlus,
  Map,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import SimpleImagePicker from "@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker";
import { supabase } from "@/lib/api/client/supabase";
import {
  invalidateMapTiles,
  loadMapTiles,
  loadReinos,
} from "@/lib/api/client/syncEngine";
import { TileCanvas } from "./TileCanvas";
import type { MapTile } from "./TileCanvas";

type ReinoConTile = {
  id: string;
  nombre: string;
  coord_x?: number | null;
  coord_y?: number | null;
  tile_col?: number | null;
  tile_row?: number | null;
  [key: string]: any;
};

// ─── Toast local ──────────────────────────────────────────────────────────────
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
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-300 flex items-center gap-3 px-5 py-3 shadow-lg text-[10px] font-bold uppercase tracking-widest"
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

// ─── Hourglass ────────────────────────────────────────────────────────────────
function Hourglass({ size = 14 }: { size?: number }) {
  return (
    <svg
      fill="none"
      height={size * 1.45}
      style={{
        animation: "hg-flip 2.4s ease-in-out infinite",
        transformOrigin: "center",
        flexShrink: 0,
      }}
      viewBox="0 0 22 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`@keyframes hg-flip{0%,40%{transform:rotate(0deg)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(180deg)}}`}</style>
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

// ─── Modal para añadir tile ───────────────────────────────────────────────────
function ModalNuevoTile({
  existingPositions,
  onClose,
  onCreated,
}: {
  existingPositions: { col: number; row: number }[];
  onClose: () => void;
  onCreated: (tile: MapTile) => void;
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
      const maxOrder = existingPositions.length;
      const { data, error: err } = await supabase
        .from("map_tiles")
        .insert({ world_id: "garlia", col, row, order: maxOrder })
        .select()
        .single();
      if (err) throw err;
      onCreated(data as MapTile);
    } catch (e: any) {
      setError(e.message || "Error al crear el tile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center"
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

// ─── Tarjeta de tile ──────────────────────────────────────────────────────────
function TileCard({
  tile,
  onImageSelect,
  onDelete,
  dragHandleProps,
}: {
  tile: MapTile & { label?: string | null };
  onImageSelect: (url: string) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      {/* Modal picker de imagen */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
                <Camera size={11} /> Imagen del tile [{tile.col}, {tile.row}]
              </h3>
              <button
                className="text-primary/30 hover:text-primary transition-colors"
                onClick={() => setPickerOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <SimpleImagePicker
              onClose={() => setPickerOpen(false)}
              onSelect={(url) => {
                onImageSelect(url);
                setPickerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <div
        className="relative flex flex-col gap-0 border overflow-hidden"
        style={{
          background: "color-mix(in srgb, var(--primary) 8%, transparent)",
          borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
          borderRadius: "2px",
          minHeight: 180,
        }}
      >
        {/* Header con drag handle y posición */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
          }}
        >
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing opacity-40 hover:opacity-80 transition-opacity"
          >
            <GripVertical size={12} />
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-widest flex-1"
            style={{ color: "var(--accent)", fontFamily: "'Cinzel', serif" }}
          >
            [{tile.col}, {tile.row}]
          </span>
          <button
            className="opacity-30 hover:opacity-80 hover:text-red-400 transition-all"
            title="Eliminar tile"
            onClick={onDelete}
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Imagen completa sin recorte — click abre el picker */}
        <div
          className="relative flex-1 flex items-center justify-center cursor-pointer group"
          style={{
            minHeight: 140,
            background: "color-mix(in srgb, var(--bg-main) 60%, transparent)",
          }}
          onClick={() => setPickerOpen(true)}
        >
          {tile.image_url ? (
            <>
              <img
                alt={`Tile ${tile.col},${tile.row}`}
                className="w-full h-full object-contain"
                src={tile.image_url}
                style={{ maxHeight: 240 }}
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.45)" }}
              >
                <Camera size={18} style={{ color: "var(--accent)" }} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4">
              <ImagePlus
                size={20}
                style={{
                  color: "color-mix(in srgb, var(--accent) 40%, transparent)",
                }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-widest text-center"
                style={{
                  color: "color-mix(in srgb, var(--accent) 40%, transparent)",
                }}
              >
                Elegir imagen
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Editor principal ─────────────────────────────────────────────────────────
export function EditorMapa({
  onSelectReino,
}: {
  /** Se llama con el id del reino al hacer click en su punto en el mapa (modo "Reinos") */
  onSelectReino?: (reinoId: string) => void;
} = {}) {
  const [tiles, setTiles] = useState<(MapTile & { label?: string | null })[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reinos, setReinos] = useState<ReinoConTile[]>([]);
  const [selectedReinoId, setSelectedReinoId] = useState<string | null>(null);
  const [mode, setMode] = useState<"mover" | "tiles">("mover");
  const [savingReino, setSavingReino] = useState(false);
  const [pendingReinos, setPendingReinos] = useState<
    Record<string, ReinoConTile>
  >({});
  const [creatingAt, setCreatingAt] = useState<string | null>(null);

  // Drag state
  const draggedIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const showToast = useCallback(
    (msg: string, ok: boolean) => setToast({ msg, ok }),
    [],
  );

  // ── Cargar tiles — Dexie-first via syncEngine ────────────────────────────
  const loadTiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadMapTiles("garlia", (fresh) => {
        // callback: llega cuando Supabase refresca en background
        setTiles(fresh as (MapTile & { label?: string | null })[]);
      });
      setTiles(data as (MapTile & { label?: string | null })[]);
    } catch {
      showToast("Error al cargar los tiles", false);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTiles();
  }, [loadTiles]);

  // ── Cargar reinos ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadReinos((fresh) => setReinos(fresh as ReinoConTile[])).then((data) =>
      setReinos(data as ReinoConTile[]),
    );
  }, []);

  // ── Desplazar todos los tiles (para añadir fila/col arriba/izquierda) ────
  const shiftTiles = async (dCol: number, dRow: number) => {
    try {
      // 1. Desplazar todos los tiles existentes en Supabase (uno a uno para evitar conflictos de unique)
      //    Primero mover a valores temporales negativos para liberar posiciones
      await Promise.all(
        tiles.map((t) =>
          supabase
            .from("map_tiles")
            .update({ col: t.col + dCol + 1000, row: t.row + dRow + 1000 })
            .eq("id", t.id),
        ),
      );
      await Promise.all(
        tiles.map((t) =>
          supabase
            .from("map_tiles")
            .update({ col: t.col + dCol, row: t.row + dRow })
            .eq("id", t.id),
        ),
      );

      // 2. Calcular qué fila/columna de tiles vacíos hay que insertar
      //    ← col: insertar col=0 para cada fila existente
      //    ↑ fila: insertar row=0 para cada col existente
      const shiftedTiles = tiles.map((t) => ({
        ...t,
        col: t.col + dCol,
        row: t.row + dRow,
      }));
      const newTiles: { col: number; row: number }[] = [];

      if (dCol > 0) {
        // Nueva columna a la izquierda (col=0) para cada row único
        const rows = [...new Set(tiles.map((t) => t.row + dRow))];
        rows.forEach((r) => newTiles.push({ col: 0, row: r }));
      }
      if (dRow > 0) {
        // Nueva fila arriba (row=0) para cada col único
        const cols = [...new Set(tiles.map((t) => t.col + dCol))];
        cols.forEach((c) => newTiles.push({ col: c, row: 0 }));
      }

      // 3. Insertar los tiles vacíos nuevos
      const inserted: any[] = [];
      for (const pos of newTiles) {
        const { data, error } = await supabase
          .from("map_tiles")
          .insert({ world_id: "garlia", col: pos.col, row: pos.row, order: 0 })
          .select()
          .single();
        if (!error && data) inserted.push(data);
      }

      // 4. Actualizar estado local de una sola vez
      setTiles([...shiftedTiles, ...inserted] as any[]);
      await invalidateMapTiles("garlia");
    } catch (e) {
      console.error(e);
      showToast("Error al desplazar tiles", false);
      // Recargar para consistencia
      loadTiles();
    }
  };

  // ── Mover reino en el canvas ──────────────────────────────────────────────
  const handleMapClick = (
    x: number,
    y: number,
    tile_col?: number,
    tile_row?: number,
  ) => {
    if (!selectedReinoId) return;
    const updated = {
      tile_col: tile_col ?? null,
      tile_row: tile_row ?? null,
      coord_x: x,
      coord_y: y,
    };
    setReinos((prev) =>
      prev.map((r) => (r.id === selectedReinoId ? { ...r, ...updated } : r)),
    );
    setPendingReinos((prev) => {
      const existing = prev[selectedReinoId] ??
        reinos.find((r) => r.id === selectedReinoId) ?? { id: selectedReinoId };
      return { ...prev, [selectedReinoId]: { ...existing, ...updated } };
    });
    setSelectedReinoId(null);
  };

  // ── Guardar posiciones de reinos ──────────────────────────────────────────
  const handleSaveReinos = async () => {
    if (Object.keys(pendingReinos).length === 0) return;
    setSavingReino(true);
    try {
      await Promise.all(
        Object.values(pendingReinos).map((r) =>
          supabase
            .from("reinos")
            .update({
              coord_x: r.coord_x,
              coord_y: r.coord_y,
              tile_col: r.tile_col ?? null,
              tile_row: r.tile_row ?? null,
            })
            .eq("id", r.id),
        ),
      );
      setPendingReinos({});
      showToast("Posiciones guardadas", true);
    } catch {
      showToast("Error al guardar posiciones", false);
    } finally {
      setSavingReino(false);
    }
  };

  // ── Seleccionar imagen del picker ────────────────────────────────────────
  const handleImageSelect = async (tileId: string, image_url: string) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, image_url } : t)),
    );
    try {
      const { error } = await supabase
        .from("map_tiles")
        .update({ image_url })
        .eq("id", tileId);
      if (error) throw error;
      await invalidateMapTiles("garlia");
      showToast("Imagen actualizada", true);
    } catch {
      showToast("Error al guardar la imagen", false);
    }
  };

  // ── Editar label ──────────────────────────────────────────────────────────
  const handleLabelChange = async (tileId: string, label: string) => {
    setTiles((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, label } : t)),
    );
    try {
      await supabase
        .from("map_tiles")
        .update({ label: label || null })
        .eq("id", tileId);
    } catch {
      showToast("Error al guardar la etiqueta", false);
    }
  };

  // ── Eliminar tile ─────────────────────────────────────────────────────────
  const handleDelete = async (tileId: string) => {
    if (!confirm("¿Eliminar este tile? Se perderá la referencia a la imagen."))
      return;
    try {
      await supabase.from("map_tiles").delete().eq("id", tileId);
      setTiles((prev) => prev.filter((t) => t.id !== tileId));
      await invalidateMapTiles("garlia");
      showToast("Tile eliminado", true);
    } catch {
      showToast("Error al eliminar", false);
    }
  };

  // ── Crear tile al instante al hacer click en una celda vacía de la grilla ──
  const handleCreateTileAt = async (col: number, row: number) => {
    const key = `${col}-${row}`;
    if (creatingAt) return; // evita doble-click mientras se está creando
    setCreatingAt(key);
    try {
      const { data, error } = await supabase
        .from("map_tiles")
        .insert({ world_id: "garlia", col, row, order: tiles.length })
        .select()
        .single();
      if (error) throw error;
      setTiles((prev) => [...prev, data as any]);
      await invalidateMapTiles("garlia");
      showToast("Tile creado", true);
    } catch {
      showToast("Error al crear tile", false);
    } finally {
      setCreatingAt(null);
    }
  };

  // ── Drag & drop (reordenar col/row) ───────────────────────────────────────
  const handleDragStart = (idx: number) => {
    draggedIdx.current = idx;
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = async (targetIdx: number) => {
    const srcIdx = draggedIdx.current;
    if (srcIdx === null || srcIdx === targetIdx) {
      setDragOverIdx(null);
      draggedIdx.current = null;
      return;
    }
    // Intercambiar col/row entre los dos tiles
    const newTiles = [...tiles];
    const src = { ...newTiles[srcIdx] };
    const tgt = { ...newTiles[targetIdx] };
    // Swap positions
    [src.col, src.row, tgt.col, tgt.row] = [tgt.col, tgt.row, src.col, src.row];
    newTiles[srcIdx] = src;
    newTiles[targetIdx] = tgt;
    setTiles(newTiles);
    setDragOverIdx(null);
    draggedIdx.current = null;
    // Persistir en Supabase
    try {
      await Promise.all([
        supabase
          .from("map_tiles")
          .update({ col: src.col, row: src.row })
          .eq("id", src.id),
        supabase
          .from("map_tiles")
          .update({ col: tgt.col, row: tgt.row })
          .eq("id", tgt.id),
      ]);
      showToast("Posiciones actualizadas", true);
    } catch {
      showToast("Error al guardar posiciones", false);
      loadTiles(); // recargar para consistencia
    }
  };

  // ── Organizar en grilla visual ────────────────────────────────────────────
  const maxCol = tiles.length > 0 ? Math.max(...tiles.map((t) => t.col)) : 0;
  const maxRow = tiles.length > 0 ? Math.max(...tiles.map((t) => t.row)) : 0;

  const getTileAt = (col: number, row: number) =>
    tiles.find((t) => t.col === col && t.row === row) ?? null;

  const existingPositions = tiles.map((t) => ({ col: t.col, row: t.row }));

  return (
    <div className="flex flex-col min-h-0 h-full">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');`}</style>

      {toast && (
        <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />
      )}
      {showModal && (
        <ModalNuevoTile
          existingPositions={existingPositions}
          onClose={() => setShowModal(false)}
          onCreated={(tile) => {
            setTiles((prev) => [...prev, tile as any]);
            setShowModal(false);
            showToast("Tile creado", true);
          }}
        />
      )}

      {/* Contenido unificado */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
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
              onClick={() => setShowModal(true)}
            >
              <Plus size={11} /> Primer tile
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* ── Toggle de modo + estado contextual ── */}
            <div
              className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
              style={{
                borderColor:
                  "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            >
              {/* Toggle */}
              <div
                className="flex rounded overflow-hidden border shrink-0"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--primary) 15%, transparent)",
                }}
              >
                {(["mover", "tiles"] as const).map((m) => (
                  <button
                    key={m}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
                    style={{
                      background: mode === m ? "var(--primary)" : "transparent",
                      color:
                        mode === m
                          ? "var(--btn-text, #fff)"
                          : "color-mix(in srgb, var(--foreground) 40%, transparent)",
                    }}
                    onClick={() => {
                      setMode(m);
                      setSelectedReinoId(null);
                    }}
                  >
                    {m === "mover" ? "Reinos" : "Tiles"}
                  </button>
                ))}
              </div>

              {/* Estado contextual */}
              <span
                className="text-[9px] uppercase tracking-widest flex-1 truncate"
                style={{
                  color:
                    "color-mix(in srgb, var(--foreground) 30%, transparent)",
                }}
              >
                {mode === "mover"
                  ? selectedReinoId
                    ? `→ "${reinos.find((r) => r.id === selectedReinoId)?.nombre}" seleccionado · click vacío para reubicarlo`
                    : ""
                  : "click imagen para cambiarla · click vacío crea tile · arrastra para reordenar"}
              </span>

              {/* Acciones contextuales */}
              {mode === "mover" && selectedReinoId && (
                <button
                  className="w-5 h-5 flex items-center justify-center opacity-40 hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedReinoId(null)}
                >
                  <X size={10} />
                </button>
              )}
              {mode === "mover" && Object.keys(pendingReinos).length > 0 && (
                <button
                  className="btn-brand flex items-center gap-1 px-2 py-1 text-[9px] uppercase disabled:opacity-50 shrink-0"
                  disabled={savingReino}
                  onClick={handleSaveReinos}
                >
                  {savingReino ? <Hourglass size={9} /> : null}
                  Guardar {Object.keys(pendingReinos).length}
                </button>
              )}
            </div>

            {/* ── Canvas — solo en modo mover (más grande que antes) ── */}
            {mode === "mover" && (
              <div style={{ height: 640, position: "relative", flexShrink: 0 }}>
                <TileCanvas
                  editMode={true}
                  eyedropperActive={false}
                  fondoColor={null}
                  hiddenMarkers={[]}
                  isFirstOpen={false}
                  markers={reinos.filter(
                    (r) => r.coord_x != null && r.tile_col != null,
                  )}
                  selectedMarkerId={mode === "mover" ? selectedReinoId : null}
                  tiles={tiles}
                  onEyedropperPick={() => {}}
                  onMapClick={mode === "mover" ? handleMapClick : () => {}}
                  onMarkerClick={
                    mode === "mover"
                      ? (m) => {
                          setSelectedReinoId((prev) =>
                            prev === m.id ? null : m.id,
                          );
                          onSelectReino?.(m.id);
                        }
                      : () => {}
                  }
                />
              </div>
            )}

            {/* ── Grilla de tiles (solo en modo tiles) ── */}
            {mode === "tiles" && (
              <div className="flex-1 overflow-y-auto p-3">
                {/* Botones de expandir + nuevo tile */}
                {tiles.length > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {[
                      { title: "← col", dCol: 1, dRow: 0 },
                      { title: "↑ fila", dCol: 0, dRow: 1 },
                      { title: "↓ fila", dCol: 0, dRow: 0, newRow: maxRow + 1 },
                      { title: "→ col", dCol: 0, dRow: 0, newCol: maxCol + 1 },
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
                            try {
                              const { data, error } = await supabase
                                .from("map_tiles")
                                .insert({
                                  world_id: "garlia",
                                  col: newCol ?? 0,
                                  row: newRow ?? 0,
                                  order: tiles.length,
                                })
                                .select()
                                .single();
                              if (error) throw error;
                              setTiles((prev) => [...prev, data as any]);
                            } catch {
                              showToast("Error al crear tile", false);
                            }
                          }
                        }}
                      >
                        {title}
                      </button>
                    ))}
                    <button
                      className="w-7 h-7 flex items-center justify-center btn-brand"
                      style={{ borderRadius: "2px", flexShrink: 0 }}
                      title="Nuevo tile en posición personalizada"
                      onClick={() => setShowModal(true)}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${maxCol + 1}, minmax(110px, 1fr))`,
                  }}
                >
                  {Array.from({ length: maxRow + 1 }, (_, row) =>
                    Array.from({ length: maxCol + 1 }, (_, col) => {
                      const tile = getTileAt(col, row);
                      const idx = tile
                        ? tiles.findIndex((t) => t.id === tile.id)
                        : -1;
                      return (
                        <div
                          key={`${col}-${row}`}
                          draggable={!!tile}
                          style={{
                            outline:
                              dragOverIdx === idx
                                ? `2px solid var(--accent)`
                                : undefined,
                            opacity: draggedIdx.current === idx ? 0.4 : 1,
                            transition: "outline 0.1s, opacity 0.1s",
                          }}
                          onDragOver={(e) => tile && handleDragOver(e, idx)}
                          onDragStart={() => tile && handleDragStart(idx)}
                          onDrop={() => tile && handleDrop(idx)}
                          onDragEnd={() => {
                            draggedIdx.current = null;
                            setDragOverIdx(null);
                          }}
                        >
                          {tile ? (
                            <TileCard
                              tile={tile}
                              dragHandleProps={{ draggable: false }}
                              onDelete={() => handleDelete(tile.id)}
                              onImageSelect={(url) =>
                                handleImageSelect(tile.id, url)
                              }
                            />
                          ) : (
                            <button
                              className="w-full border border-dashed flex items-center justify-center transition-all hover:opacity-60 disabled:opacity-40"
                              disabled={creatingAt === `${col}-${row}`}
                              style={{
                                minHeight: 80,
                                borderColor:
                                  "color-mix(in srgb, var(--primary) 12%, transparent)",
                                background:
                                  "color-mix(in srgb, var(--primary) 3%, transparent)",
                                borderRadius: "2px",
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
