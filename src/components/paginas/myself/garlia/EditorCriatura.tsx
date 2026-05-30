"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bug, Plus, Check, X, Trash2, Save, ChevronDown, Lock,
  Dna, Brain, Wand2, GitBranch, Package, Wrench, Leaf, Layers, Users,
  MapPin, Globe, ExternalLink, Pencil, Search,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Criatura, type CriaturaVariante, type SaveStatus, INPUT_CLS } from "./components/types";
import { useCriaturaVariantes, useGruposDeCriatura, usePersonajesDeEspecie, type GrupoMin } from "./components/hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./components/UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";
import { BloqueHechizos } from "./components/BloqueHechizos";
import { BloqueDones } from "./components/BloqueDones";

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

// ─── Singleton: catálogo de ítems ─────────────────────────────────────────────
// Compartido entre BloqueItemsNaturales y BloqueItemsCraftedos — un solo fetch
// aunque haya múltiples bloques montados (criatura base + variantes).
type ItemMin = { id: string; nombre: string; imagen_url?: string | null };
let _itemsData:    ItemMin[] | null = null;
let _itemsPromise: Promise<ItemMin[]> | null = null;

async function fetchAllItems(): Promise<ItemMin[]> {
  if (_itemsData) return _itemsData;
  if (_itemsPromise) return _itemsPromise;

  _itemsPromise = (async () => {
    // 1. Dexie primero
    try {
      if (db) {
        const local = await db.items.orderBy("nombre").toArray();
        if (local.length > 0) {
          _itemsData = local as ItemMin[];
          // Refrescar en background
          if (navigator.onLine) {
            supabase.from("items").select("id, nombre, imagen_url").order("nombre")
              .then(({ data }) => {
                if (data && data.length > 0) _itemsData = data as ItemMin[];
              });
          }
          return _itemsData;
        }
      }
    } catch {}

    // 2. Supabase
    if (!navigator.onLine) return [];
    const { data } = await supabase.from("items").select("id, nombre, imagen_url").order("nombre");
    _itemsData = (data ?? []) as ItemMin[];
    return _itemsData;
  })().finally(() => { _itemsPromise = null; });

  return _itemsPromise;
}

// ─── Hook: items que crea una criatura ────────────────────────────────────────

type CraftedItem = {
  crafterId: string;
  itemId: string;
  itemName: string;
  itemImg?: string | null;
};

function useCraftedItems(criaturaId: string) {
  const [items,   setItems]   = useState<CraftedItem[]>([]);
  const [allItems, setAllItems] = useState<ItemMin[]>(_itemsData ?? []);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Leer Dexie local + catálogo en paralelo
    const [localDrops, catalogResult] = await Promise.all([
      db ? db.item_crafteres.where("criatura_id").equals(criaturaId).toArray().catch(() => []) : Promise.resolve([]),
      fetchAllItems(),
    ]);

    setAllItems(catalogResult);

    if (localDrops.length > 0) {
      const itemMap = Object.fromEntries(catalogResult.map(i => [i.id, i]));
      setItems(localDrops.map((r: any) => ({
        crafterId: r.id,
        itemId:    r.item_id,
        itemName:  itemMap[r.item_id]?.nombre   ?? "—",
        itemImg:   itemMap[r.item_id]?.imagen_url ?? null,
      })));
      setLoading(false);
    }

    // Fetch remoto
    if (!navigator.onLine) { setLoading(false); return; }

    const { data } = await supabase
      .from("item_crafteres")
      .select(`id, item_id, items!item_id(nombre, imagen_url)`)
      .eq("criatura_id", criaturaId);

    const remoteItems: CraftedItem[] = (data ?? []).map((r: any) => ({
      crafterId: r.id,
      itemId:    r.item_id,
      itemName:  (Array.isArray(r.items) ? r.items[0]?.nombre    : r.items?.nombre)    ?? "—",
      itemImg:   (Array.isArray(r.items) ? r.items[0]?.imagen_url : r.items?.imagen_url) ?? null,
    }));
    setItems(remoteItems);
    setLoading(false);

    // Sincronizar Dexie
    try {
      if (db) {
        await db.item_crafteres.where("criatura_id").equals(criaturaId).delete();
        if (remoteItems.length > 0) {
          await db.item_crafteres.bulkPut(remoteItems.map(i => ({ id: i.crafterId, criatura_id: criaturaId, item_id: i.itemId })));
        }
      }
    } catch {}
  }, [criaturaId]);

  useEffect(() => { load(); }, [load]);

  const add = async (item: ItemMin) => {
    if (items.some(i => i.itemId === item.id)) return;
    // Optimista
    const tempId = `temp_${item.id}`;
    setItems(prev => [...prev, { crafterId: tempId, itemId: item.id, itemName: item.nombre, itemImg: item.imagen_url ?? null }]);

    const { data, error } = await supabase
      .from("item_crafteres")
      .insert([{ item_id: item.id, criatura_id: criaturaId }])
      .select().single();

    if (!error && data) {
      setItems(prev => prev.map(i => i.crafterId === tempId ? { ...i, crafterId: data.id } : i));
      try { if (db) await db.item_crafteres.put({ id: data.id, criatura_id: criaturaId, item_id: item.id }); } catch {}
      await supabase.from("items").update({ origen: "Artificial", sub_origen: null }).eq("id", item.id);
    } else {
      // Revertir optimista si falló
      setItems(prev => prev.filter(i => i.crafterId !== tempId));
    }
  };

  const remove = async (crafterId: string) => {
    // Optimista
    setItems(prev => prev.filter(i => i.crafterId !== crafterId));
    try { if (db) await db.item_crafteres.delete(crafterId); } catch {}
    await supabase.from("item_crafteres").delete().eq("id", crafterId);
  };

  return { items, allItems, loading, add, remove };
}

// ─── Hook: ítems naturales que dropea una criatura ────────────────────────────

type NaturalItem = {
  dropId:   string;
  itemId:   string;
  itemName: string;
  itemImg?: string | null;
};

function useNaturalItems(criaturaId: string, varianteId?: string | null) {
  const [items,    setItems]    = useState<NaturalItem[]>([]);
  const [allItems, setAllItems] = useState<ItemMin[]>(_itemsData ?? []);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Leer Dexie local + catálogo en paralelo
    const localDropsPromise = db
      ? db.criatura_drops
          .where("criatura_id").equals(criaturaId)
          .toArray()
          .then(rows => rows.filter((r: any) => (varianteId ? r.variante_id === varianteId : !r.variante_id)))
          .catch(() => [] as any[])
      : Promise.resolve([] as any[]);

    const [localDrops, catalogResult] = await Promise.all([
      localDropsPromise,
      fetchAllItems(),
    ]);

    setAllItems(catalogResult);

    if (localDrops.length > 0) {
      const itemMap = Object.fromEntries(catalogResult.map(i => [i.id, i]));
      setItems(localDrops.map((r: any) => ({
        dropId:   r.id,
        itemId:   r.item_id,
        itemName: itemMap[r.item_id]?.nombre    ?? "—",
        itemImg:  itemMap[r.item_id]?.imagen_url ?? null,
      })));
      setLoading(false);
    }

    // Fetch remoto
    if (!navigator.onLine) { setLoading(false); return; }

    let query = supabase
      .from("criatura_drops")
      .select(`id, item_id, items!item_id(nombre, imagen_url)`)
      .eq("criatura_id", criaturaId);
    query = varianteId ? query.eq("variante_id", varianteId) : query.is("variante_id", null);

    const { data } = await query;

    const remoteItems: NaturalItem[] = (data ?? []).map((r: any) => ({
      dropId:   r.id,
      itemId:   r.item_id,
      itemName: (Array.isArray(r.items) ? r.items[0]?.nombre    : r.items?.nombre)    ?? "—",
      itemImg:  (Array.isArray(r.items) ? r.items[0]?.imagen_url : r.items?.imagen_url) ?? null,
    }));
    setItems(remoteItems);
    setLoading(false);

    // Sincronizar Dexie
    try {
      if (db) {
        const existing = await db.criatura_drops
          .where("criatura_id").equals(criaturaId)
          .filter((r: any) => varianteId ? r.variante_id === varianteId : !r.variante_id)
          .primaryKeys();
        if (existing.length > 0) await db.criatura_drops.bulkDelete(existing as string[]);
        if (remoteItems.length > 0) {
          await db.criatura_drops.bulkPut(remoteItems.map(i => ({
            id: i.dropId, criatura_id: criaturaId, item_id: i.itemId, variante_id: varianteId ?? null,
          })));
        }
      }
    } catch {}
  }, [criaturaId, varianteId]);

  useEffect(() => { load(); }, [load]);

  const add = async (item: ItemMin) => {
    if (items.some(i => i.itemId === item.id)) return;
    // Optimista
    const tempId = `temp_${item.id}`;
    setItems(prev => [...prev, { dropId: tempId, itemId: item.id, itemName: item.nombre, itemImg: item.imagen_url ?? null }]);

    const { data, error } = await supabase
      .from("criatura_drops")
      .insert([{ item_id: item.id, criatura_id: criaturaId, variante_id: varianteId ?? null }])
      .select().single();

    if (!error && data) {
      setItems(prev => prev.map(i => i.dropId === tempId ? { ...i, dropId: data.id } : i));
      try { if (db) await db.criatura_drops.put({ id: data.id, criatura_id: criaturaId, item_id: item.id, variante_id: varianteId ?? null }); } catch {}
      await supabase.from("items").update({ origen: "Natural", sub_origen: "Criatura" }).eq("id", item.id);
    } else {
      setItems(prev => prev.filter(i => i.dropId !== tempId));
    }
  };

  const remove = async (dropId: string) => {
    // Optimista
    setItems(prev => prev.filter(i => i.dropId !== dropId));
    try { if (db) await db.criatura_drops.delete(dropId); } catch {}
    await supabase.from("criatura_drops").delete().eq("id", dropId);
  };

  return { items, allItems, loading, add, remove };
}

// ─── Bloque de ítems naturales (drops base de la criatura) ────────────────────

function BloqueItemsNaturales({
  criaturaId, varianteId, onSelectItem,
}: {
  criaturaId: string;
  varianteId?: string | null;
  onSelectItem?: (itemId: string) => void;
}) {
  const { items, allItems, loading, add, remove } = useNaturalItems(criaturaId, varianteId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allItems.filter(it =>
    it.nombre.toLowerCase().includes(search.toLowerCase()) &&
    !items.some(ni => ni.itemId === it.id)
  );

  if (loading) return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-[9px] text-primary/20 italic">Cargando…</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[9px] text-primary/20 italic py-2">Sin ítems naturales</p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map(it => (
            <div key={it.dropId} className="relative group">
              <button
                onClick={() => onSelectItem?.(it.itemId)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <div className="shrink-0 w-7 h-7 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {it.itemImg
                    ? <img src={it.itemImg} alt={it.itemName} className="w-full h-full object-cover" />
                    : <Package size={11} className="text-primary/20" />}
                </div>
                <span className="flex-1 text-[10px] font-bold text-primary/65 truncate leading-tight">{it.itemName}</span>
              </button>
              <button
                onClick={e => { e.stopPropagation(); remove(it.dropId); }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 border border-red-500/20 cursor-pointer"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/15 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60 hover:border-primary/30 transition-all cursor-pointer">
          <Plus size={9} /> Añadir ítem
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            <div className="p-1.5 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar ítem…"
                className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5" />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[9px] text-primary/25 italic text-center py-3">Sin resultados</p>
              )}
              {filtered.map(it => (
                <button key={it.id} onClick={() => { add(it); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 transition-colors text-left cursor-pointer">
                  <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {it.imagen_url
                      ? <img src={it.imagen_url} alt={it.nombre} className="w-full h-full object-cover" />
                      : <Package size={8} className="text-primary/20" />}
                  </div>
                  <span className="text-[10px] font-bold text-primary/65 truncate">{it.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bloque de ítems que crea una criatura ────────────────────────────────────

function BloqueItemsCraftedos({
  criaturaId, onSelectItem,
}: {
  criaturaId: string;
  onSelectItem?: (itemId: string) => void;
}) {
  const { items, allItems, loading, add, remove } = useCraftedItems(criaturaId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allItems.filter(it =>
    it.nombre.toLowerCase().includes(search.toLowerCase()) &&
    !items.some(ci => ci.itemId === it.id)
  );

  if (loading) return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-[9px] text-primary/20 italic">Cargando…</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[9px] text-primary/20 italic py-2">Sin ítems creados</p>
      )}

      {/* Grid de 2 columnas */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map(it => (
            <div key={it.crafterId} className="relative group">
              {/* Tarjeta clickeable */}
              <button
                onClick={() => onSelectItem?.(it.itemId)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                style={{
                  background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)",
                }}
              >
                <div className="shrink-0 w-7 h-7 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {it.itemImg
                    ? <img src={it.itemImg} alt={it.itemName} className="w-full h-full object-cover" />
                    : <Package size={11} className="text-primary/20" />}
                </div>
                <span className="flex-1 text-[10px] font-bold text-primary/65 truncate leading-tight">{it.itemName}</span>
              </button>

              {/* Botón quitar flotante */}
              <button
                onClick={e => { e.stopPropagation(); remove(it.crafterId); }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 border border-red-500/20 cursor-pointer"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown para añadir */}
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/15 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60 hover:border-primary/30 transition-all cursor-pointer">
          <Plus size={9} /> Añadir ítem
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            <div className="p-1.5 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar ítem…"
                className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5" />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[9px] text-primary/25 italic text-center py-3">Sin resultados</p>
              )}
              {filtered.map(it => (
                <button key={it.id} onClick={() => { add(it); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 transition-colors text-left cursor-pointer">
                  <div className="shrink-0 w-5 h-5 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {it.imagen_url
                      ? <img src={it.imagen_url} alt={it.nombre} className="w-full h-full object-cover" />
                      : <Package size={8} className="text-primary/20" />}
                  </div>
                  <span className="text-[10px] font-bold text-primary/65 truncate">{it.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campo colapsable ─────────────────────────────────────────────────────────
function CampoLore({
  label, value, onChange, placeholder, rows = 5, icon: Icon, entities = [],
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; icon?: React.ElementType; entities?: WikiEntity[];
}) {
  const [open, setOpen] = useState(!!value);
  const { onSnippetAction } = useWikilink();
  const preview = value.replace(/[#*`_~\[\]]/g, "").trim().slice(0, 80);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3 cursor-pointer"
      >
        {Icon && <Icon size={12} className="shrink-0 text-primary/35" />}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/40">{label}</p>
          {!open && preview && <p className="text-[11px] text-primary/35 truncate mt-0.5 font-medium italic">{preview}…</p>}
          {!open && !preview && <p className="text-[10px] text-primary/20 mt-0.5 italic">{placeholder?.slice(0, 55)}…</p>}
        </div>
        <ChevronDown size={13} className="shrink-0 text-primary/25 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <MarkdownEditor value={value} onChange={onChange} placeholder={placeholder} rows={rows} toolbar defaultMode="edit" onSnippetAction={onSnippetAction} entities={entities}
/>
        </div>
      )}
    </div>
  );
}

// ─── VarianteEditor ────────────────────────────────────────────────────────────
function VarianteEditor({
  variante, criaturaId, onSaved, onDeleted, entities = [],
}: {
  variante: CriaturaVariante;
  criaturaId: string;
  onSaved: (v: CriaturaVariante) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
}) {
  const [form,     setForm]     = useState(variante);
  const [expanded, setExpanded] = useState(false);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  const handleSave = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criatura_variantes").update({
        tipo: form.tipo, descripcion: form.descripcion || null,
        imagen_url: form.imagen_url || null,
      }).eq("id", form.id);

      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("criatura_variantes", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ message: `¿Eliminar la variante "${form.tipo}"?`, danger: true });
    if (!ok) return;
    await supabase.from("criatura_variantes").delete().eq("id", form.id);
    void dexieDel("criatura_variantes", form.id);
    onDeleted(form.id);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all cursor-pointer"
      style={{
        border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
        background: "color-mix(in srgb, var(--primary) 2%, transparent)",
      }}
    >
      <ConfirmModal />

      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {form.imagen_url && (
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-primary/10 shrink-0">
            <img src={form.imagen_url} alt={form.tipo} className="w-full h-full object-cover" />
          </div>
        )}
        <Bug size={11} className="text-primary/30 shrink-0" />
        <span className="flex-1 text-[11px] font-black uppercase tracking-widest text-primary truncate">{form.tipo}</span>
        <div className="flex items-center gap-2 shrink-0">
          <SaveIndicator status={status} />
          <X size={12} className="text-primary/30 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(45deg)" : undefined }} />
        </div>
      </div>

      {expanded && (
        <div
          className="border-t px-3 pb-3 pt-3"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          {/* Layout de columnas: imagen | descripción | naturales+creaciones */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            {/* Imagen */}
            <div className="shrink-0 sm:w-48 flex flex-col">
              <div className="flex-1 flex flex-col">
                <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
                  onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                  aspect="square" placeholder={<Bug size={16} className="opacity-20" />} />
              </div>
            </div>

            {/* Tipo + Descripción */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">Tipo / Nombre</label>
                <input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className={INPUT_CLS + " mt-1"} placeholder="Joven, Adulto, Albino, Nocturno…" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 block mb-1">Descripción</label>
                <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                  rows={4} placeholder="Diferencias físicas, comportamiento particular…" toolbar defaultMode="edit"                   onSnippetAction={onSnippetAction}
                  entities={entities}
                  />
              </div>
            </div>

            {/* Naturales + Creaciones */}
            <div className="sm:shrink-0 sm:w-52 space-y-3">
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 flex items-center gap-1"><Leaf size={9} /> Naturales</p>
                <BloqueItemsNaturales criaturaId={criaturaId} varianteId={form.id} />
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 flex items-center gap-1"><Wrench size={9} /> Creaciones</p>
                <BloqueItemsCraftedos criaturaId={criaturaId} />
              </div>
            </div>


          </div>

          <div className="flex items-center justify-between pt-3">
            <button onClick={handleDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 cursor-pointer">
              <Trash2 size={10} /> Eliminar
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all cursor-pointer">
              <Check size={10} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tipo extendido localmente (GrupoMin + subtipo) ──────────────────────────
type GrupoMinExt = GrupoMin & { subtipo?: string | null };

// ─── BloqueGrupoCategoria — bloque filtrado por subtipo ───────────────────────
// Reemplaza BloqueGruposCriatura mostrando un bloque por categoría (Hábitat,
// Inteligencia, Alma) en lugar de todos los grupos juntos. El estilo imita los
// chips de especie / reino de EditorPersonaje.

function BloqueGrupoCategoria({
  label,
  subtipo,
  icon: Icon,
  gruposActuales,
  todosGrupos,
  onAdd,
  onRemove,
  onSelectGrupo,
}: {
  label: string;
  subtipo: string;
  icon: React.ElementType;
  gruposActuales: GrupoMinExt[];
  todosGrupos: GrupoMinExt[];
  onAdd: (grupoId: string) => void;
  onRemove: (grupoId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const gruposDeCat = todosGrupos.filter(g => g.subtipo === subtipo);
  const actual = gruposActuales.filter(g => gruposDeCat.some(c => c.id === g.id));
  const disponibles = gruposDeCat.filter(
    g => !gruposActuales.some(a => a.id === g.id) &&
         g.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const border = "1px solid color-mix(in srgb, var(--primary) 15%, transparent)";
  const borderFocus = "1px solid color-mix(in srgb, var(--primary) 35%, transparent)";

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {/* Label — idéntico al de ComboSelector */}
      <label className="text-[9px] font-black uppercase tracking-widest text-primary/40 flex items-center gap-1.5">
        <Icon size={9} className="opacity-70" /> {label}
      </label>

      {/* Filas de valores asignados */}
      {actual.length > 0 && (
        <div className="flex flex-col gap-1">
          {actual.map(g => (
            /* Mismo layout que el trigger con onNavigate del ComboSelector */
            <div
              key={g.id}
              className="w-full flex items-center rounded-[var(--radius-btn)] overflow-hidden transition-all"
              style={{
                background: "color-mix(in srgb, var(--primary) 5%, transparent)",
                border,
              }}
            >
              {/* Click principal → navegar al grupo */}
              <button
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase truncate transition-all hover:bg-primary/5 min-w-0"
                style={{ color: "var(--primary)" }}
                title="Ir al grupo"
              >
                <span className="truncate">{g.nombre}</span>
              </button>
              {/* Lápiz → abre el dropdown para cambiar */}
              <button
                type="button"
                onClick={() => { setOpen(o => !o); setSearch(""); }}
                className="shrink-0 flex items-center justify-center px-2.5 py-2 transition-all hover:bg-primary/10"
                style={{
                  borderLeft: "1px solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                }}
                title="Cambiar"
              >
                <Pencil size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Trigger vacío — igual que el ComboSelector sin valor */}
      {actual.length === 0 && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-btn)] text-[11px] font-bold transition-all"
          style={{
            background: "color-mix(in srgb, var(--primary) 5%, transparent)",
            border: open ? borderFocus : border,
            color: "color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        >
          <span className="font-black uppercase text-[10px] tracking-wide">Sin asignar</span>
          <ChevronDown
            size={12}
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            style={{ opacity: 0.5 }}
          />
        </button>
      )}

      {/* Dropdown — mismo estilo que el de ComboSelector */}
      {open && (
        <div
          className="rounded-[var(--radius-btn)] overflow-hidden"
          style={{
            border,
            background: "var(--bg-main)",
            boxShadow: "0 8px 24px color-mix(in srgb, var(--primary) 10%, transparent)",
          }}
        >
          {/* Buscador */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
          >
            <Search size={11} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)", flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Escape" && (setOpen(false), setSearch(""))}
              placeholder="Buscar…"
              className="flex-1 bg-transparent outline-none text-[11px] font-bold uppercase tracking-wide placeholder:normal-case placeholder:font-medium placeholder:tracking-normal"
              style={{ color: "var(--primary)", caretColor: "var(--primary)" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="opacity-30 hover:opacity-70 transition-opacity"
              >
                <X size={10} style={{ color: "var(--primary)" }} />
              </button>
            )}
          </div>

          {/* Lista de opciones */}
          <div className="max-h-48 overflow-y-auto">
            {/* Opción "quitar" si hay algo asignado */}
            {actual.length > 0 && (
              <button
                type="button"
                onMouseDown={() => { actual.forEach(g => onRemove(g.id)); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase transition-all"
                style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <X size={9} className="opacity-50" />
                </span>
                Sin asignar
              </button>
            )}

            {gruposDeCat.length === 0 ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                No hay grupos de «{label}» creados
              </p>
            ) : disponibles.length === 0 && !actual.length ? (
              <p className="text-[10px] text-primary/30 px-4 py-3 font-bold uppercase">
                {search ? `Sin resultados para "${search}"` : "Todos asignados"}
              </p>
            ) : disponibles.map(g => (
              <button
                key={g.id}
                type="button"
                onMouseDown={() => { onAdd(g.id); setOpen(false); setSearch(""); }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase transition-all hover:bg-primary/6"
                style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}
              >
                <span className="truncate">{g.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BloqueGruposCriatura ─────────────────────────────────────────────────────
// Muestra a qué grupos pertenece la criatura y permite añadir/quitar.
// Es la mitad del enlace bidireccional: el grupo almacena miembro_ids,
// y desde aquí actualizamos esos arrays directamente en Supabase.

function BloqueGruposCriatura({
  gruposActuales,
  todosGrupos,
  onAdd,
  onRemove,
  onSelectGrupo,
}: {
  gruposActuales: GrupoMin[];
  todosGrupos: GrupoMin[];
  onAdd: (grupoId: string) => void;
  onRemove: (grupoId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const disponibles = useMemo(() =>
    todosGrupos.filter(g =>
      !gruposActuales.some(a => a.id === g.id) &&
      g.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [todosGrupos, gruposActuales, search]
  );

  if (todosGrupos.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
        <Layers size={9} /> Grupos
      </label>

      {/* Chips de grupos actuales */}
      {gruposActuales.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gruposActuales.map(g => (
            <div key={g.id}
              className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg border text-[10px] font-bold"
              style={{
                background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                color: "var(--primary)",
              }}>
              <button
                type="button"
                onClick={() => onSelectGrupo?.(g.id)}
                className="hover:underline cursor-pointer text-left leading-none"
                title="Ir al grupo"
              >
                {g.nombre}
              </button>
              <button
                type="button"
                onClick={() => onRemove(g.id)}
                className="w-3.5 h-3.5 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors cursor-pointer"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown añadir */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)",
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
          }}
        >
          <Plus size={8} /> Añadir a grupo
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
            <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border shadow-xl overflow-hidden"
              style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <div className="p-1.5 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar grupo…"
                  className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5"
                />
              </div>
              <div className="max-h-44 overflow-y-auto p-1">
                {disponibles.length === 0 ? (
                  <p className="text-[9px] text-primary/25 italic text-center py-3">
                    {search ? "Sin resultados" : "Ya está en todos los grupos"}
                  </p>
                ) : disponibles.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onMouseDown={() => { onAdd(g.id); setOpen(false); setSearch(""); }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer"
                  >
                    {g.nombre}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tipos mínimos ────────────────────────────────────────────────────────────
type ReinoMin  = { id: string; nombre: string };
type LugarMin2 = { id: string; nombre: string; reino_id: string | null };

// ─── Hook: reinos de la criatura (criatura_reinos) ────────────────────────────
function useCriaturaReinos(criaturaId: string) {
  type Row = { rowId: string; reinoId: string; reinoNombre: string };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_reinos")
      .select("id, reino_id, reinos!reino_id(nombre)")
      .eq("criatura_id", criaturaId);
    setRows((data ?? []).map((r: any) => ({
      rowId:       r.id,
      reinoId:     r.reino_id,
      reinoNombre: (Array.isArray(r.reinos) ? r.reinos[0]?.nombre : r.reinos?.nombre) ?? "—",
    })));
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => { load(); }, [load]);

  const add = async (reino: ReinoMin) => {
    if (rows.some(r => r.reinoId === reino.id)) return;
    const { data, error } = await supabase
      .from("criatura_reinos")
      .insert([{ criatura_id: criaturaId, reino_id: reino.id }])
      .select().single();
    if (!error && data) setRows(prev => [...prev, { rowId: data.id, reinoId: reino.id, reinoNombre: reino.nombre }]);
  };

  const remove = async (rowId: string) => {
    await supabase.from("criatura_reinos").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── Hook: lugares de la criatura (criatura_lugares) ─────────────────────────
function useCriaturaLugares(criaturaId: string) {
  type Row = { rowId: string; lugarId: string; lugarNombre: string; reinoId: string | null };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_lugares")
      .select("id, lugar_id, lugares!lugar_id(nombre, reino_id)")
      .eq("criatura_id", criaturaId);
    setRows((data ?? []).map((r: any) => {
      const l = Array.isArray(r.lugares) ? r.lugares[0] : r.lugares;
      return {
        rowId:      r.id,
        lugarId:    r.lugar_id,
        lugarNombre: l?.nombre   ?? "—",
        reinoId:    l?.reino_id  ?? null,
      };
    }));
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => { load(); }, [load]);

  const add = async (lugar: LugarMin2) => {
    if (rows.some(r => r.lugarId === lugar.id)) return;
    const { data, error } = await supabase
      .from("criatura_lugares")
      .insert([{ criatura_id: criaturaId, lugar_id: lugar.id }])
      .select().single();
    if (!error && data) setRows(prev => [...prev, { rowId: data.id, lugarId: lugar.id, lugarNombre: lugar.nombre, reinoId: lugar.reino_id }]);
  };

  const remove = async (rowId: string) => {
    await supabase.from("criatura_lugares").delete().eq("id", rowId);
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  return { rows, loading, add, remove };
}

// ─── BloqueHabitat ────────────────────────────────────────────────────────────
function BloqueHabitat({
  criaturaId,
  onNavigateLugar,
  onNavigateReino,
}: {
  criaturaId: string;
  onNavigateLugar?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const { rows: reinoRows, loading: loadingR, add: addReino, remove: removeReino } = useCriaturaReinos(criaturaId);
  const { rows: lugarRows, loading: loadingL, add: addLugar, remove: removeLugar } = useCriaturaLugares(criaturaId);

  const [allReinos,  setAllReinos]  = useState<ReinoMin[]>([]);
  const [allLugares, setAllLugares] = useState<LugarMin2[]>([]);
  const [reinoFiltro, setReinoFiltro] = useState<string | null>(null); // reino_id activo
  const [openR, setOpenR] = useState(false);
  const [openL, setOpenL] = useState(false);
  const [searchR, setSearchR] = useState("");
  const [searchL, setSearchL] = useState("");

  useEffect(() => {
    supabase.from("reinos").select("id, nombre").order("nombre")
      .then(({ data }) => setAllReinos(data ?? []));
    supabase.from("lugares").select("id, nombre, reino_id").order("nombre")
      .then(({ data }) => setAllLugares((data ?? []).map((l: any) => ({ ...l, reino_id: l.reino_id ?? null }))));
  }, []);

  // Lugares filtrados por reino activo (o sin reino si no hay activo)
  const lugaresFiltrados = allLugares.filter(l =>
    reinoFiltro ? l.reino_id === reinoFiltro : true
  );

  // Lugares ya asignados visibles según filtro actual
  const lugaresAsignados = lugarRows.filter(r =>
    reinoFiltro ? r.reinoId === reinoFiltro : true
  );

  const reinosDisponibles = allReinos.filter(r =>
    r.nombre.toLowerCase().includes(searchR.toLowerCase()) &&
    !reinoRows.some(rr => rr.reinoId === r.id)
  );

  const lugaresDisponibles = lugaresFiltrados.filter(l =>
    l.nombre.toLowerCase().includes(searchL.toLowerCase()) &&
    !lugarRows.some(lr => lr.lugarId === l.id)
  );

  return (
    <div className="space-y-3">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Hábitat</p>

      {/* ── Reinos ── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25 flex items-center gap-1">
          <Globe size={9} /> Reinos
        </label>

        {loadingR ? (
          <p className="text-[9px] text-primary/20 italic">Cargando…</p>
        ) : (
          <>
            {reinoRows.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {reinoRows.map(r => (
                  <div key={r.rowId}
                    className="flex items-center gap-0.5 pl-2 pr-1 py-0.5 rounded-lg border text-[10px] font-bold transition-all"
                    style={{
                      background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                      borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigateReino?.(r.reinoId)}
                      className="leading-none flex items-center gap-1 hover:underline transition-opacity"
                      style={{ cursor: onNavigateReino ? "pointer" : "default", opacity: onNavigateReino ? 1 : 0.75 }}
                      title="Abrir reino"
                    >
                      {r.reinoNombre}
                      {onNavigateReino && <ExternalLink size={7} className="opacity-40" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReino(r.rowId)}
                      className="w-3.5 h-3.5 rounded flex items-center justify-center text-primary/30 hover:text-red-400 transition-colors"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <button type="button" onClick={() => setOpenR(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                <Plus size={8} /> Añadir reino
              </button>
              {openR && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setOpenR(false); setSearchR(""); }} />
                  <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-xl border shadow-xl overflow-hidden"
                    style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="p-1.5 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      <input autoFocus value={searchR} onChange={e => setSearchR(e.target.value)}
                        placeholder="Buscar reino…"
                        className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5" />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {reinosDisponibles.length === 0
                        ? <p className="text-[9px] text-primary/25 italic text-center py-3">Sin resultados</p>
                        : reinosDisponibles.map(r => (
                          <button key={r.id} type="button"
                            onMouseDown={() => { addReino(r); setOpenR(false); setSearchR(""); }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer">
                            {r.nombre}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Lugares ── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25 flex items-center gap-1.5">
          <MapPin size={9} />
          Lugares
          {reinoFiltro && (
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
              {reinoRows.find(r => r.reinoId === reinoFiltro)?.reinoNombre}
            </span>
          )}
        </label>

        {loadingL ? (
          <p className="text-[9px] text-primary/20 italic">Cargando…</p>
        ) : (
          <>
            {lugaresAsignados.length === 0 && (
              <p className="text-[9px] text-primary/20 italic py-1">
                {reinoFiltro ? "Sin lugares en este reino" : "Sin lugares asignados"}
              </p>
            )}
            {lugaresAsignados.length > 0 && (
              <div className="space-y-1">
                {lugaresAsignados.map(r => (
                  <div key={r.rowId} className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors"
                    style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                    <button onClick={() => onNavigateLugar?.(r.lugarId)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer hover:text-primary transition-colors group/lugar">
                      <MapPin size={9} className="shrink-0 text-primary/30 group-hover/lugar:text-primary/60 transition-colors" />
                      <span className="text-[10px] font-bold text-primary/65 truncate group-hover/lugar:text-primary transition-colors underline-offset-2 group-hover/lugar:underline">
                        {r.lugarNombre}
                      </span>
                    </button>
                    <button onClick={() => removeLugar(r.rowId)}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded text-red-400/50 hover:text-red-400 cursor-pointer">
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <button type="button" onClick={() => setOpenL(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                <Plus size={8} /> Añadir lugar
              </button>
              {openL && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setOpenL(false); setSearchL(""); }} />
                  <div className="absolute z-50 top-full left-0 mt-1 w-52 rounded-xl border shadow-xl overflow-hidden"
                    style={{ background: "var(--bg-main)", borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                    <div className="p-1.5 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
                      <input autoFocus value={searchL} onChange={e => setSearchL(e.target.value)}
                        placeholder="Buscar lugar…"
                        className="w-full bg-transparent text-[10px] text-primary outline-none placeholder:text-primary/30 px-1.5 py-0.5" />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {lugaresDisponibles.length === 0
                        ? <p className="text-[9px] text-primary/25 italic text-center py-3">Sin resultados</p>
                        : lugaresDisponibles.map(l => (
                          <button key={l.id} type="button"
                            onMouseDown={() => { addLugar(l); setOpenL(false); setSearchL(""); }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary/75 hover:bg-primary/6 hover:text-primary transition-colors truncate cursor-pointer">
                            {l.nombre}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────
export function EditorCriatura({
  item, onSaved, onDeleted, entities = [], onSelectItem, onSelectPersonaje, onSelectGrupo, onNavigateLugar, onNavigateReino,
}: {
  item: Criatura; onSaved: (c: Criatura) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onSelectItem?: (itemId: string) => void;
  onSelectPersonaje?: (personajeId: string) => void;
  onSelectGrupo?: (grupoId: string) => void;
  onNavigateLugar?: (id: string) => void;
  onNavigateReino?: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  // Grupos de criaturas a los que pertenece esta criatura (sincronización bidireccional)
  const {
    grupos: gruposActuales,
    todosGrupos,
    addToGrupo,
    removeFromGrupo,
  } = useGruposDeCriatura(form.id);
  const { variantes, setVariantes } = useCriaturaVariantes(item.id);
  const { personajes: personajesDeEspecie } = usePersonajesDeEspecie(form.nombre);
  const [addingVariante,  setAddingVariante]  = useState(false);
  const [newVarianteTipo, setNewVarianteTipo] = useState("");

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const field = (k: keyof Criatura) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("criaturas").update({
        nombre: form.nombre, imagen_url: form.imagen_url || null,
        descripcion: form.descripcion, habitat: form.habitat,
        pensamiento: form.pensamiento, alma: form.alma,
        biologia: form.biologia, relacion: form.relacion,
        comportamiento: form.comportamiento, magia: form.magia,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("criaturas", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar a "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("criaturas").delete().eq("id", form.id);
    void dexieDel("criaturas", form.id);
    onDeleted(form.id);
  };

  const handleAddVariante = async () => {
    if (!newVarianteTipo.trim()) return;
    const { data, error } = await supabase.from("criatura_variantes")
      .insert([{ criatura_id: form.id, tipo: newVarianteTipo.trim() }]).select().single();
    if (!error && data) { setVariantes(prev => [...prev, data]); void dexiePut("criatura_variantes", data); setAddingVariante(false); setNewVarianteTipo(""); }
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden relative">
      <ConfirmModal />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── Fixed header ─────────────────────────────────────────────────── */}
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
              : <Bug size={16} className="text-primary/25" />}
          </div>

          <input
            value={form.nombre ?? ""}
            onChange={field("nombre")}
            placeholder="Nombre de la criatura"
            className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
          />

          <div className="shrink-0 flex items-center gap-2">
            <SaveIndicator status={status} />
            <button onClick={del}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer">
              <Trash2 size={10} />
            </button>
            <button onClick={save} disabled={status === "saving"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
              <Save size={11} /> Guardar
            </button>
          </div>
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          <div className="p-4 space-y-4">

              <div className="flex flex-col sm:flex-row gap-5">
                {/* Columna izquierda: imagen */}
                <div className="shrink-0 sm:w-96 w-full max-w-xs mx-auto sm:mx-0">
                  <SelectorImagen label="Ilustración" value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                    placeholder={<Bug size={20} className="opacity-20" />} />
                </div>

                {/* Columna central: grupos + descripción */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Tres bloques de categoría: Hábitat · Inteligencia · Alma */}
                  <div className="grid grid-cols-3 gap-2">
                    <BloqueGrupoCategoria
                      label="Hábitat"
                      subtipo="Hábitat"
                      icon={Globe}
                      gruposActuales={gruposActuales as GrupoMinExt[]}
                      todosGrupos={todosGrupos as GrupoMinExt[]}
                      onAdd={addToGrupo}
                      onRemove={removeFromGrupo}
                      onSelectGrupo={onSelectGrupo}
                    />
                    <BloqueGrupoCategoria
                      label="Inteligencia"
                      subtipo="Inteligencia"
                      icon={Brain}
                      gruposActuales={gruposActuales as GrupoMinExt[]}
                      todosGrupos={todosGrupos as GrupoMinExt[]}
                      onAdd={addToGrupo}
                      onRemove={removeFromGrupo}
                      onSelectGrupo={onSelectGrupo}
                    />
                    <BloqueGrupoCategoria
                      label="Alma"
                      subtipo="Alma"
                      icon={Wand2}
                      gruposActuales={gruposActuales as GrupoMinExt[]}
                      todosGrupos={todosGrupos as GrupoMinExt[]}
                      onAdd={addToGrupo}
                      onRemove={removeFromGrupo}
                      onSelectGrupo={onSelectGrupo}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                    <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                      placeholder="Aspecto físico general…" rows={5} toolbar defaultMode="edit"                       onSnippetAction={onSnippetAction}
                      entities={entities}
                      />
                  </div>
                </div>

                {/* Columna hábitat: reinos + lugares */}
                <div className="sm:shrink-0 sm:w-52 space-y-3">
                  <BloqueHabitat criaturaId={form.id} onNavigateLugar={onNavigateLugar} onNavigateReino={onNavigateReino} />
                </div>

                {/* Columna derecha: Catálogo Mágico */}
                <div className="sm:shrink-0 sm:w-64 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Catálogo Mágico</p>
                 <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25">Hechizos</p>
                      {/* Los grupos actuales de la criatura determinan la compatibilidad */}
                      <BloqueHechizos personajeId={form.id} grupoIds={gruposActuales.map(g => g.id)} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25">Dones</p>
                      {/* Los grupos actuales de la criatura determinan la compatibilidad */}
                      <BloqueDones personajeId={form.id} grupoIds={gruposActuales.map(g => g.id)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Naturales + Creaciones: fila entre descripción y variantes */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Naturales: drops de criatura */}
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
                    <Leaf size={9} /> Naturales
                  </label>
                  <BloqueItemsNaturales criaturaId={form.id} onSelectItem={onSelectItem} />
                </div>
                {/* Creaciones: ítems craftedos */}
                <div className="flex-1 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
                    <Wrench size={9} /> Creaciones
                  </label>
                  <BloqueItemsCraftedos criaturaId={form.id} onSelectItem={onSelectItem} />
                </div>
              </div>

              {/* Personajes de esta especie */}
              {personajesDeEspecie.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
                    <Users size={9} /> Personajes de esta especie
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {personajesDeEspecie.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectPersonaje?.(p.id)}
                        className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                          borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        }}
                      >
                        <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                          {p.img_url
                            ? <img src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                            : <Users size={10} className="text-primary/20" />}
                        </div>
                        <span className="text-[11px] font-bold text-primary/70">{p.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variantes */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-2">
                    {variantes.map(v => (
                      <VarianteEditor
                        key={v.id}
                        variante={v}
                        criaturaId={form.id}
                        onSaved={updated => setVariantes(prev => prev.map(x => x.id === updated.id ? updated : x))}
                        onDeleted={id => setVariantes(prev => prev.filter(x => x.id !== id))} entities={entities}
                      />
                    ))}
                  </div>

                  {variantes.length === 0 && !addingVariante && (
                    <p className="text-[10px] font-bold text-primary/25 uppercase tracking-widest text-center py-8 border border-dashed border-primary/15 rounded-xl italic">
                      Sin variantes registradas
                    </p>
                  )}

                  {addingVariante ? (
                    <div className="flex gap-2 p-3 rounded-xl border border-primary/15"
                      style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
                      <input autoFocus value={newVarianteTipo} onChange={e => setNewVarianteTipo(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddVariante(); if (e.key === "Escape") setAddingVariante(false); }}
                        className="flex-1 bg-bg-main border border-primary/20 rounded-lg px-3 py-2 text-xs font-black uppercase text-primary outline-none focus:border-primary/50 tracking-widest"
                        placeholder="TIPO DE VARIANTE..." />
                      <button onClick={handleAddVariante} disabled={!newVarianteTipo.trim()}
                        className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setAddingVariante(false)}
                        className="px-2.5 py-2 rounded-lg text-primary/40 hover:text-primary transition-all cursor-pointer">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingVariante(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest cursor-pointer">
                      <Plus size={11} /> Añadir Variante
                    </button>
                  )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}