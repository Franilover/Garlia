"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin, Save, Trash2, ScrollText, Mountain, Loader2,
  Leaf, Gem, Plus, X, Package,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./components/types";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
import { ComboSelector } from "@/components/ui/ComboSelector";
import { SeccionEntidad } from "@/components/ui/SeccionEntidad";
import { MarkdownEditor, WikiEntity } from "../../../forms/MarkdownEditor";
import { useWikilink } from "./components/WikilinkContext";

// ─── Dexie helpers ────────────────────────────────────────────────────────────
async function dexiePut(tabla: string, row: any): Promise<void> {
  try { if (db) await (db as any)[tabla]?.put(row); } catch {}
}
async function dexieDel(tabla: string, id: string): Promise<void> {
  try { if (db) await (db as any)[tabla]?.delete(id); } catch {}
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type Lugar = {
  id: string;
  nombre: string;
  tipo?: string | null;
  descripcion?: string | null;
  historia?: string | null;
  secretos?: string | null;
  imagen_url?: string | null;
  reino_id?: string | null;
};

type ReinoMin    = { id: string; nombre: string; logo_url?: string | null };
type PlantaMin   = { id: string; nombre: string; imagen_url?: string | null };
type MineralMin  = { id: string; nombre: string; imagen_url?: string | null };

// ─── Tipos de lugar predefinidos ──────────────────────────────────────────────
const TIPOS_LUGAR = [
  "Bosque", "Montaña", "Caverna", "Lago", "Río", "Isla",
  "Desierto", "Pantano", "Llanura", "Volcán", "Costa", "Valle",
  "Ruinas", "Templo", "Torre", "Santuario", "Paso", "Abismo",
];

// ─── Hook: plantas vinculadas al lugar ───────────────────────────────────────
function usePlantasDelLugar(lugarId: string) {
  const [plantas, setPlantas] = useState<PlantaMin[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (db) {
        const all: any[] = await (db as any).plantas?.toArray() ?? [];
        const local = all.filter((p: any) => p.lugar_id === lugarId && !p.deleted);
        if (local.length) { setPlantas(local); setLoading(false); if (!navigator.onLine) return; }
      }
    } catch {}
    if (!navigator.onLine) { setLoading(false); return; }
    const { data } = await supabase.from("plantas").select("id, nombre, imagen_url").eq("lugar_id", lugarId).order("nombre");
    setPlantas(data ?? []);
    setLoading(false);
  }, [lugarId]);
  useEffect(() => { load(); }, [load]);
  return { plantas, loading, reload: load };
}

// ─── Hook: minerales vinculados al lugar ──────────────────────────────────────
function useMineralesDelLugar(lugarId: string) {
  const [minerales, setMinerales] = useState<MineralMin[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (db) {
        const all: any[] = await (db as any).minerales?.toArray() ?? [];
        const local = all.filter((m: any) => m.lugar_id === lugarId && !m.deleted);
        if (local.length) { setMinerales(local); setLoading(false); if (!navigator.onLine) return; }
      }
    } catch {}
    if (!navigator.onLine) { setLoading(false); return; }
    const { data } = await supabase.from("minerales").select("id, nombre, imagen_url").eq("lugar_id", lugarId).order("nombre");
    setMinerales(data ?? []);
    setLoading(false);
  }, [lugarId]);
  useEffect(() => { load(); }, [load]);
  return { minerales, loading, reload: load };
}

// ─── Hook: todas las plantas (para búsqueda) ──────────────────────────────────
function useTodasPlantas() {
  const [todas, setTodas] = useState<PlantaMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).plantas?.toArray() ?? [];
          if (local.length) { setTodas(local.filter((p: any) => !p.deleted).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("plantas").select("id, nombre, imagen_url").order("nombre");
      if (data) setTodas(data);
    };
    run();
  }, []);
  return todas;
}

// ─── Hook: todos los minerales (para búsqueda) ────────────────────────────────
function useTodosMinerales() {
  const [todos, setTodos] = useState<MineralMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).minerales?.toArray() ?? [];
          if (local.length) { setTodos(local.filter((m: any) => !m.deleted).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("minerales").select("id, nombre, imagen_url").order("nombre");
      if (data) setTodos(data);
    };
    run();
  }, []);
  return todos;
}

// ─── BloqueEntidades ──────────────────────────────────────────────────────────
function BloqueEntidades<T extends { id: string; nombre: string }>({
  Icon, items, loading, onSelect, renderThumb,
  emptyText, allItems, onAdd, addingId, onRemove, removingId,
}: {
  Icon: React.ElementType;
  items: T[];
  loading: boolean;
  onSelect?: (id: string) => void;
  renderThumb: (item: T) => React.ReactNode;
  emptyText: string;
  allItems: T[];
  onAdd: (item: T) => void;
  addingId?: string | null;
  onRemove: (id: string) => void;
  removingId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef  = React.useRef<HTMLDivElement>(null);

  const linkedIds = new Set(items.map(i => i.id));
  const suggestions = query.trim().length > 0
    ? allItems.filter(i => !linkedIds.has(i.id) && i.nombre.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current && !listRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all"
          style={{
            background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
            borderColor: open
              ? "color-mix(in srgb, var(--primary) 30%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
          }}
        >
          <Plus size={9} className="text-primary/30 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar y añadir…"
            className="flex-1 min-w-0 bg-transparent text-[11px] font-medium text-primary/70 placeholder:text-primary/25 outline-none"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setOpen(false); inputRef.current?.blur(); }}>
              <X size={9} className="text-primary/30 hover:text-primary/60 transition-colors" />
            </button>
          )}
        </div>

        {open && suggestions.length > 0 && (
          <div
            ref={listRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border overflow-hidden shadow-lg"
            style={{
              background:  "color-mix(in srgb, var(--background) 98%, var(--primary) 2%)",
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            {suggestions.map(s => (
              <button
                key={s.id}
                type="button"
                disabled={addingId === s.id}
                onClick={() => { onAdd(s); setQuery(""); setOpen(false); }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                <div className="w-5 h-5 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                  {renderThumb(s)}
                </div>
                <span className="text-[11px] font-semibold text-primary/70 truncate flex-1">{s.nombre}</span>
                {addingId === s.id
                  ? <Loader2 size={9} className="animate-spin text-primary/30 shrink-0" />
                  : <Plus size={9} className="text-primary/30 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {open && query.trim().length > 0 && suggestions.length === 0 && (
          <div
            ref={listRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 rounded-xl border px-3 py-2"
            style={{
              background:  "color-mix(in srgb, var(--background) 98%, var(--primary) 2%)",
              borderColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
            }}
          >
            <p className="text-[10px] text-primary/30 italic">Sin resultados</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={14} className="animate-spin text-primary/20" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest text-center py-3 italic">
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <div
              key={item.id}
              className="group flex items-center gap-0 rounded-xl border overflow-hidden transition-all"
              style={{
                background:  "color-mix(in srgb, var(--primary) 4%, transparent)",
                borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
              }}
            >
              <button
                type="button"
                onClick={() => onSelect?.(item.id)}
                disabled={!onSelect}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 transition-all hover:bg-primary/5 disabled:cursor-default cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
                  {renderThumb(item)}
                </div>
                <span className="text-[11px] font-bold text-primary/70 truncate max-w-[110px]">{item.nombre}</span>
              </button>
              <button
                type="button"
                disabled={removingId === item.id}
                onClick={() => onRemove(item.id)}
                className="flex items-center justify-center w-5 h-full pr-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary/30 hover:text-red-400 disabled:cursor-not-allowed"
                title="Quitar del lugar"
              >
                {removingId === item.id
                  ? <Loader2 size={9} className="animate-spin" />
                  : <X size={9} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hook: reinos ─────────────────────────────────────────────────────────────
function useReinos() {
  const [reinos, setReinos] = useState<ReinoMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).reinos?.toArray() ?? [];
          if (local.length) { setReinos(local); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase
        .from("reinos")
        .select("id, nombre, logo_url")
        .order("nombre");
      if (data) setReinos(data);
    };
    run();
  }, []);
  return reinos;
}

// ─── FormularioLugar ──────────────────────────────────────────────────────────
export function FormularioLugar({
  form, setForm, status, onSave, onDelete, entities = [],
  onNavigateReino, onSelectPlanta, onSelectMineral,
  plantas, loadingPlantas, todasPlantas, addingPlanta, removingPlanta, onAddPlanta, onRemovePlanta,
  minerales, loadingMinerales, todosMinerales, addingMineral, removingMineral, onAddMineral, onRemoveMineral,
}: {
  form: Lugar;
  setForm: React.Dispatch<React.SetStateAction<Lugar>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  entities?: WikiEntity[];
  onNavigateReino?: (id: string) => void;
  onSelectPlanta?: (id: string) => void;
  onSelectMineral?: (id: string) => void;
  plantas: PlantaMin[];
  loadingPlantas: boolean;
  todasPlantas: PlantaMin[];
  addingPlanta: string | null;
  removingPlanta: string | null;
  onAddPlanta: (p: PlantaMin) => void;
  onRemovePlanta: (id: string) => void;
  minerales: MineralMin[];
  loadingMinerales: boolean;
  todosMinerales: MineralMin[];
  addingMineral: string | null;
  removingMineral: string | null;
  onAddMineral: (m: MineralMin) => void;
  onRemoveMineral: (id: string) => void;
}) {
  const reinos = useReinos();
  const { onSnippetAction } = useWikilink();

  const reinoActual = reinos.find(r => r.id === form.reino_id);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* ── Header fijo ───────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        {/* Thumbnail */}
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.imagen_url
            ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <MapPin size={16} className="text-primary/25" />}
        </div>

        {/* Nombre editable */}
        <input
          value={form.nombre ?? ""}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder="Nombre del lugar"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        />

        {/* Acciones */}
        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer"
          >
            <Trash2 size={10} />
          </button>
          <button
            onClick={onSave}
            disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {status === "saving"
              ? <Loader2 size={11} className="animate-spin" />
              : <Save size={11} />}
            Guardar
          </button>
        </div>
      </div>

      {/* ── Cuerpo scrolleable ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-5">

          {/* Fila superior: imagen + datos básicos */}
          <div className="flex flex-col sm:flex-row gap-5">

            {/* Columna izquierda: imagen */}
            <div className="shrink-0 sm:w-52 w-full max-w-xs mx-auto sm:mx-0">
              <SelectorImagen
                label="Ilustración"
                value={form.imagen_url ?? ""}
                onChange={url => setForm(f => ({ ...f, imagen_url: url }))}
                aspect="square"
                placeholder={<MapPin size={20} className="opacity-20" />}
              />
            </div>

            {/* Columna central: tipo + reino + descripción */}
            <div className="flex-1 min-w-0 space-y-3">

              {/* Tipo + Reino en fila */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ComboSelector
                  mode="single"
                  label="Tipo"
                  placeholder="Bosque, montaña, ruinas…"
                  items={TIPOS_LUGAR.map(t => ({ id: t, label: t }))}
                  value={form.tipo ?? null}
                  onChange={v => setForm(f => ({ ...f, tipo: v }))}
                  allowNone
                  noneLabel="Sin tipo"
                />
                <ComboSelector
                  mode="single"
                  label="Reino"
                  placeholder="Lugar independiente…"
                  items={reinos.map(r => ({
                    id:     r.id,
                    label:  r.nombre,
                    imgUrl: r.logo_url ?? null,
                  }))}
                  value={form.reino_id ?? null}
                  onChange={id => setForm(f => ({ ...f, reino_id: id }))}
                  allowNone
                  noneLabel="Sin reino"
                  onNavigate={onNavigateReino && reinoActual ? () => onNavigateReino(reinoActual.id) : undefined}
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">
                  Descripción
                </label>
                <MarkdownEditor
                  value={form.descripcion ?? ""}
                  onChange={v => setForm(f => ({ ...f, descripcion: v }))}
                  placeholder="Aspecto, atmósfera, primeras impresiones…"
                  rows={6}
                  toolbar
                  defaultMode="edit"
                  onSnippetAction={onSnippetAction}
                  entities={entities}
                />
              </div>
            </div>
          </div>

          {/* Historia + Secretos en fila */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                <ScrollText size={9} /> Historia
              </label>
              <MarkdownEditor
                value={form.historia ?? ""}
                onChange={v => setForm(f => ({ ...f, historia: v }))}
                placeholder="Origen, leyendas, eventos que marcaron este lugar…"
                rows={8}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
                <Mountain size={9} /> Secretos
              </label>
              <MarkdownEditor
                value={form.secretos ?? ""}
                onChange={v => setForm(f => ({ ...f, secretos: v }))}
                placeholder="Lo que pocos saben, peligros ocultos, poderes ancestrales…"
                rows={8}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            </div>
          </div>

          {/* Plantas + Minerales en fila */}
          <div className="flex flex-col sm:flex-row gap-4">

            {/* Plantas */}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
              <SeccionEntidad
                label="Plantas"
                icon={<Leaf size={10} />}
                fallbackIcon={<Leaf size={10} />}
                emptyLabel="Sin plantas en este lugar"
                allEntities={todasPlantas}
                selectedIds={plantas.map(p => p.id)}
                loading={loadingPlantas}
                saving={!!addingPlanta}
                onToggle={(id, add) => add ? onAddPlanta(todasPlantas.find(p => p.id === id)!) : onRemovePlanta(id)}
                onEntityClick={onSelectPlanta}
              />
            </div>

            {/* Minerales */}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
              <SeccionEntidad
                label="Minerales"
                icon={<Gem size={10} />}
                fallbackIcon={<Gem size={10} />}
                emptyLabel="Sin minerales en este lugar"
                allEntities={todosMinerales}
                selectedIds={minerales.map(m => m.id)}
                loading={loadingMinerales}
                saving={!!addingMineral}
                onToggle={(id, add) => add ? onAddMineral(todosMinerales.find(m => m.id === id)!) : onRemoveMineral(id)}
                onEntityClick={onSelectMineral}
              />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

// ─── EditorLugar ──────────────────────────────────────────────────────────────
export function EditorLugar({
  item, onSaved, onDeleted, entities = [],
  onNavigateReino, onSelectPlanta, onSelectMineral,
}: {
  item: Lugar;
  onSaved:   (l: Lugar) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onNavigateReino?: (id: string) => void;
  onSelectPlanta?:  (id: string) => void;
  onSelectMineral?: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Lugar>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

  const { plantas,   loading: loadingPlantas,   reload: reloadPlantas }   = usePlantasDelLugar(item.id);
  const { minerales, loading: loadingMinerales, reload: reloadMinerales } = useMineralesDelLugar(item.id);
  const todasPlantas   = useTodasPlantas();
  const todosMinerales = useTodosMinerales();

  const [addingPlanta,   setAddingPlanta]   = useState<string | null>(null);
  const [addingMineral,  setAddingMineral]  = useState<string | null>(null);
  const [removingPlanta,  setRemovingPlanta]  = useState<string | null>(null);
  const [removingMineral, setRemovingMineral] = useState<string | null>(null);

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase.from("lugares").update({
        nombre:      form.nombre,
        tipo:        form.tipo        || null,
        descripcion: form.descripcion || null,
        historia:    form.historia    || null,
        secretos:    form.secretos    || null,
        imagen_url:  form.imagen_url  || null,
        reino_id:    form.reino_id    || null,
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      void dexiePut("lugares", form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("lugares").delete().eq("id", form.id);
    void dexieDel("lugares", form.id);
    onDeleted(form.id);
  };

  const handleAddPlanta = async (p: PlantaMin) => {
    setAddingPlanta(p.id);
    await supabase.from("plantas").update({ lugar_id: form.id }).eq("id", p.id);
    if (db) try { await (db as any).plantas?.update(p.id, { lugar_id: form.id }); } catch {}
    await reloadPlantas();
    setAddingPlanta(null);
  };

  const handleRemovePlanta = async (id: string) => {
    setRemovingPlanta(id);
    await supabase.from("plantas").update({ lugar_id: null }).eq("id", id);
    if (db) try { await (db as any).plantas?.update(id, { lugar_id: null }); } catch {}
    await reloadPlantas();
    setRemovingPlanta(null);
  };

  const handleAddMineral = async (m: MineralMin) => {
    setAddingMineral(m.id);
    await supabase.from("minerales").update({ lugar_id: form.id }).eq("id", m.id);
    if (db) try { await (db as any).minerales?.update(m.id, { lugar_id: form.id }); } catch {}
    await reloadMinerales();
    setAddingMineral(null);
  };

  const handleRemoveMineral = async (id: string) => {
    setRemovingMineral(id);
    await supabase.from("minerales").update({ lugar_id: null }).eq("id", id);
    if (db) try { await (db as any).minerales?.update(id, { lugar_id: null }); } catch {}
    await reloadMinerales();
    setRemovingMineral(null);
  };

  return (
    <>
      <ConfirmModal />
      <FormularioLugar
        form={form}
        setForm={setForm}
        status={status}
        onSave={save}
        onDelete={del}
        entities={entities}
        onNavigateReino={onNavigateReino}
        onSelectPlanta={onSelectPlanta}
        onSelectMineral={onSelectMineral}
        plantas={plantas}
        loadingPlantas={loadingPlantas}
        todasPlantas={todasPlantas}
        addingPlanta={addingPlanta}
        removingPlanta={removingPlanta}
        onAddPlanta={handleAddPlanta}
        onRemovePlanta={handleRemovePlanta}
        minerales={minerales}
        loadingMinerales={loadingMinerales}
        todosMinerales={todosMinerales}
        addingMineral={addingMineral}
        removingMineral={removingMineral}
        onAddMineral={handleAddMineral}
        onRemoveMineral={handleRemoveMineral}
      />
    </>
  );
}