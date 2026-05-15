"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, Save, Trash2, Bug, Loader2, Leaf, Wrench, ChevronDown, X, Plus } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Item, type SaveStatus } from "./types";
import { useUniqueValues } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";


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

// ─── Panel selector de criaturas creadoras ────────────────────────────────────

function PanelCrafterSources({ itemId, onSelectCriatura }: { itemId: string; onSelectCriatura?: (criaturaId: string) => void }) {
  const { crafters, loading, add, remove } = useCrafterSources(itemId);
  const [allCriaturas, setAllCriaturas] = useState<{ id: string; nombre: string; imagen_url?: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre")
      .then(({ data }) => setAllCriaturas(data ?? []));
  }, []);

  const filtered = allCriaturas.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) &&
    !crafters.some(cr => cr.criaturaId === c.id)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 size={13} className="animate-spin text-primary/20" />
        <span className="text-[10px] text-primary/25 italic">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {crafters.length === 0 && (
        <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-4 border border-dashed border-primary/10 rounded-xl italic">
          Ninguna criatura asignada todavía
        </p>
      )}
      {crafters.length > 0 && (
        <div className="space-y-1">
          {crafters.map(c => (
            <div key={c.crafterId} className="relative group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors"
              style={{ background: "color-mix(in srgb, var(--primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <button
                onClick={() => onSelectCriatura?.(c.criaturaId)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              >
                <div className="shrink-0 w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                  {c.criaturaImg
                    ? <img src={c.criaturaImg} alt={c.criaturaName} className="w-full h-full object-cover" />
                    : <Bug size={10} className="text-primary/20" />}
                </div>
                <span className="flex-1 text-[11px] font-bold text-primary/70 truncate hover:text-primary transition-colors">{c.criaturaName}</span>
              </button>
              <button onClick={() => remove(c.crafterId)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-all p-1 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/8">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
          <Plus size={10} /> Añadir criatura
          <ChevronDown size={10} className="ml-auto" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
        </button>
        {open && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl shadow-xl overflow-hidden"
            style={{ background: "var(--bg-main)", border: "1px solid color-mix(in srgb, var(--primary) 15%, transparent)" }}>
            <div className="p-2 border-b" style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar criatura…"
                className="w-full bg-transparent text-[11px] text-primary outline-none placeholder:text-primary/30 px-2 py-1" />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-[10px] text-primary/25 italic text-center py-4">Sin resultados</p>
              )}
              {filtered.map(c => (
                <button key={c.id} onClick={() => { add(c); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/5 transition-colors text-left">
                  <div className="shrink-0 w-6 h-6 rounded-md overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                    {c.imagen_url
                      ? <img src={c.imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                      : <Bug size={9} className="text-primary/20" />}
                  </div>
                  <span className="text-[11px] font-bold text-primary/70 truncate">{c.nombre}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EditorItem ───────────────────────────────────────────────────────────────

export function EditorItem({
  item, onSaved, onDeleted, entities = [], onSelectCriatura,
}: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void; entities?: WikiEntity[];
  onSelectCriatura?: (criaturaId: string) => void;
}) {
  const [form,     setForm]     = useState<Item>(item);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const { onSnippetAction } = useWikilink();
  const categorias = useUniqueValues("items", "categoria");

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
                <SelectorTexto label="Categoría" value={form.categoria ?? ""}
                  onChange={v => setForm(f => ({ ...f, categoria: v }))} opciones={categorias}
                  placeholder="Arma, reliquia, objeto…" />

                {/* Origen: Natural / Artificial */}
                <div className="space-y-2">
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