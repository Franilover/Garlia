"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, Save, Trash2, Users, Bug, Package,
  Loader2, Plus, X, Mountain, ScrollText,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "../components/types";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "../components/UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../components/WikilinkContext";

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
  coord_x?: number | null;
  coord_y?: number | null;
  oculto?: boolean;
};

type ReinoMin   = { id: string; nombre: string };
type PersonajeMin = { id: string; nombre: string; img_url?: string | null };
type CriaturaMin  = { id: string; nombre: string; imagen_url?: string | null };
type ItemMin      = { id: string; nombre: string; imagen_url?: string | null };

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
      const { data } = await supabase.from("reinos").select("id, nombre").order("nombre");
      if (data) setReinos(data);
    };
    run();
  }, []);
  return reinos;
}

// ─── Hook: personajes vinculados al lugar ─────────────────────────────────────
function usePersonajesDelLugar(lugarId: string) {
  const [personajes, setPersonajes] = useState<PersonajeMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (db) {
        const all: any[] = await (db as any).personajes?.toArray() ?? [];
        const local = all.filter((p: any) => p.lugar_id === lugarId && !p.deleted);
        if (local.length) { setPersonajes(local); setLoading(false); if (!navigator.onLine) return; }
      }
    } catch {}
    if (!navigator.onLine) { setLoading(false); return; }
    const { data } = await supabase
      .from("personajes")
      .select("id, nombre, img_url")
      .eq("lugar_id", lugarId)
      .order("nombre");
    setPersonajes(data ?? []);
    setLoading(false);
  }, [lugarId]);

  useEffect(() => { load(); }, [load]);
  return { personajes, loading, reload: load };
}

// ─── Hook: criaturas del lugar ────────────────────────────────────────────────
function useCriaturasDeLugar(lugarId: string) {
  const [criaturas, setCriaturas] = useState<CriaturaMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (db) {
        const all: any[] = await (db as any).criaturas?.toArray() ?? [];
        const local = all.filter((c: any) => c.lugar_id === lugarId && !c.deleted);
        if (local.length) { setCriaturas(local); setLoading(false); if (!navigator.onLine) return; }
      }
    } catch {}
    if (!navigator.onLine) { setLoading(false); return; }
    const { data } = await supabase
      .from("criaturas")
      .select("id, nombre, imagen_url")
      .eq("lugar_id", lugarId)
      .order("nombre");
    setCriaturas(data ?? []);
    setLoading(false);
  }, [lugarId]);

  useEffect(() => { load(); }, [load]);
  return { criaturas, loading, reload: load };
}

// ─── Hook: ítems del lugar ────────────────────────────────────────────────────
function useItemsDelLugar(lugarId: string) {
  const [items, setItems] = useState<ItemMin[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (db) {
        const all: any[] = await (db as any).items?.toArray() ?? [];
        const local = all.filter((i: any) => i.lugar_id === lugarId && !i.deleted);
        if (local.length) { setItems(local); setLoading(false); if (!navigator.onLine) return; }
      }
    } catch {}
    if (!navigator.onLine) { setLoading(false); return; }
    const { data } = await supabase
      .from("items")
      .select("id, nombre, imagen_url")
      .eq("lugar_id", lugarId)
      .order("nombre");
    setItems(data ?? []);
    setLoading(false);
  }, [lugarId]);

  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

// ─── Hook: todos los personajes (para búsqueda) ───────────────────────────────
function useTodosPersonajes() {
  const [todos, setTodos] = useState<PersonajeMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).personajes?.toArray() ?? [];
          if (local.length) { setTodos(local.filter((p: any) => !p.deleted).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("personajes").select("id, nombre, img_url").order("nombre");
      if (data) setTodos(data);
    };
    run();
  }, []);
  return todos;
}

// ─── Hook: todas las criaturas (para búsqueda) ────────────────────────────────
function useTodasCriaturas() {
  const [todas, setTodas] = useState<CriaturaMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).criaturas?.toArray() ?? [];
          if (local.length) { setTodas(local.filter((c: any) => !c.deleted).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("criaturas").select("id, nombre, imagen_url").order("nombre");
      if (data) setTodas(data);
    };
    run();
  }, []);
  return todas;
}

// ─── Hook: todos los ítems (para búsqueda) ────────────────────────────────────
function useTodosItems() {
  const [todos, setTodos] = useState<ItemMin[]>([]);
  useEffect(() => {
    const run = async () => {
      try {
        if (db) {
          const local: any[] = await (db as any).items?.toArray() ?? [];
          if (local.length) { setTodos(local.filter((i: any) => !i.deleted).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))); if (!navigator.onLine) return; }
        }
      } catch {}
      if (!navigator.onLine) return;
      const { data } = await supabase.from("items").select("id, nombre, imagen_url").order("nombre");
      if (data) setTodos(data);
    };
    run();
  }, []);
  return todos;
}

// ─── Tipos de lugar predefinidos ──────────────────────────────────────────────
const TIPOS_LUGAR = [
  "Ciudad", "Aldea", "Fortaleza", "Castillo", "Torre", "Ruinas",
  "Bosque", "Montaña", "Caverna", "Isla", "Desierto", "Pantano",
  "Templo", "Mazmorra", "Puerto", "Mercado", "Taberna", "Biblioteca",
];

// ─── Bloque de entidades relacionadas (personajes/criaturas/ítems) ────────────
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const linkedIds = new Set(items.map(i => i.id));

  const suggestions = query.trim().length > 0
    ? allItems.filter(i =>
        !linkedIds.has(i.id) &&
        i.nombre.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  // Cerrar dropdown al hacer click fuera
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
      {/* Buscador */}
      <div className="relative">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all"
          style={{
            background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
            borderColor: open
              ? "color-mix(in srgb, var(--primary) 30%, transparent)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
          }}>
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

        {/* Dropdown */}
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

        {/* Sin resultados */}
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

      {/* Lista vinculada */}
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

// ─── FormularioLugar ──────────────────────────────────────────────────────────
export function FormularioLugar({
  form, setForm, status, onSave, onDelete, entities = [],
  onSelectPersonaje, onSelectCriatura, onSelectItem, onNavigateReino,
}: {
  form: Lugar;
  setForm: React.Dispatch<React.SetStateAction<Lugar>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  entities?: WikiEntity[];
  onSelectPersonaje?: (id: string) => void;
  onSelectCriatura?:  (id: string) => void;
  onSelectItem?:      (id: string) => void;
  onNavigateReino?:   (id: string) => void;
}) {
  const reinos = useReinos();
  const { personajes, loading: loadingP, reload: reloadP } = usePersonajesDelLugar(form.id);
  const { criaturas,  loading: loadingC, reload: reloadC } = useCriaturasDeLugar(form.id);
  const { items,      loading: loadingI, reload: reloadI } = useItemsDelLugar(form.id);
  const todosPersonajes = useTodosPersonajes();
  const todasCriaturas  = useTodasCriaturas();
  const todosItems      = useTodosItems();
  const { onSnippetAction } = useWikilink();

  const [addingP, setAddingP] = useState<string | null>(null);
  const [addingC, setAddingC] = useState<string | null>(null);
  const [addingI, setAddingI] = useState<string | null>(null);
  const [removingP, setRemovingP] = useState<string | null>(null);
  const [removingC, setRemovingC] = useState<string | null>(null);
  const [removingI, setRemovingI] = useState<string | null>(null);

  const reinoActual = reinos.find(r => r.id === form.reino_id);

  const handleAddPersonaje = async (p: PersonajeMin) => {
    setAddingP(p.id);
    await supabase.from("personajes").update({ lugar_id: form.id }).eq("id", p.id);
    if (db) try { await (db as any).personajes?.update(p.id, { lugar_id: form.id }); } catch {}
    await reloadP();
    setAddingP(null);
  };

  const handleAddCriatura = async (c: CriaturaMin) => {
    setAddingC(c.id);
    await supabase.from("criaturas").update({ lugar_id: form.id }).eq("id", c.id);
    if (db) try { await (db as any).criaturas?.update(c.id, { lugar_id: form.id }); } catch {}
    await reloadC();
    setAddingC(null);
  };

  const handleAddItem = async (i: ItemMin) => {
    setAddingI(i.id);
    await supabase.from("items").update({ lugar_id: form.id }).eq("id", i.id);
    if (db) try { await (db as any).items?.update(i.id, { lugar_id: form.id }); } catch {}
    await reloadI();
    setAddingI(null);
  };

  const handleRemovePersonaje = async (id: string) => {
    setRemovingP(id);
    await supabase.from("personajes").update({ lugar_id: null }).eq("id", id);
    if (db) try { await (db as any).personajes?.update(id, { lugar_id: null }); } catch {}
    await reloadP();
    setRemovingP(null);
  };

  const handleRemoveCriatura = async (id: string) => {
    setRemovingC(id);
    await supabase.from("criaturas").update({ lugar_id: null }).eq("id", id);
    if (db) try { await (db as any).criaturas?.update(id, { lugar_id: null }); } catch {}
    await reloadC();
    setRemovingC(null);
  };

  const handleRemoveItem = async (id: string) => {
    setRemovingI(id);
    await supabase.from("items").update({ lugar_id: null }).eq("id", id);
    if (db) try { await (db as any).items?.update(id, { lugar_id: null }); } catch {}
    await reloadI();
    setRemovingI(null);
  };

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
            <Save size={11} /> Guardar
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
                <SelectorTexto
                  label="Tipo"
                  value={form.tipo ?? ""}
                  onChange={v => setForm(f => ({ ...f, tipo: v }))}
                  opciones={TIPOS_LUGAR}
                  placeholder="Ciudad, ruinas, bosque…"
                />
                <SelectorTexto
                  label="Reino"
                  value={reinoActual?.nombre ?? ""}
                  onChange={nombre => {
                    const r = reinos.find(x => x.nombre === nombre);
                    setForm(f => ({ ...f, reino_id: r?.id ?? null }));
                  }}
                  opciones={reinos.map(r => r.nombre)}
                  placeholder="Sin reino asignado…"
                  onNavigate={onNavigateReino ? () => { if (reinoActual) onNavigateReino(reinoActual.id); } : undefined}
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
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
                placeholder="Origen, eventos importantes, eras pasadas…"
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
                placeholder="Lo que pocos saben, pasajes ocultos, maldiciones…"
                rows={8}
                toolbar
                defaultMode="edit"
                onSnippetAction={onSnippetAction}
                entities={entities}
              />
            </div>
          </div>

          {/* Entidades relacionadas */}
          <div className="flex flex-col sm:flex-row gap-4">

            {/* Personajes */}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06]"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <Users size={10} className="text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Personajes</span>
                {personajes.length > 0 && (
                  <span className="ml-auto text-[9px] font-black tabular-nums text-primary/25">{personajes.length}</span>
                )}
              </div>
              <div className="p-3">
                <BloqueEntidades
                  Icon={Users}
                  items={personajes}
                  loading={loadingP}
                  onSelect={onSelectPersonaje}
                  emptyText="Sin personajes en este lugar"
                  allItems={todosPersonajes}
                  onAdd={handleAddPersonaje}
                  addingId={addingP}
                  onRemove={handleRemovePersonaje}
                  removingId={removingP}
                  renderThumb={p => (p as any).img_url
                    ? <img src={(p as any).img_url} alt={p.nombre} className="w-full h-full object-cover" />
                    : <Users size={10} className="text-primary/20" />}
                />
              </div>
            </div>

            {/* Criaturas */}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06]"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <Bug size={10} className="text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Criaturas</span>
                {criaturas.length > 0 && (
                  <span className="ml-auto text-[9px] font-black tabular-nums text-primary/25">{criaturas.length}</span>
                )}
              </div>
              <div className="p-3">
                <BloqueEntidades
                  Icon={Bug}
                  items={criaturas}
                  loading={loadingC}
                  onSelect={onSelectCriatura}
                  emptyText="Sin criaturas en este lugar"
                  allItems={todasCriaturas}
                  onAdd={handleAddCriatura}
                  addingId={addingC}
                  onRemove={handleRemoveCriatura}
                  removingId={removingC}
                  renderThumb={c => (c as any).imagen_url
                    ? <img src={(c as any).imagen_url} alt={c.nombre} className="w-full h-full object-cover" />
                    : <Bug size={10} className="text-primary/20" />}
                />
              </div>
            </div>

            {/* Ítems */}
            <div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-primary/10">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/[0.06]"
                style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}>
                <Package size={10} className="text-primary/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">Ítems</span>
                {items.length > 0 && (
                  <span className="ml-auto text-[9px] font-black tabular-nums text-primary/25">{items.length}</span>
                )}
              </div>
              <div className="p-3">
                <BloqueEntidades
                  Icon={Package}
                  items={items}
                  loading={loadingI}
                  onSelect={onSelectItem}
                  emptyText="Sin ítems en este lugar"
                  allItems={todosItems}
                  onAdd={handleAddItem}
                  addingId={addingI}
                  onRemove={handleRemoveItem}
                  removingId={removingI}
                  renderThumb={i => (i as any).imagen_url
                    ? <img src={(i as any).imagen_url} alt={i.nombre} className="w-full h-full object-cover" />
                    : <Package size={10} className="text-primary/20" />}
                />
              </div>
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
  onSelectPersonaje, onSelectCriatura, onSelectItem, onNavigateReino,
}: {
  item: Lugar;
  onSaved:   (l: Lugar) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onSelectPersonaje?: (id: string) => void;
  onSelectCriatura?:  (id: string) => void;
  onSelectItem?:      (id: string) => void;
  onNavigateReino?:   (id: string) => void;
}) {
  const [form,   setForm]   = useState<Lugar>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

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
        onSelectPersonaje={onSelectPersonaje}
        onSelectCriatura={onSelectCriatura}
        onSelectItem={onSelectItem}
        onNavigateReino={onNavigateReino}
      />
    </>
  );
}