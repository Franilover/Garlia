"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, Save, Trash2, Bug, Loader2, Leaf, Wrench, X, MapPin, Globe, Camera } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Item, type SaveStatus } from "./components/types";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import SimpleImagePicker from "@/components/paginas/myself/garlia/editorCapitulos/snippets//forms/SimpleImagePicker";


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


// ─── Hook: qué criaturas crean este ítem (item_crafteres) ─────────────────────

type CrafterSource = {
  crafterId: string;
  criaturaId: string;
  criaturaName: string;
  criaturaImg?: string | null;
};

function useCrafterSources(itemId: string) {
  const [crafters, setCrafters] = useState<CrafterSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_crafteres")
      .select(`id, criatura_id, criaturas!criatura_id(nombre, imagen_url)`)
      .eq("item_id", itemId);

    setCrafters(
      (data ?? []).map((r: any) => ({
        crafterId:    r.id,
        criaturaId:   r.criatura_id,
        criaturaName: (Array.isArray(r.criaturas) ? r.criaturas[0]?.nombre : r.criaturas?.nombre) ?? "—",
        criaturaImg:  (Array.isArray(r.criaturas) ? r.criaturas[0]?.imagen_url : r.criaturas?.imagen_url) ?? null,
      }))
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const add = async (criatura: { id: string; nombre: string; imagen_url?: string | null }) => {
    if (crafters.some(c => c.criaturaId === criatura.id)) return;
    const { data, error } = await supabase
      .from("item_crafteres")
      .insert([{ item_id: itemId, criatura_id: criatura.id }])
      .select().single();
    if (!error && data) {
      setCrafters(prev => [...prev, {
        crafterId: data.id, criaturaId: criatura.id,
        criaturaName: criatura.nombre, criaturaImg: criatura.imagen_url ?? null,
      }]);
      // Marcar el ítem como Artificial automáticamente
      await supabase.from("items").update({ origen: "Artificial", sub_origen: null }).eq("id", itemId);
    }
  };

  const remove = async (crafterId: string) => {
    await supabase.from("item_crafteres").delete().eq("id", crafterId);
    setCrafters(prev => prev.filter(c => c.crafterId !== crafterId));
  };

  return { crafters, loading, add, remove };
}

// ─── Panel selector de criaturas creadoras (usa SeccionEntidad) ──────────────

function PanelCrafterSources({ itemId, onSelectCriatura }: { itemId: string; onSelectCriatura?: (criaturaId: string) => void }) {
  const { crafters, loading, add, remove } = useCrafterSources(itemId);
  const [allCriaturas, setAllCriaturas] = useState<{ id: string; nombre: string; imagen_url?: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre")
      .then(({ data }) => setAllCriaturas(data ?? []));
  }, []);

  const handleToggle = async (id: string, addIt: boolean) => {
    setSaving(true);
    if (addIt) {
      const criatura = allCriaturas.find(c => c.id === id);
      if (criatura) await add(criatura);
    } else {
      const crafter = crafters.find(c => c.criaturaId === id);
      if (crafter) await remove(crafter.crafterId);
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      label="Criaturas"
      icon={<Bug size={9} />}
      fallbackIcon={<Bug size={9} />}
      emptyLabel="Ninguna criatura asignada"
      allEntities={allCriaturas.map(c => ({ id: c.id, nombre: c.nombre, imagen_url: c.imagen_url }))}
      selectedIds={crafters.map(c => c.criaturaId)}
      loading={loading}
      saving={saving}
      onToggle={handleToggle}
      onEntityClick={onSelectCriatura}
    />
  );
}

// ─── Hook: qué plantas producen este ítem (item_plantas) ──────────────────────

type PlantaSource = {
  rowId:      string;
  plantaId:   string;
  plantaName: string;
  plantaImg?: string | null;
};

function usePlantaSources(itemId: string) {
  const [plantas, setPlantas] = useState<PlantaSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_plantas")
      .select(`id, planta_id, plantas!planta_id(nombre, imagen_url)`)
      .eq("item_id", itemId);

    setPlantas(
      (data ?? []).map((r: any) => ({
        rowId:      r.id,
        plantaId:   r.planta_id,
        plantaName: (Array.isArray(r.plantas) ? r.plantas[0]?.nombre     : r.plantas?.nombre)     ?? "—",
        plantaImg:  (Array.isArray(r.plantas) ? r.plantas[0]?.imagen_url : r.plantas?.imagen_url) ?? null,
      }))
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const add = async (planta: { id: string; nombre: string; imagen_url?: string | null }) => {
    if (plantas.some(p => p.plantaId === planta.id)) return;
    const { data, error } = await supabase
      .from("item_plantas")
      .insert([{ item_id: itemId, planta_id: planta.id }])
      .select().single();
    if (!error && data) {
      setPlantas(prev => [...prev, {
        rowId: data.id, plantaId: planta.id,
        plantaName: planta.nombre, plantaImg: planta.imagen_url ?? null,
      }]);
      // Marcar el ítem como Natural/Planta automáticamente
      await supabase.from("items").update({ origen: "Natural", sub_origen: "Planta" }).eq("id", itemId);
      new BroadcastChannel("item_origen_sync").postMessage({ itemId, origen: "Natural", sub_origen: "Planta" });
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("item_plantas").delete().eq("id", rowId);
    setPlantas(prev => prev.filter(p => p.rowId !== rowId));
  };

  return { plantas, loading, add, remove };
}

// ─── Panel selector de plantas fuente (usa SeccionEntidad) ───────────────────

function PanelPlantaSources({ itemId, onSelectPlanta }: { itemId: string; onSelectPlanta?: (plantaId: string) => void }) {
  const { plantas, loading, add, remove } = usePlantaSources(itemId);
  const [allPlantas, setAllPlantas] = useState<{ id: string; nombre: string; imagen_url?: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("plantas").select("id, nombre, imagen_url").order("nombre")
      .then(({ data }) => setAllPlantas(data ?? []));
  }, []);

  const handleToggle = async (id: string, addIt: boolean) => {
    setSaving(true);
    if (addIt) {
      const planta = allPlantas.find(p => p.id === id);
      if (planta) await add(planta);
    } else {
      const row = plantas.find(p => p.plantaId === id);
      if (row) await remove(row.rowId);
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      label="Plantas"
      icon={<Leaf size={9} />}
      fallbackIcon={<Leaf size={9} />}
      emptyLabel="Ninguna planta asignada"
      allEntities={allPlantas.map(p => ({ id: p.id, nombre: p.nombre, imagen_url: p.imagen_url }))}
      selectedIds={plantas.map(p => p.plantaId)}
      loading={loading}
      saving={saving}
      onToggle={handleToggle}
      onEntityClick={onSelectPlanta}
    />
  );
}

// ─── Panel selector de reinos (usa SeccionEntidad + reino_ids en form) ──────
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
      label="Reinos donde encontrarlo"
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

// ─── Hook: ciudades donde se encuentra el ítem (item_ciudades) ─────────────────

type CiudadMin = { id: string; nombre: string };
type ItemCiudadRow = { rowId: string; ciudadId: string; ciudadNombre: string };

function useCiudadesItem(itemId: string) {
  const [rows, setRows] = useState<ItemCiudadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_ciudades")
      .select("id, ciudad_id, ciudades!ciudad_id(nombre)")
      .eq("item_id", itemId);

    setRows(
      (data ?? []).map((r: any) => ({
        rowId:      r.id,
        ciudadId:    r.ciudad_id,
        ciudadNombre: (Array.isArray(r.ciudades) ? r.ciudades[0]?.nombre : r.ciudades?.nombre) ?? "—",
      }))
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const add = async (l: CiudadMin) => {
    if (rows.some(r => r.ciudadId === l.id)) return;
    const { data, error } = await supabase
      .from("item_ciudades")
      .insert([{ item_id: itemId, ciudad_id: l.id }])
      .select().single();
    if (!error && data) {
      setRows(prev => [...prev, { rowId: data.id, ciudadId: l.id, ciudadNombre: l.nombre }]);
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("item_ciudades").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Panel selector de ciudades (usa SeccionEntidad) ──────────────────────────

function PanelCiudades({ itemId, onNavigateCiudad }: { itemId: string; onNavigateCiudad?: (id: string) => void }) {
  const { rows, loading, add, remove } = useCiudadesItem(itemId);
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
      label="Ciudad donde encontrarlo"
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

// ─── Botón mobile para cambiar imagen del ítem ────────────────────────────────
function PickerImagenItemBtn({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-white-custom rounded-2xl shadow-2xl border border-primary/15 w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 flex items-center gap-2"><Camera size={11} /> Imagen del objeto</h3>
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

// ─── EditorItem ───────────────────────────────────────────────────────────────

export function EditorItem({
  item, onSaved, onDeleted, entities = [], onSelectCriatura, onSelectPlanta, onNavigateCiudad, onNavigateReino,
}: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onSelectCriatura?: (criaturaId: string) => void;
  onSelectPlanta?: (plantaId: string) => void;
  onNavigateCiudad?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [form,     setForm]     = useState<Item>(item);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const { onSnippetAction } = useWikilink();
  const [categoriasRaw, setCategoriasRaw] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("items").select("categoria").then(({ data }) => {
      const unique = [...new Set((data ?? []).map((r: any) => r.categoria).filter(Boolean))] as string[];
      setCategoriasRaw(unique);
    });
  }, []);
  const categoriaItems = categoriasRaw.map(c => ({ id: c, label: c }));

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("items").update({
        nombre: form.nombre, imagen_url: form.imagen_url || null,
        descripcion: form.descripcion, categoria: form.categoria,
        origen: form.origen,
        sub_origen: form.origen === "Natural" ? (form.sub_origen ?? null) : null,
        reino_ids: form.reino_ids ?? [],
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("items", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("items").delete().eq("id", form.id);
    void dexieDel("items", form.id);
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
          background: "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.imagen_url
            ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <Package size={16} className="text-primary/25" />}
        </div>

        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del objeto"
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
                {/* Mobile: imagen con botón flotante (igual que personaje) */}
                <div className="sm:hidden relative w-full rounded-xl overflow-hidden border border-primary/10 bg-primary/3" style={{ aspectRatio: "1 / 1" }}>
                  {form.imagen_url
                    ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package size={48} className="text-primary/15" /></div>
                  }
                  <div className="absolute top-2 right-2 z-10">
                    <PickerImagenItemBtn
                      value={form.imagen_url ?? ""}
                      onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                    />
                  </div>
                </div>
                {/* Desktop: selector normal */}
                <div className="hidden sm:block w-full">
                  <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                    placeholder={<Package size={20} className="opacity-20" />} />
                </div>
              </div>

              {/* Columna derecha: categoría + origen + descripción */}
              <div className="flex-1 min-w-0 space-y-4">
                <ComboSelector
                  mode="single"
                  label="Categoría"
                  icon={<Package size={9} />}
                  items={categoriaItems}
                  value={form.categoria ?? null}
                  onChange={v => setForm(f => ({ ...f, categoria: v ?? "" }))}
                  placeholder="Arma, reliquia, objeto…"
                  noneLabel="Sin categoría"
                />

                {/* Origen + Ciudades en dos columnas */}
                <div className="flex flex-col sm:flex-row gap-4">

                  {/* Columna Origen */}
                  <div className="flex-1 min-w-0 rounded-xl overflow-hidden"
                    style={{ border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>

                    {/* Cabecera */}
                    <div className="flex items-center gap-1.5 px-3 py-2"
                      style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 6%, transparent)", background: "color-mix(in srgb, var(--primary) 2%, transparent)" }}>
                      <Package size={9} style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }} />
                      <span className="text-[8px] font-black uppercase tracking-widest"
                        style={{ color: "color-mix(in srgb, var(--primary) 38%, transparent)" }}>Origen</span>
                    </div>

                    {/* Nivel 1: Natural / Artificial */}
                    <div className="flex"
                      style={{ borderBottom: form.origen ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" : undefined }}>
                      {(["Natural", "Artificial"] as const).map((op, i) => {
                        const isSelected = form.origen === op;
                        const Icon = op === "Natural" ? Leaf : Wrench;
                        return (
                          <button key={op} type="button"
                            onClick={() => setForm(f => ({ ...f, origen: isSelected ? null : op, sub_origen: null }))}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all"
                            style={{
                              borderRight: i === 0 ? "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" : undefined,
                              background: isSelected ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                              color: isSelected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 30%, transparent)",
                            }}
                          >
                            <Icon size={10} /> {op}
                          </button>
                        );
                      })}
                    </div>

                    {/* Nivel 2: sub-origen de Natural */}
                    {form.origen === "Natural" && (
                      <div>
                        <div className="flex"
                          style={{ borderBottom: (form.sub_origen === "Criatura" || form.sub_origen === "Planta") ? "1px solid color-mix(in srgb, var(--primary) 6%, transparent)" : undefined }}>
                          {(["Planta", "Criatura"] as const).map((sub, i) => {
                            const isSelected = form.sub_origen === sub;
                            const Icon = sub === "Planta" ? Leaf : Bug;
                            return (
                              <button key={sub} type="button"
                                onClick={() => setForm(f => ({ ...f, sub_origen: isSelected ? null : sub }))}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                                style={{
                                  borderRight: i === 0 ? "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" : undefined,
                                  background: isSelected ? "color-mix(in srgb, var(--primary) 7%, transparent)" : "color-mix(in srgb, var(--primary) 2%, transparent)",
                                  color: isSelected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 25%, transparent)",
                                }}
                              >
                                <Icon size={9} /> {sub}
                              </button>
                            );
                          })}
                        </div>
                        {form.sub_origen === "Planta" && (
                          <div className="p-2">
                            <PanelPlantaSources itemId={form.id} onSelectPlanta={onSelectPlanta} />
                          </div>
                        )}
                        {form.sub_origen === "Criatura" && (
                          <div className="p-2">
                            <PanelCrafterSources itemId={form.id} onSelectCriatura={onSelectCriatura} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nivel 2: Artificial → selector de criaturas */}
                    {form.origen === "Artificial" && (
                      <div className="p-2">
                        <PanelCrafterSources itemId={form.id} onSelectCriatura={onSelectCriatura} />
                      </div>
                    )}
                  </div>

                  {/* Columna Reinos */}
                  <div className="flex-1 min-w-0">
                    <PanelReinos
                      value={form.reino_ids ?? []}
                      onChange={ids => setForm(f => ({ ...f, reino_ids: ids }))}
                      onNavigateReino={onNavigateReino}
                    />
                  </div>

                  {/* Columna Ciudades */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                      <MapPin size={9} /> Ciudad donde encontrarlo
                    </label>
                    <PanelCiudades itemId={form.id} onNavigateCiudad={onNavigateCiudad} />
                  </div>

                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                  <MarkdownEditor
                    value={form.descripcion ?? ""}
                    onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                    rows={10}
                    placeholder="Qué es, qué hace, su historia…"
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