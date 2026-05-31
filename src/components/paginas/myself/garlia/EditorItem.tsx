"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, Save, Trash2, Bug, Loader2, Leaf, Wrench, X, MapPin, Globe } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Item, type SaveStatus } from "./components/types";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";


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

// ─── Hook: lugares donde se encuentra el ítem (item_lugares) ─────────────────

type LugarMin = { id: string; nombre: string };
type ItemLugarRow = { rowId: string; lugarId: string; lugarNombre: string };

function useLugaresItem(itemId: string) {
  const [rows, setRows] = useState<ItemLugarRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_lugares")
      .select("id, lugar_id, lugares!lugar_id(nombre)")
      .eq("item_id", itemId);

    setRows(
      (data ?? []).map((r: any) => ({
        rowId:      r.id,
        lugarId:    r.lugar_id,
        lugarNombre: (Array.isArray(r.lugares) ? r.lugares[0]?.nombre : r.lugares?.nombre) ?? "—",
      }))
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const add = async (l: LugarMin) => {
    if (rows.some(r => r.lugarId === l.id)) return;
    const { data, error } = await supabase
      .from("item_lugares")
      .insert([{ item_id: itemId, lugar_id: l.id }])
      .select().single();
    if (!error && data) {
      setRows(prev => [...prev, { rowId: data.id, lugarId: l.id, lugarNombre: l.nombre }]);
    }
  };

  const remove = async (rowId: string) => {
    await supabase.from("item_lugares").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Panel selector de lugares (usa SeccionEntidad) ──────────────────────────

function PanelLugares({ itemId, onNavigateLugar }: { itemId: string; onNavigateLugar?: (id: string) => void }) {
  const { rows, loading, add, remove } = useLugaresItem(itemId);
  const [allLugares, setAllLugares] = useState<LugarMin[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("lugares").select("id, nombre").order("nombre")
      .then(({ data }) => setAllLugares(data ?? []));
  }, []);

  const handleToggle = async (id: string, addIt: boolean) => {
    setSaving(true);
    if (addIt) {
      const lugar = allLugares.find(l => l.id === id);
      if (lugar) await add(lugar);
    } else {
      const row = rows.find(r => r.lugarId === id);
      if (row) await remove(row.rowId);
    }
    setSaving(false);
  };

  return (
    <SeccionEntidad
      label="Lugar donde encontrarlo"
      icon={<MapPin size={9} />}
      fallbackIcon={<MapPin size={9} />}
      emptyLabel="Ningún lugar asignado"
      allEntities={allLugares}
      selectedIds={rows.map(r => r.lugarId)}
      loading={loading}
      saving={saving}
      onToggle={handleToggle}
      onEntityClick={onNavigateLugar}
    />
  );
}

// ─── EditorItem ───────────────────────────────────────────────────────────────

export function EditorItem({
  item, onSaved, onDeleted, entities = [], onSelectCriatura, onNavigateLugar, onNavigateReino,
}: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onSelectCriatura?: (criaturaId: string) => void;
  onNavigateLugar?: (id: string) => void;
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
                <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
                  onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                  placeholder={<Package size={20} className="opacity-20" />} />
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

                {/* Origen + Lugares en dos columnas */}
                <div className="flex flex-col sm:flex-row gap-4">

                  {/* Columna Origen */}
                  <div className="flex-1 min-w-0 space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Origen</label>

                  {/* Nivel 1: Natural / Artificial */}
                  <div className="flex gap-2">
                    {(["Natural", "Artificial"] as const).map(op => {
                      const isSelected = form.origen === op;
                      const Icon = op === "Natural" ? Leaf : Wrench;
                      return (
                        <button key={op} type="button"
                          onClick={() => setForm(f => ({
                            ...f,
                            origen: isSelected ? null : op,
                            sub_origen: null,
                          }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
                          style={isSelected ? {
                            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                            color: "var(--primary)",
                            border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)",
                          } : {
                            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                          }}
                        >
                          <Icon size={10} /> {op}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nivel 2: sub-origen de Natural */}
                  {form.origen === "Natural" && (
                    <div className="pl-3 border-l-2 space-y-2" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                      <div className="flex gap-2">
                        {(["Planta", "Criatura"] as const).map(sub => {
                          const isSelected = form.sub_origen === sub;
                          const Icon = sub === "Planta" ? Leaf : Bug;
                          return (
                            <button key={sub} type="button"
                              onClick={() => setForm(f => ({
                                ...f,
                                sub_origen: isSelected ? null : sub,
                              }))}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
                              style={isSelected ? {
                                background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                                color: "var(--primary)",
                                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                              } : {
                                color: "color-mix(in srgb, var(--primary) 30%, transparent)",
                                border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
                              }}
                            >
                              <Icon size={10} /> {sub}
                            </button>
                          );
                        })}
                      </div>

                      {/* Si Natural → Criatura: selector de criaturas */}
                      {form.sub_origen === "Criatura" && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                            <Bug size={9} /> Criaturas de origen
                          </label>
                          <PanelCrafterSources itemId={form.id} onSelectCriatura={onSelectCriatura} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nivel 2: Artificial → selector de criaturas */}
                  {form.origen === "Artificial" && (
                    <div className="pl-3 border-l-2 space-y-1.5" style={{ borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}>
                      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                        <Wrench size={9} /> Criaturas que lo crean
                      </label>
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

                  {/* Columna Lugares */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                      <MapPin size={9} /> Lugar donde encontrarlo
                    </label>
                    <PanelLugares itemId={form.id} onNavigateLugar={onNavigateLugar} />
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