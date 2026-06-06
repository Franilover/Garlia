"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin, Save, Trash2, ScrollText, Mountain, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./components/types";
import { SelectorImagen, SaveIndicator } from "./components/UIComponents";
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

type ReinoMin = { id: string; nombre: string; logo_url?: string | null };

// ─── Tipos de lugar predefinidos ──────────────────────────────────────────────
const TIPOS_LUGAR = [
  "Bosque", "Montaña", "Caverna", "Lago", "Río", "Isla",
  "Desierto", "Pantano", "Llanura", "Volcán", "Costa", "Valle",
  "Ruinas", "Templo", "Torre", "Santuario", "Paso", "Abismo",
];

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
  onNavigateReino,
}: {
  form: Lugar;
  setForm: React.Dispatch<React.SetStateAction<Lugar>>;
  status: SaveStatus;
  onSave: () => void;
  onDelete: () => void;
  entities?: WikiEntity[];
  onNavigateReino?: (id: string) => void;
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

        </div>
      </div>
    </div>
  );
}

// ─── EditorLugar ──────────────────────────────────────────────────────────────
export function EditorLugar({
  item, onSaved, onDeleted, entities = [],
  onNavigateReino,
}: {
  item: Lugar;
  onSaved:   (l: Lugar) => void;
  onDeleted: (id: string) => void;
  entities?: WikiEntity[];
  onNavigateReino?: (id: string) => void;
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
        onNavigateReino={onNavigateReino}
      />
    </>
  );
}
