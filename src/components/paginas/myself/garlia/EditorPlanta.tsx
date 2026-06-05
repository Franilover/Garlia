"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Leaf, Save, Trash2, Loader2, MapPin, Globe, Camera, X } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./components/types";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import SimpleImagePicker from "@/components/paginas/myself/garlia/editorCapitulos/snippets//forms/SimpleImagePicker";


// ─── Tipo local ───────────────────────────────────────────────────────────────
export type Planta = {
  id:          string;
  nombre:      string;
  imagen_url?: string | null;
  categoria?:  string | null;
  descripcion?: string | null;
  reino_ids?:  string[];
};


// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}


// ─── Hook: ciudades donde se encuentra la planta (planta_ciudades) ──────────────
type CiudadMin = { id: string; nombre: string };
type PlantaCiudadRow = { rowId: string; ciudadId: string; ciudadNombre: string };

function useCiudadesPlanta(plantaId: string) {
  const [rows, setRows] = useState<PlantaCiudadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("planta_ciudades")
      .select("id, ciudad_id, ciudades!ciudad_id(nombre)")
      .eq("planta_id", plantaId);

    setRows(
      (data ?? []).map((r: any) => ({
        rowId:       r.id,
        ciudadId:     r.ciudad_id,
        ciudadNombre: (Array.isArray(r.ciudades) ? r.ciudades[0]?.nombre : r.ciudades?.nombre) ?? "—",
      }))
    );
    setLoading(false);
  }, [plantaId]);

  useEffect(() => { load(); }, [load]);

  const add = async (l: CiudadMin) => {
    if (rows.some(r => r.ciudadId === l.id)) return;
    const { data, error } = await supabase
      .from("planta_ciudades")
      .insert([{ planta_id: plantaId, ciudad_id: l.id }])
      .select().single();
    if (!error && data) {
      setRows(prev => [...prev, { rowId: data.id, ciudadId: l.id, ciudadNombre: l.nombre }]);
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("planta_ciudades").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Panel selector de ciudades ────────────────────────────────────────────────
function PanelCiudades({ plantaId, onNavigateCiudad }: { plantaId: string; onNavigateCiudad?: (id: string) => void }) {
  const { rows, loading, add, remove } = useCiudadesPlanta(plantaId);
  const [allCiudades, setAllCiudades] = useState<CiudadMin[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("ciudades").select("id, nombre").order("nombre")
      .then(({ data }) => setAllCiudades(data ?? []));
  }, []);

  const handleToggle = async (id: string, addIt: boolean) => {
    setSaving(true);
    if (addIt) {
      const ciudad = allCiudades.find(l => l.id === id);
      if (ciudad) await add(ciudad);
    } else {
      const row = rows.find(r => r.ciudadId === id);
      if (row) await remove(row.rowId);
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      label="Ciudad donde encontrarla"
      icon={<MapPin size={9} />}
      fallbackIcon={<MapPin size={9} />}
      emptyLabel="Ninguna ciudad asignada"
      allEntities={allCiudades}
      selectedIds={rows.map(r => r.ciudadId)}
      loading={loading}
      saving={saving}
      onToggle={handleToggle}
      onEntityClick={onNavigateCiudad}
    />
  );
}

// ─── Panel selector de reinos ─────────────────────────────────────────────────
type ReinoMin = { id: string; nombre: string };

function PanelReinos({
  value, onChange, onNavigateReino,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [allReinos, setAllReinos] = useState<ReinoMin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("reinos").select("id, nombre").order("nombre")
      .then(({ data }) => { setAllReinos(data ?? []); setLoading(false); });
  }, []);

  return (
    <SeccionEntidad
      label="Reinos donde encontrarla"
      icon={<Globe size={9} />}
      fallbackIcon={<Globe size={9} />}
      emptyLabel="Ningún reino asignado"
      allEntities={allReinos}
      selectedIds={value}
      loading={loading}
      saving={false}
      onToggle={(id, add) =>
        onChange(add ? [...value, id] : value.filter(x => x !== id))
      }
      onEntityClick={onNavigateReino}
    />
  );
}


// ─── Botón mobile para cambiar imagen de la planta ───────────────────────────
function PickerImagenPlantaBtn({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Camera size={11} /> Imagen de la planta</h3>
              <button onClick={() => setOpen(false)} className="text-primary/30 hover:text-primary transition-colors"><X size={16} /></button>
            </div>
            <SimpleImagePicker onSelect={url => { onChange(url); setOpen(false); }} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-main/80 backdrop-blur-sm border border-primary/20 text-primary/50 hover:text-primary hover:bg-bg-main transition-all shadow-md"
        title="Cambiar imagen"
      >
        <Camera size={13} />
      </button>
    </>
  );
}

// ─── EditorPlanta ─────────────────────────────────────────────────────────────

export function EditorPlanta({
  planta, onSaved, onDeleted, entities = [], onNavigateCiudad, onNavigateReino,
}: {
  planta: Planta;
  onSaved: (p: Planta) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Planta>(planta);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  // Categorías dinámicas desde la tabla plantas
  const [categoriasRaw, setCategoriasRaw] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("plantas").select("categoria").then(({ data }) => {
      const unique = [...new Set((data ?? []).map((r: any) => r.categoria).filter(Boolean))] as string[];
      setCategoriasRaw(unique);
    });
  }, []);
  const categoriaItems = categoriasRaw.map(c => ({ id: c, label: c }));

  useEffect(() => { setForm(planta); setStatus("idle"); }, [planta.id]);

  const field = (k: keyof Planta) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("plantas").update({
        nombre:      form.nombre,
        imagen_url:  form.imagen_url || null,
        descripcion: form.descripcion,
        categoria:   form.categoria,
        reino_ids:   form.reino_ids ?? [],
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("plantas", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("plantas").delete().eq("id", form.id);
    void dexieDel("plantas", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* ── Fixed header ────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.imagen_url
            ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <Leaf size={16} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre de la planta"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        />

        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          <button onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
            <Trash2 size={10} />
          </button>
          <button onClick={save} disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-5">

            {/* Columna izquierda: imagen */}
            <div className="w-full sm:w-96 sm:shrink-0">
              {/* Mobile: imagen con botón flotante */}
              <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                {form.imagen_url
                  ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Leaf size={48} className="text-primary/15" /></div>
                }
                <div className="absolute top-2 right-2 z-10">
                  <PickerImagenPlantaBtn
                    value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                  />
                </div>
              </div>
              {/* Desktop: selector normal */}
              <div className="hidden sm:block w-full">
                <SelectorImagen
                  label="Imagen"
                  value={form.imagen_url ?? ""}
                  onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                  aspect="square"
                  placeholder={<Leaf size={20} className="opacity-20" />}
                />
              </div>
            </div>

            {/* Columna derecha: categoría + reinos + ciudades + descripción */}
            <div className="flex-1 min-w-0 space-y-4">

              <ComboSelector
                mode="single"
                label="Categoría"
                icon={<Leaf size={9} />}
                items={categoriaItems}
                value={form.categoria ?? null}
                onChange={v => setForm(f => ({ ...f, categoria: v ?? "" }))}
                placeholder="Árbol, arbusto, flor, hierba…"
                noneLabel="Sin categoría"
              />

              {/* Reinos + Ciudades en dos columnas */}
              <div className="flex flex-col sm:flex-row gap-4">

                {/* Reinos */}
                <div className="flex-1 min-w-0">
                  <PanelReinos
                    value={form.reino_ids ?? []}
                    onChange={ids => setForm(f => ({ ...f, reino_ids: ids }))}
                    onNavigateReino={onNavigateReino}
                  />
                </div>

                {/* Ciudades */}
                <div className="flex-1 min-w-0">
                  <PanelCiudades plantaId={form.id} onNavigateCiudad={onNavigateCiudad} />
                </div>

              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                <MarkdownEditor
                  value={form.descripcion ?? ""}
                  onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                  rows={10}
                  placeholder="Qué es, propiedades, usos, su historia…"
                  toolbar
                  defaultMode="edit"
                  onSnippetAction={onSnippetAction}
                  entities={entities}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}