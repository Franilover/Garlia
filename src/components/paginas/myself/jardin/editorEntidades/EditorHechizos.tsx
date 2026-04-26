"use client";

/**
 * EditorHechizos.tsx
 * ─────────────────────────────────────────────────────────────────────
 * Editor completo para las tablas `hechizos` y `dones`.
 * Incluye lista lateral + formulario de edición con nombre, explicación
 * y campo "quien" (quienes pueden usarlo, una palabra).
 *
 * Uso:
 *   import { EditorHechizos } from "./editorEntidades/EditorHechizos";
 *   <EditorHechizos modo="hechizos" />
 *   <EditorHechizos modo="dones" />
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Star, Plus, Trash2, Save, Loader2, Search, X, Users,
} from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import { INPUT_CLS } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Hechizo = {
  id: string;
  nombre: string;
  explicacion?: string;
  quien?: string;
};

export type Don = {
  id: string;
  nombre: string;
  explicacion?: string;
  quien?: string;
};

type EntidadMagica = Hechizo | Don;
type Modo = "hechizos" | "dones";

const CONFIG: Record<Modo, { tabla: string; label: string; labelSing: string; Icon: React.ElementType; color: string; emoji: string; placeholder: string }> = {
  hechizos: {
    tabla:       "hechizos",
    label:       "Hechizos",
    labelSing:   "Hechizo",
    Icon:        Sparkles,
    color:       "oklch(0.65 0.18 290)",   // violeta
    emoji:       "✨",
    placeholder: "Qué hace este hechizo, cómo se lanza, sus efectos…",
  },
  dones: {
    tabla:       "dones",
    label:       "Dones",
    labelSing:   "Don",
    Icon:        Star,
    color:       "oklch(0.7 0.16 55)",    // dorado
    emoji:       "⭐",
    placeholder: "Qué otorga este don, su origen, sus limitaciones…",
  },
};

// ─── Hook de carga ────────────────────────────────────────────────────────────
function useEntidadesMagicas(modo: Modo) {
  const [items,   setItems]   = useState<EntidadMagica[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from(CONFIG[modo].tabla)
      .select("*")
      .order("nombre");
    setItems(data ?? []);
    setLoading(false);
  }, [modo]);

  useEffect(() => { load(); }, [load]);

  return { items, setItems, loading, refetch: load };
}

// ─── Formulario de edición ────────────────────────────────────────────────────
function FormularioMagico({
  item,
  modo,
  onSaved,
  onDeleted,
}: {
  item: EntidadMagica;
  modo: Modo;
  onSaved:   (i: EntidadMagica) => void;
  onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<EntidadMagica>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();
  const cfg = CONFIG[modo];

  useEffect(() => { setForm(item); setStatus("idle"); }, [item.id]);

  const save = async () => {
    setStatus("saving");
    try {
      const { error } = await supabase
        .from(cfg.tabla)
        .update({
          nombre:      form.nombre,
          explicacion: form.explicacion || null,
          quien:       form.quien?.trim() || null,
        })
        .eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from(cfg.tabla).delete().eq("id", form.id);
    onDeleted(form.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <ConfirmModal />

      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background:  "color-mix(in srgb, var(--primary) 3%, transparent)",
        }}
      >
        <div
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border"
          style={{
            background:   `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
            borderColor:  `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
          }}
        >
          <cfg.Icon size={16} style={{ color: cfg.color }} />
        </div>

        {/* Nombre inline editable */}
        <input
          value={form.nombre ?? ""}
          onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
          placeholder={`Nombre del ${cfg.labelSing.toLowerCase()}…`}
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        />

        <div className="shrink-0 flex items-center gap-2">
          <SaveIndicator status={status} />
          <button
            onClick={del}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all"
          >
            <Trash2 size={10} />
          </button>
          <button
            onClick={save}
            disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save size={11} /> Guardar
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">

        {/* Quien puede usarlo */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35 flex items-center gap-1.5">
            <Users size={9} /> Quién puede usarlo
          </label>
          <div className="relative">
            <input
              value={form.quien ?? ""}
              onChange={e => setForm(f => ({ ...f, quien: e.target.value }))}
              placeholder="Ej: Magos · Todos · Elfos · Elegidos…"
              className={INPUT_CLS}
              maxLength={40}
            />
            {form.quien && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[9px] font-black"
                style={{
                  background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                  color:       cfg.color,
                }}
              >
                {form.quien}
              </span>
            )}
          </div>
          <p className="text-[9px] text-primary/25 italic">Una sola palabra o etiqueta corta</p>
        </div>

        {/* Explicación */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/35">
            Explicación
          </label>
          <MarkdownEditor
            value={form.explicacion ?? ""}
            onChange={v => setForm(f => ({ ...f, explicacion: v }))}
            rows={14}
            placeholder={cfg.placeholder}
            toolbar
            defaultMode="edit"
          />
        </div>
      </div>
    </div>
  );
}

// ─── EditorHechizos (componente principal) ────────────────────────────────────
export function EditorHechizos({ modo }: { modo: Modo }) {
  const cfg = CONFIG[modo];
  const { items, setItems, loading, refetch } = useEntidadesMagicas(modo);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [creating,   setCreating]   = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;

  const filtered = items.filter(i =>
    i.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (i.quien ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from(cfg.tabla)
        .insert([{ nombre: `Nuevo ${cfg.labelSing}` }])
        .select()
        .single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      setSelectedId(data.id);
    } finally {
      setCreating(false);
    }
  };

  const handleSaved = (updated: EntidadMagica) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDeleted = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">

      {/* ── Lista lateral ───────────────────────────────────────────── */}
      <div
        className="w-56 shrink-0 flex flex-col border-r min-h-0"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {/* Header lista */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
        >
          <cfg.Icon size={12} style={{ color: cfg.color }} />
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-primary/50">
            {cfg.label}
          </span>
          <button
            onClick={handleCreate}
            disabled={creating}
            title={`Nuevo ${cfg.labelSing}`}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all border border-primary/10 text-primary/30 hover:text-primary hover:border-primary/30 hover:bg-primary/8"
          >
            {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
          </button>
        </div>

        {/* Buscador */}
        <div className="shrink-0 px-2 pt-2">
          <div className="relative">
            <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full bg-primary/4 border border-primary/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary">
                <X size={9} />
              </button>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={16} className="animate-spin text-primary/20" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-8 italic">
              {search ? "Sin resultados" : `Sin ${cfg.label.toLowerCase()} aún`}
            </p>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                  selectedId === item.id
                    ? "border-primary/20 bg-primary/10"
                    : "border-transparent hover:bg-primary/6 hover:border-primary/10"
                }`}
              >
                <p className={`text-[11px] font-bold truncate ${selectedId === item.id ? "text-primary" : "text-primary/70"}`}>
                  {cfg.emoji} {item.nombre}
                </p>
                {item.quien && (
                  <span
                    className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase"
                    style={{
                      background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
                      color:       cfg.color,
                    }}
                  >
                    {item.quien}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Editor principal ─────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {selected ? (
          <FormularioMagico
            key={selected.id}
            item={selected}
            modo={modo}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-primary/15 select-none">
            <cfg.Icon size={40} strokeWidth={1} style={{ color: cfg.color, opacity: 0.2 }} />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/25">{cfg.label}</p>
            <p className="text-[10px] text-primary/20 tracking-widest">
              Seleccioná un {cfg.labelSing.toLowerCase()} o creá uno nuevo
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all mt-2"
            >
              {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
              Nuevo {cfg.labelSing}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}