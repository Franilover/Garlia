"use client";
import Image from "next/image";

import {
  Map,
  MapPin,
  Check,
  X,
  Trash2,
  Save,
  Loader2,
  Image as ImageIcon,
  SlidersHorizontal,
  Mountain,
  Plus,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";

import { WikiEntity } from "@/components/forms/Markdown/MarkdownEditor";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { usePersonajesDelReino } from "@/features/editorGarlia/components/hooks";
import {
  type Reino,
  type SaveStatus,
} from "@/features/editorGarlia/components/types";
import { SaveIndicator } from "@/features/editorGarlia/components/UIComponents";
import { type Ciudad } from "@/features/editorGarlia/views/EditorCiudad";
import { ReinoTileCanvas } from "@/features/editorGarlia/views/ReinoTileCanvas";
import { db } from "@/lib/api/client/db";
import { supabase } from "@/lib/api/client/supabase";

import { useWikilink } from "../components/WikilinkContext";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.put(row);
  } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try {
    if (db) await (db as any)[tabla]?.delete(id);
  } catch {}
}

// ─── Hook: ciudades del reino ─────────────────────────────────────────────────
function useCiudadesDelReino(reinoId: string) {
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (db) {
          const local: any[] = (await (db as any).ciudades?.toArray()) ?? [];
          const filtrados = local.filter(
            (l: any) => l.reino_id === reinoId && !l.deleted,
          );
          if (filtrados.length && !cancelled) setCiudades(filtrados);
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase
        .from("ciudades")
        .select(
          "id, nombre, descripcion, coord_x, coord_y, imagen_url, tipo, historia, secretos, reino_id",
        )
        .eq("reino_id", reinoId)
        .order("nombre");
      if (!cancelled && data) {
        setCiudades(data as Ciudad[]);
        if (db) (db as any).ciudades?.bulkPut(data).catch(() => {});
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [reinoId]);

  return { ciudades, setCiudades };
}

// ─── Mini modal de imagen ─────────────────────────────────────────────────────
function ImagePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [SimpleImagePicker, setComponent] =
    useState<React.ComponentType<any> | null>(null);
  useEffect(() => {
    import("@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker").then(
      (m) => setComponent(() => m.default),
    );
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white-custom rounded-t-2xl sm:rounded-2xl shadow-2xl border border-primary/15 w-full sm:max-w-lg p-5 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
            <ImageIcon size={11} /> Imagen del mapa
          </h3>
          <button
            className="text-primary/30 hover:text-primary transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        {SimpleImagePicker ? (
          <SimpleImagePicker onClose={onClose} onSelect={onSelect} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary/20" size={16} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel flotante de ciudad seleccionada ────────────────────────────────────
function CiudadPanel({
  ciudad,
  onClose,
  onOpenEditor,
  onSaved,
  onDeleted,
}: {
  ciudad: Ciudad;
  onClose: () => void;
  onOpenEditor?: (id: string) => void;
  onSaved: (d: Ciudad) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState(ciudad);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    setForm(ciudad);
  }, [ciudad.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("ciudades")
        .update({ nombre: form.nombre, descripcion: form.descripcion })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("ciudades", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      message: `¿Eliminar "${form.nombre}"?`,
      danger: true,
    });
    if (!ok) return;
    await supabase.from("ciudades").delete().eq("id", form.id);
    void dexieDel("ciudades", form.id);
    onDeleted(form.id);
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 flex flex-col"
      style={{
        background: "color-mix(in srgb, var(--bg-main) 92%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom:
          "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      <ConfirmModal />
      <div className="flex items-center gap-2 px-3 py-2">
        <MapPin size={10} style={{ color: "var(--accent)", flexShrink: 0 }} />

        {/* Nombre inline */}
        <input
          className="flex-1 min-w-0 bg-transparent text-[11px] font-black uppercase tracking-widest text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre de la ciudad"
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />

        <SaveIndicator status={status} />

        {onOpenEditor && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{
              color: "color-mix(in srgb, var(--accent) 70%, transparent)",
            }}
            title="Abrir ficha completa"
            onClick={() => onOpenEditor(form.id)}
          >
            Ver <ChevronRight size={9} />
          </button>
        )}
        <button
          className="text-red-400/30 hover:text-red-400 transition-colors"
          title="Eliminar"
          onClick={handleDelete}
        >
          <Trash2 size={10} />
        </button>
        <button
          className="text-primary/25 hover:text-primary/60 transition-colors ml-1"
          onClick={onClose}
        >
          <X size={12} />
        </button>
      </div>

      {/* Descripción */}
      <div
        className="px-3 pb-2 border-t"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)",
        }}
      >
        <textarea
          className="mt-1.5 w-full bg-transparent text-[10px] text-primary/70 placeholder:text-primary/25 outline-none resize-none leading-relaxed"
          placeholder="Descripción breve de la ciudad…"
          rows={2}
          value={form.descripcion ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, descripcion: e.target.value }))
          }
          onBlur={save}
        />
      </div>
    </div>
  );
}

// ─── Drawer de geografía ──────────────────────────────────────────────────────
function GeografiaDrawer({
  value,
  onClose,
  onChange,
  onSave,
  status,
}: {
  value: string;
  onClose: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  status: SaveStatus;
}) {
  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-30 flex flex-col w-72 shadow-2xl"
      style={{
        background: "color-mix(in srgb, var(--bg-main) 95%, transparent)",
        backdropFilter: "blur(16px)",
        borderLeft:
          "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
        }}
      >
        <Mountain size={10} style={{ color: "var(--accent)" }} />
        <span
          className="flex-1 text-[9px] font-black uppercase tracking-[0.2em]"
          style={{
            color: "color-mix(in srgb, var(--foreground) 40%, transparent)",
          }}
        >
          Geografía
        </span>
        <SaveIndicator status={status} />
        <button
          className="text-primary/25 hover:text-primary/60 transition-colors"
          onClick={onClose}
        >
          <X size={12} />
        </button>
      </div>

      {/* Textarea */}
      <textarea
        className="flex-1 p-3 bg-transparent text-[11px] text-primary/80 placeholder:text-primary/25 outline-none resize-none leading-relaxed"
        placeholder="Describe la geografía del reino: montañas, ríos, clima, regiones…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
      />
    </div>
  );
}

// ─── EditorReino ──────────────────────────────────────────────────────────────
export function EditorReino({
  item,
  onSaved,
  onDeleted,
  entities = [],
  onSelectPersonaje,
  onSelectCiudad,
  onSelectCriatura,
  onSelectItem,
}: {
  item: Reino;
  onSaved: (r: Reino) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectPersonaje?: (personaje: any) => void;
  onSelectCiudad?: (id: string) => void;
  onSelectCriatura?: (id: string) => void;
  onSelectItem?: (id: string) => void;
}) {
  const [form, setForm] = useState<Reino>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [geoStatus, setGeoStatus] = useState<SaveStatus>("idle");
  const [selectedCiudad, setSelectedCiudad] = useState<Ciudad | null>(null);
  const [geoOpen, setGeoOpen] = useState(false);
  const [addingCity, setAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const { ciudades: detalles, setCiudades: setDetalles } = useCiudadesDelReino(
    item.id,
  );
  const { confirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    setForm(item);
    setStatus("idle");
    setSelectedCiudad(null);
    setGeoOpen(false);
  }, [item.id]);

  // Sync ciudad seleccionada con cambios de coordenadas
  useEffect(() => {
    if (!selectedCiudad) return;
    const updated = detalles.find((d) => d.id === selectedCiudad.id);
    if (updated) setSelectedCiudad(updated);
  }, [detalles]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from("reinos")
        .update({
          nombre: form.nombre,
          historia: form.historia,
          politica: form.politica,
          economia: form.economia,
          geografia: form.geografia,
          cultura: form.cultura,
          mapa_url: form.mapa_url,
          coord_x: form.coord_x,
          coord_y: form.coord_y,
        })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("reinos", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const saveGeo = async () => {
    setGeoStatus("saving");
    try {
      const { error } = await supabase
        .from("reinos")
        .update({ geografia: form.geografia })
        .eq("id", form.id);
      if (error) throw error;
      setGeoStatus("saved");
      onSaved(form);
      void dexiePut("reinos", form);
      setTimeout(() => setGeoStatus("idle"), 2000);
    } catch {
      setGeoStatus("error");
    }
  };

  const del = async () => {
    const ok = await confirm({
      message: `¿Eliminar el reino "${form.nombre}"?`,
      danger: true,
    });
    if (!ok) return;
    await supabase.from("reinos").delete().eq("id", form.id);
    void dexieDel("reinos", form.id);
    onDeleted(form.id);
  };

  const handleAddCity = async () => {
    if (!newCityName.trim()) return;
    const { data, error } = await supabase
      .from("ciudades")
      .insert([
        {
          reino_id: form.id,
          nombre: newCityName.trim(),
          coord_x: 50,
          coord_y: 50,
        },
      ])
      .select()
      .single();
    if (!error && data) {
      setDetalles((prev) => [...prev, data as Ciudad]);
      void dexiePut("ciudades", data);
      setAddingCity(false);
      setNewCityName("");
    }
  };

  const handleDetallesChange = async (updated: Ciudad[]) => {
    setDetalles(updated);
    await Promise.all(
      updated.map((d) =>
        supabase
          .from("ciudades")
          .update({ coord_x: d.coord_x, coord_y: d.coord_y })
          .eq("id", d.id),
      ),
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      <ConfirmModal />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b flex items-center gap-2.5 px-3 py-2"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        {/* Thumbnail */}
        <div
          className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border flex items-center justify-center"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
          }}
        >
          {form.mapa_url ? (
            <Image
              alt={form.nombre}
              className="w-full h-full object-cover"
              src={form.mapa_url}
            />
          ) : (
            <Map className="text-primary/25" size={12} />
          )}
        </div>

        {/* Nombre */}
        <input
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          placeholder="Nombre del reino"
          value={form.nombre ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
        />

        <SaveIndicator status={status} />

        <button
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-black uppercase border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition-all"
          style={{ borderRadius: "3px" }}
          onClick={del}
        >
          <Trash2 size={9} />
        </button>

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          style={{ borderRadius: "3px" }}
          disabled={status === "saving"}
          onClick={save}
        >
          <Save size={10} />
          <span className="hidden sm:inline">Guardar</span>
        </button>
      </div>

      {/* ── Cuerpo: canvas + overlays ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {/* Panel ciudad seleccionada (top overlay) */}
        {selectedCiudad && (
          <CiudadPanel
            ciudad={selectedCiudad}
            onClose={() => setSelectedCiudad(null)}
            onDeleted={(id) => {
              setDetalles((prev) => prev.filter((x) => x.id !== id));
              setSelectedCiudad(null);
            }}
            onOpenEditor={onSelectCiudad}
            onSaved={(d) =>
              setDetalles((prev) => prev.map((x) => (x.id === d.id ? d : x)))
            }
          />
        )}

        {/* Canvas del mapa — full height */}
        <ReinoTileCanvas
          detalles={detalles}
          editMode={true}
          reinoId={form.id}
          onDetallesChange={handleDetallesChange}
          onPinClick={(ciudad) => setSelectedCiudad(ciudad)}
        />

        {/* Botones flotantes — bottom left */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5">
          {/* Añadir ciudad */}
          {addingCity ? (
            <div
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-main) 90%, transparent)",
                backdropFilter: "blur(10px)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              <MapPin
                size={9}
                style={{ color: "var(--accent)", flexShrink: 0 }}
              />
              <input
                autoFocus
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-primary outline-none placeholder:text-primary/30 w-28"
                placeholder="Nombre…"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCity();
                  if (e.key === "Escape") {
                    setAddingCity(false);
                    setNewCityName("");
                  }
                }}
              />
              <button
                className="text-primary/30 hover:text-primary/60 transition-colors"
                onClick={() => {
                  setAddingCity(false);
                  setNewCityName("");
                }}
              >
                <X size={9} />
              </button>
              <button
                className="text-primary/50 hover:text-primary transition-colors"
                onClick={handleAddCity}
              >
                <Check size={9} />
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{
                background:
                  "color-mix(in srgb, var(--bg-main) 85%, transparent)",
                backdropFilter: "blur(10px)",
                border:
                  "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                borderRadius: "6px",
                color: "color-mix(in srgb, var(--foreground) 45%, transparent)",
              }}
              onClick={() => setAddingCity(true)}
            >
              <Plus size={9} /> Ciudad
            </button>
          )}
        </div>

        {/* Botón geografía — bottom right */}
        <button
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{
            background: geoOpen
              ? "color-mix(in srgb, var(--accent) 18%, transparent)"
              : "color-mix(in srgb, var(--bg-main) 85%, transparent)",
            backdropFilter: "blur(10px)",
            border: geoOpen
              ? "1px solid color-mix(in srgb, var(--accent) 28%, transparent)"
              : "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
            borderRadius: "6px",
            color: geoOpen
              ? "color-mix(in srgb, var(--accent) 80%, transparent)"
              : "color-mix(in srgb, var(--foreground) 45%, transparent)",
          }}
          onClick={() => setGeoOpen((v) => !v)}
        >
          <Mountain size={9} /> Geografía
        </button>

        {/* Drawer de geografía */}
        {geoOpen && (
          <GeografiaDrawer
            status={geoStatus}
            value={form.geografia ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, geografia: v }))}
            onClose={() => setGeoOpen(false)}
            onSave={saveGeo}
          />
        )}
      </div>
    </div>
  );
}
