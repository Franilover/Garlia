"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bug, Plus, Check, X, Trash2, Save, ChevronDown, Lock,
  Dna, Brain, Wand2, GitBranch, Users, Package, Wrench,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Criatura, type CriaturaVariante, type SaveStatus, INPUT_CLS } from "./types";
import { useUniqueValues, useCriaturaVariantes, usePersonajesDeEspecie } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { PanelPersonajes } from "./PanelPersonajes";
import { BloqueHechizos } from "./BloqueHechizos";
import { BloqueDones } from "./BloqueDones";
import { BloqueDrops } from "./BloqueDrops";

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



// ─── Hook: items que crea una criatura ────────────────────────────────────────

type CraftedItem = {
  crafterId: string;
  itemId: string;
  itemName: string;
  itemImg?: string | null;
};

function useCraftedItems(criaturaId: string) {
  const [items, setItems] = useState<CraftedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("item_crafteres")
      .select(`id, item_id, items!item_id(nombre, imagen_url)`)
      .eq("criatura_id", criaturaId);

    setItems(
      (data ?? []).map((r: any) => ({
        crafterId: r.id,
        itemId:    r.item_id,
        itemName:  (Array.isArray(r.items) ? r.items[0]?.nombre : r.items?.nombre) ?? "—",
        itemImg:   (Array.isArray(r.items) ? r.items[0]?.imagen_url : r.items?.imagen_url) ?? null,
      }))
    );
    setLoading(false);
  }, [criaturaId]);

  useEffect(() => { load(); }, [load]);

  const add = async (item: { id: string; nombre: string; imagen_url?: string | null }) => {
    if (items.some(i => i.itemId === item.id)) return;
    const { data, error } = await supabase
      .from("item_crafteres")
      .insert([{ item_id: item.id, criatura_id: criaturaId }])
      .select().single();
    if (!error && data) {
      setItems(prev => [...prev, {
        crafterId: data.id, itemId: item.id,
        itemName: item.nombre, itemImg: item.imagen_url ?? null,
      }]);
    }
  };

  const remove = async (crafterId: string) => {
    await supabase.from("item_crafteres").delete().eq("id", crafterId);
    setItems(prev => prev.filter(i => i.crafterId !== crafterId));
  };

  return { items, loading, add, remove };
}

// ─── Bloque de ítems que crea una criatura ────────────────────────────────────

function BloqueItemsCraftedos({
  criaturaId, onSelectItem,
}: {
  criaturaId: string;
  onSelectItem?: (itemId: string) => void;
}) {
  const { items, loading, add, remove } = useCraftedItems(criaturaId);
  const [allItems, setAllItems] = useState<{ id: string; nombre: string; imagen_url?: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("items").select("id, nombre, imagen_url").order("nombre")
      .then(({ data }) => setAllItems(data ?? []));
  }, []);

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
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 border border-red-500/20"
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
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/15 text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary/60 hover:border-primary/30 transition-all">
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
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 transition-colors text-left">
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

// ─── Tabs internas ─────────────────────────────────────────────────────────────
type InnerTab = "base" | "especie";

const TABS: { key: InnerTab; label: string; Icon: React.ElementType }[] = [
  { key: "base",    label: "Base",    Icon: Brain },
  { key: "especie", label: "Especie", Icon: Users },
];

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
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary/3"
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
      className="rounded-xl overflow-hidden transition-all"
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
          {/* Layout de columnas: imagen | descripción | drops */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Imagen */}
            <div className="shrink-0 sm:w-48">
              <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
                onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                aspect="landscape" placeholder={<Bug size={16} className="opacity-20" />} />
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

            {/* Drops */}
            <div className="sm:shrink-0 sm:w-52 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30">Drops</p>
              <BloqueDrops criaturaId={criaturaId} varianteId={form.id} />
            </div>

            {/* Ítems que crea */}
            <div className="sm:shrink-0 sm:w-44 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/30 flex items-center gap-1">
                <Wrench size={8} /> Ítems que crea
              </p>
              <BloqueItemsCraftedos criaturaId={criaturaId} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <button onClick={handleDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
              <Trash2 size={10} /> Eliminar
            </button>
            <button onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-btn-text rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
              <Check size={10} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditorCriatura ───────────────────────────────────────────────────────────
export function EditorCriatura({
  item, onSaved, onDeleted, entities = [], onSelectItem,
}: {
  item: Criatura; onSaved: (c: Criatura) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onSelectItem?: (itemId: string) => void;
}) {
  const [form,   setForm]   = useState<Criatura>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [tab,    setTab]    = useState<InnerTab>("base");
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  const habitats     = useUniqueValues("criaturas", "habitat");
  const pensamientos = useUniqueValues("criaturas", "pensamiento");
  const almas        = useUniqueValues("criaturas", "alma");
  const { variantes, setVariantes } = useCriaturaVariantes(item.id);
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

  const { personajes, setPersonajes, loading: loadingPersonajes } = usePersonajesDeEspecie(form.nombre);

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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all">
              <Trash2 size={10} />
            </button>
            <button onClick={save} disabled={status === "saving"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50">
              <Save size={11} /> Guardar
            </button>
          </div>
        </div>

        {/* ── Inner tabs ───────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-1 px-4 py-2 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
        >
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={tab === key ? {
                background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
              } : {
                color: "color-mix(in srgb, var(--primary) 35%, transparent)",
                border: "1px solid transparent",
              }}
            >
              <Icon size={11} /> <span className="hidden sm:inline">{label}</span>
              {key === "especie" && personajes.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                  {personajes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* BASE */}
          {tab === "base" && (
            <div className="p-4 space-y-4">

              <div className="flex flex-col sm:flex-row gap-5">
                {/* Columna izquierda: imagen */}
                <div className="shrink-0 sm:w-96 w-full max-w-xs mx-auto sm:mx-0">
                  <SelectorImagen label="Ilustración" value={form.imagen_url ?? ""}
                    onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                    placeholder={<Bug size={20} className="opacity-20" />} />
                </div>

                {/* Columna central: selectores + descripción */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <SelectorTexto label="Hábitat" value={form.habitat ?? ""} onChange={v => setForm(f => ({ ...f, habitat: v }))} opciones={habitats} placeholder="Bosque, océano, volcán…" />
                    <SelectorTexto label="Pensamiento" value={form.pensamiento ?? ""} onChange={v => setForm(f => ({ ...f, pensamiento: v }))} opciones={pensamientos} placeholder="¿Cómo piensa?" />
                    <SelectorTexto label="Alma" value={form.alma ?? ""} onChange={v => setForm(f => ({ ...f, alma: v }))} opciones={almas} placeholder="Naturaleza espiritual…" />
                  </div>
                  {/* Ítems que crea — con selector de origen */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/30 flex items-center gap-1">
                      <Wrench size={9} /> Ítems que crea
                    </label>
                    <BloqueItemsCraftedos criaturaId={form.id} onSelectItem={onSelectItem} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
                    <MarkdownEditor value={form.descripcion ?? ""} onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                      placeholder="Aspecto físico general…" rows={5} toolbar defaultMode="edit"                       onSnippetAction={onSnippetAction}
                      entities={entities}
                      />
                  </div>
                </div>

                {/* Columna derecha: Catálogo Mágico */}
                <div className="sm:shrink-0 sm:w-64 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Catálogo Mágico</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25">Hechizos</p>
                      <BloqueHechizos personajeId={form.id} especie={form.nombre} varianteId={null} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25">Dones</p>
                      <BloqueDones personajeId={form.id} especie={form.nombre} varianteId={null} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Variantes */}
              <div className="space-y-3">
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
                      className="bg-primary text-btn-text px-3 py-2 rounded-lg font-black hover:bg-primary/90 transition-all disabled:opacity-40">
                      <Check size={13} />
                    </button>
                    <button onClick={() => setAddingVariante(false)}
                      className="px-2.5 py-2 rounded-lg text-primary/40 hover:text-primary transition-all">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingVariante(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all tracking-widest">
                    <Plus size={11} /> Añadir Variante
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ESPECIE */}
          {tab === "especie" && (
            <div className="p-4">
              <PanelPersonajes
                personajes={personajes}
                loading={loadingPersonajes}
                setPersonajes={setPersonajes}
                titulo="De esta especie"
                inline
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}