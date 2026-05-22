"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin, Save, Trash2, Crown, Users, Bug, Package,
  Loader2, Plus, X, Mountain, ScrollText,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "../editorEntidades/types";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "../editorEntidades/UIComponents";
import { MarkdownEditor, WikiEntity } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";

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
  return { personajes, loading };
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
  return { criaturas, loading };
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
  return { items, loading };
}

// ─── Tipos de lugar predefinidos ──────────────────────────────────────────────
const TIPOS_LUGAR = [
  "Ciudad", "Aldea", "Fortaleza", "Castillo", "Torre", "Ruinas",
  "Bosque", "Montaña", "Caverna", "Isla", "Desierto", "Pantano",
  "Templo", "Mazmorra", "Puerto", "Mercado", "Taberna", "Biblioteca",
];

// ─── Bloque de entidades relacionadas (personajes/criaturas/ítems) ────────────
function BloqueEntidades<T extends { id: string; nombre: string }>({
  label, Icon, items, loading, onSelect, renderThumb,
  emptyText,
}: {
  label: string;
  Icon: React.ElementType;
  items: T[];
  loading: boolean;
  onSelect?: (id: string) => void;
  renderThumb: (item: T) => React.ReactNode;
  emptyText: string;
}) {
  if (loading) return (
    <div className="flex justify-center py-4">
      <Loader2 size={14} className="animate-spin text-primary/20" />
    </div>
  );
  if (!items.length) return (
    <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest text-center py-3 italic">
      {emptyText}
    </p>
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect?.(item.id)}
          disabled={!onSelect}
          className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border transition-all hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-default cursor-pointer"
          style={{
            background:   "color-mix(in srgb, var(--primary) 4%, transparent)",
            borderColor:  "color-mix(in srgb, var(--primary) 12%, transparent)",
          }}
        >
          <div className="w-6 h-6 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 shrink-0 flex items-center justify-center">
            {renderThumb(item)}
          </div>
          <span className="text-[11px] font-bold text-primary/70 truncate max-w-[110px]">{item.nombre}</span>
        </button>
      ))}
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
  const { personajes, loading: loadingP } = usePersonajesDelLugar(form.id);
  const { criaturas,  loading: loadingC } = useCriaturasDeLugar(form.id);
  const { items,      loading: loadingI } = useItemsDelLugar(form.id);
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
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Reino</label>
                  <div className="relative">
                    <select
                      value={form.reino_id ?? ""}
                      onChange={e => setForm(f => ({ ...f, reino_id: e.target.value || null }))}
                      className="w-full appearance-none bg-primary/4 border border-primary/10 rounded-xl px-3 py-2 text-[11px] font-medium text-primary outline-none focus:border-primary/25 pr-8 cursor-pointer"
                    >
                      <option value="">Sin reino</option>
                      {reinos.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                    <Crown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary/25 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Badge de reino actual */}
              {reinoActual && (
                <div className="flex items-center gap-1.5">
                  <Crown size={9} className="text-primary/30" />
                  {onNavigateReino ? (
                    <button
                      type="button"
                      onClick={() => onNavigateReino(reinoActual.id)}
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-colors underline-offset-2 hover:underline cursor-pointer"
                    >
                      {reinoActual.nombre}
                    </button>
                  ) : (
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40">
                    {reinoActual.nombre}
                  </span>
                  )}
                </div>
              )}

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
                  label="Personajes"
                  Icon={Users}
                  items={personajes}
                  loading={loadingP}
                  onSelect={onSelectPersonaje}
                  emptyText="Sin personajes en este lugar"
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
                  label="Criaturas"
                  Icon={Bug}
                  items={criaturas}
                  loading={loadingC}
                  onSelect={onSelectCriatura}
                  emptyText="Sin criaturas en este lugar"
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
                  label="Ítems"
                  Icon={Package}
                  items={items}
                  loading={loadingI}
                  onSelect={onSelectItem}
                  emptyText="Sin ítems en este lugar"
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