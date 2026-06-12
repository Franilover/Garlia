"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Map, MapPin, Plus, Check, X, Trash2, Save,
  Loader2, Image as ImageIcon, SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Reino, type SaveStatus, INPUT_CLS } from "@/features/editorGarlia/components/types";
import { usePersonajesDelReino } from "@/features/editorGarlia/components/hooks";
import { type Ciudad } from "@/features/editorGarlia/views/EditorCiudad";
import { SaveIndicator } from "@/features/editorGarlia/components/UIComponents";
import { MarkdownEditor, WikiEntity } from "@/components/forms/Markdown/MarkdownEditor";
import { useWikilink } from "../components/WikilinkContext";
import { LoreTab } from "@/features/editorGarlia/components/LoreTab";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}
async function dexieReadAll<T>(tabla: string): Promise<T[]> {
  try {
    if (!db) return [];
    const t = (db as any)[tabla];
    if (!t) return [];
    return ((await t.toArray()) as any[]).filter((r: any) => !r.deleted) as T[];
  } catch { return []; }
}
async function dexieWriteAll(tabla: string, rows: any[]): Promise<void> {
  try {
    if (!db) return;
    const t = (db as any)[tabla];
    if (!t) return;
    if (rows.length > 0) await t.bulkPut(rows);
    const remoteIds = new Set(rows.map((r: any) => r.id));
    const local: any[] = await t.toArray();
    const toDelete = local.map((r: any) => r.id).filter((id: string) => !remoteIds.has(id));
    if (toDelete.length > 0) await t.bulkDelete(toDelete);
  } catch {}
}

// ─── Hook: ciudades del reino ──────────────────────────────────────────────────
function useCiudadesDelReino(reinoId: string) {
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Dexie primero
      try {
        if (db) {
          const local: any[] = await (db as any).ciudades?.toArray() ?? [];
          const filtrados = local.filter((l: any) => l.reino_id === reinoId && !l.deleted);
          if (filtrados.length && !cancelled) setCiudades(filtrados);
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase
        .from("ciudades")
        .select("id, nombre, descripcion, coord_x, coord_y, imagen_url, tipo, historia, secretos, reino_id")
        .eq("reino_id", reinoId)
        .order("nombre");
      if (!cancelled && data) {
        setCiudades(data as Ciudad[]);
        if (db) (db as any).ciudades?.bulkPut(data).catch(() => {});
      }
    };
    run();
    return () => { cancelled = true; };
  }, [reinoId]);

  return { ciudades, setCiudades };
}


function MapaConPuntos({ mapaUrl, onMapaChange, detalles, onDetallesChange }: {
  mapaUrl: string;
  onMapaChange: (url: string) => void;
  detalles: Ciudad[];
  onDetallesChange: (d: Ciudad[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));
    onDetallesChange(detalles.map(d => d.id === selectedId ? { ...d, coord_x: x, coord_y: y } : d));
    setSelectedId(null);
  };

  return (
    <>
      <div
        className={`relative w-full overflow-hidden rounded-xl border select-none group ${
          selectedId
            ? "cursor-crosshair border-primary/40"
            : "cursor-default border-primary/10"
        }`}
        style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}
        onClick={handleMapClick}
      >
        {mapaUrl ? (
          <img
            src={mapaUrl}
            alt="Mapa"
            className="w-full h-auto object-contain pointer-events-none block"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-primary/20">
            <Map size={24} strokeWidth={1} />
            <span className="text-[9px] font-black uppercase tracking-widest">Sin imagen de mapa</span>
            <button
              onClick={e => { e.stopPropagation(); setPickerOpen(true); }}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/20 text-primary/40 hover:text-primary hover:border-primary/40 transition-all"
            >
              <ImageIcon size={10} /> Elegir imagen
            </button>
          </div>
        )}

        {/* Puntos sobre el mapa */}
        {mapaUrl && detalles.map(d => {
          const isSelected = selectedId === d.id;
          return (
            <div
              key={d.id}
              className="absolute z-10 flex flex-col items-center pointer-events-none"
              style={{ top: `${d.coord_y ?? 50}%`, left: `${d.coord_x ?? 50}%`, transform: "translate(-50%, -100%)" }}
            >
              <div className={`mb-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-md transition-all ${
                isSelected ? "bg-primary text-btn-text scale-110" : "bg-black/60 text-white/90 backdrop-blur-sm"
              }`}>{d.nombre}</div>
              <button
                onClick={e => { e.stopPropagation(); setSelectedId(prev => prev === d.id ? null : d.id); }}
                className={`pointer-events-auto w-3 h-3 rounded-full border-2 border-white shadow-md transition-all ${
                  isSelected ? "bg-yellow-400 scale-125 ring-2 ring-yellow-400/50" : "bg-primary hover:scale-110"
                }`}
              />
              <div className={`w-px h-2 ${isSelected ? "bg-yellow-400" : "bg-white/60"}`} />
            </div>
          );
        })}

        {/* Hint overlay */}
        {selectedId && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-end justify-center pb-3 px-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white pointer-events-auto max-w-full"
              style={{ background: "color-mix(in srgb, var(--foreground) 70%, transparent)", backdropFilter: "blur(8px)" }}
            >
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">Tocá para mover el punto</span>
              <button onClick={e => { e.stopPropagation(); setSelectedId(null); }} className="shrink-0 ml-1 opacity-60 hover:opacity-100 transition-opacity">
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Botón cambiar imagen — siempre visible en mobile, hover en desktop */}
        {mapaUrl && (
          <button
            onClick={e => { e.stopPropagation(); setPickerOpen(true); }}
            className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all sm:opacity-0 sm:group-hover:opacity-100"
            style={{
              background: "color-mix(in srgb, var(--foreground) 65%, transparent)",
              color: "white",
              backdropFilter: "blur(8px)",
            }}
          >
            <ImageIcon size={10} /> Cambiar
          </button>
        )}
      </div>

      {pickerOpen && <ImagePickerModal onSelect={url => { onMapaChange(url); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
    </>
  );
}

// ─── Mini modal de imagen ─────────────────────────────────────────────────────
function ImagePickerModal({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [SimpleImagePicker, setComponent] = useState<React.ComponentType<any> | null>(null);
  useEffect(() => {
    import("@/features/editorGarlia/components/editorCapitulos/snippets/forms/SimpleImagePicker").then(m => setComponent(() => m.default));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white-custom rounded-t-2xl sm:rounded-2xl shadow-2xl border border-primary/15 w-full sm:max-w-lg p-5 max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2">
            <ImageIcon size={11} /> Imagen del mapa
          </h3>
          <button onClick={onClose} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
        </div>
        {SimpleImagePicker
          ? <SimpleImagePicker onSelect={onSelect} onClose={onClose} />
          : <div className="flex items-center justify-center py-12"><Loader2 size={16} className="animate-spin text-primary/20" /></div>
        }
      </div>
    </div>
  );
}

// ─── DetalleEditor ─────────────────────────────────────────────────────────────
function DetalleEditor({ detalle, onSaved, onDeleted, onOpenEditor, entities = [] }: {
  detalle: Ciudad; onSaved: (d: Ciudad) => void; onDeleted: (id: string) => void;
  onOpenEditor?: (id: string) => void;
  entities?: WikiEntity[];
}) {
  const [form, setForm] = useState(detalle);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const nameRef = useRef<HTMLInputElement>(null);

  const prevCoords = useRef({ x: detalle.coord_x, y: detalle.coord_y });
  useEffect(() => {
    if (detalle.coord_x !== prevCoords.current.x || detalle.coord_y !== prevCoords.current.y) {
      prevCoords.current = { x: detalle.coord_x, y: detalle.coord_y };
      setForm(f => ({ ...f, coord_x: detalle.coord_x, coord_y: detalle.coord_y }));
    }
  }, [detalle.coord_x, detalle.coord_y]);

  const saveDetalle = async (data: Ciudad) => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("ciudades").update({
        nombre: data.nombre, descripcion: data.descripcion,
        coord_x: data.coord_x, coord_y: data.coord_y,
      }).eq("id", data.id);
      if (error) throw error;
      setStatus("saved"); onSaved(data);
      void dexiePut("ciudades", data);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const handleSave = () => {
    saveDetalle(form);
    setEditing(false);
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("ciudades").delete().eq("id", form.id);
    void dexieDel("ciudades", form.id);
    onDeleted(form.id);
  };

  return (
    <div
      className="rounded-lg overflow-hidden transition-all group/ciudad"
      style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}
    >
      <ConfirmModal />

      {/* Fila compacta siempre visible */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 min-h-[36px]">
        <MapPin size={10} className="shrink-0 text-primary/30" />

        {/* Nombre inline-editable */}
        <input
          ref={nameRef}
          value={form.nombre}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          onFocus={() => setEditing(true)}
          onBlur={() => { if (!form.descripcion?.trim()) handleSave(); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSave(); nameRef.current?.blur(); } }}
          className="flex-1 min-w-0 bg-transparent text-[11px] font-black uppercase tracking-widest text-primary outline-none placeholder:text-primary/25 truncate"
          placeholder="Nombre de la ciudad"
        />

        {/* Acciones — visibles al hacer hover o al editar */}
        <div className={`flex items-center gap-1 transition-opacity ${editing ? "opacity-100" : "opacity-0 group-hover/ciudad:opacity-100"}`}>
          <SaveIndicator status={status} />
          {editing && (
            <button
              onClick={handleSave}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-btn-text hover:bg-primary/90 transition-all"
              title="Guardar"
            >
              <Check size={10} />
            </button>
          )}
          {onOpenEditor && (
            <button
              onClick={() => onOpenEditor(form.id)}
              className="flex items-center justify-center w-6 h-6 rounded-md text-primary/30 hover:text-primary hover:bg-primary/8 transition-all"
              title="Ver ficha completa"
            >
              <MapPin size={10} />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center justify-center w-6 h-6 rounded-md text-red-400/40 hover:text-red-400 hover:bg-red-500/8 transition-all"
            title="Eliminar"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Descripción — solo visible al editar */}
      {editing && (
        <div
          className="px-2.5 pb-2.5 border-t"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          <textarea
            value={form.descripcion ?? ""}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            rows={3}
            placeholder="Descripción breve…"
            className="mt-2 w-full bg-transparent text-[11px] text-primary/80 placeholder:text-primary/25 outline-none resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}

// ─── EditorReino ───────────────────────────────────────────────────────────────
export function EditorReino({ item, onSaved, onDeleted, entities = [], onSelectPersonaje, onSelectCiudad, onSelectCriatura, onSelectItem }: {
  item: Reino; onSaved: (r: Reino) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onSelectPersonaje?: (personaje: any) => void;
  onSelectCiudad?: (id: string) => void;
  onSelectCriatura?: (id: string) => void;
  onSelectItem?: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Reino>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [addingPoint, setAddingPoint] = useState(false);
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);
  const [newPointName, setNewPointName] = useState("");
  const { ciudades: detalles, setCiudades: setDetalles } = useCiudadesDelReino(item.id);
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();
  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesDelReino(form.nombre);

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("reinos").update({
        nombre: form.nombre, historia: form.historia, politica: form.politica,
        economia: form.economia, geografia: form.geografia, cultura: form.cultura,
        mapa_url: form.mapa_url, coord_x: form.coord_x, coord_y: form.coord_y,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved"); onSaved(form);
      void dexiePut("reinos", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar el reino "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("reinos").delete().eq("id", form.id);
    void dexieDel("reinos", form.id);
    onDeleted(form.id);
  };

  const handleAddPoint = async () => {
    if (!newPointName.trim()) return;
    const { data, error } = await supabase.from("ciudades")
      .insert([{ reino_id: form.id, nombre: newPointName.trim(), coord_x: 50, coord_y: 50 }]).select().single();
    if (!error && data) { setDetalles(prev => [...prev, data as Ciudad]); void dexiePut("ciudades", data); setAddingPoint(false); setNewPointName(""); }
  };

  const handleDetallesMapChange = async (updated: Ciudad[]) => {
    setDetalles(updated);
    await Promise.all(updated.map(d =>
      supabase.from("ciudades").update({ coord_x: d.coord_x, coord_y: d.coord_y }).eq("id", d.id)
    ));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      <ConfirmModal />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Header — dos filas en mobile, una fila en desktop */}
        <div
          className="shrink-0 border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
            background:  "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          {/* Fila 1: thumbnail + nombre + guardar (siempre visible) */}
          <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5 sm:px-4 sm:py-2.5">
            {/* Thumbnail del mapa */}
            <div
              className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border flex items-center justify-center"
              style={{
                borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                background:  "color-mix(in srgb, var(--primary) 6%, transparent)",
              }}
            >
              {form.mapa_url
                ? <img src={form.mapa_url} alt={form.nombre} className="w-full h-full object-cover" />
                : <Map size={14} className="text-primary/25" />}
            </div>

            {/* Nombre editable */}
            <input
              value={form.nombre ?? ""}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del reino"
              className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
            />

            <SaveIndicator status={status} />

            {/* Eliminar — solo ícono en mobile, con texto en desktop */}
            <button
              onClick={del}
              className="flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
            >
              <Trash2 size={10} />
              <span className="hidden sm:inline">Eliminar</span>
            </button>

            {/* Guardar — siempre visible */}
            <button
              onClick={save}
              disabled={status === "saving"}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <Save size={11} />
              <span className="hidden sm:inline">Guardar</span>
            </button>

            {/* Barra lateral — solo mobile */}
            <button
              onClick={() => setMobileAsideOpen(true)}
              className="sm:hidden flex items-center justify-center p-2 rounded-xl text-primary/30 hover:text-primary hover:bg-primary/8 transition-all border border-primary/10"
              title="Entidades"
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>
        </div>

        {/* Lore — ocupa todo el espacio restante */}
        <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: "0" }}>
          <LoreTab
            form={form}
            setForm={setForm}
            entities={entities}
            personajes={personajes}
            loadingPersonajes={loadingPersonajes}
            onSelectPersonaje={onSelectPersonaje}
            onSelectCriatura={onSelectCriatura}
            onSelectItem={onSelectItem}
            detalles={detalles}
            onAddPoint={handleAddPoint}
            addingPoint={addingPoint}
            setAddingPoint={setAddingPoint}
            newPointName={newPointName}
            setNewPointName={setNewPointName}
            onDetalleUpdate={d => setDetalles(prev => prev.map(x => x.id === d.id ? d : x))}
            onDetalleDelete={id => setDetalles(prev => prev.filter(x => x.id !== id))}
            onOpenDetalleEditor={onSelectCiudad}
            mapaUrl={form.mapa_url ?? ""}
            onMapaChange={url => setForm(f => ({ ...f, mapa_url: url }))}
            onDetallesArrayChange={handleDetallesMapChange}
            MapaConPuntosComponent={MapaConPuntos}
            mobileAsideOpen={mobileAsideOpen}
            setMobileAsideOpen={setMobileAsideOpen}
          />
        </div>
      </div>
    </div>
  );
}