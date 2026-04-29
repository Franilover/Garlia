"use client";

import React, { useState, useEffect } from "react";
import { Package, Save, Trash2, Bug } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Item, type SaveStatus } from "./types";
import { useUniqueValues } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";
import { BloqueDropsFuente } from "./BloqueDropsFuente";

export function EditorItem({
  item, onSaved, onDeleted,
}: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void;
}) {
  const [form,   setForm]   = useState<Item>(item);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const { confirm, ConfirmModal } = useConfirm();

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
      }).eq("id", form.id);
      if (error) throw error;
      setStatus("saved");
      onSaved(form);
      setTimeout(() => setStatus("idle"), 2000);
    } catch { setStatus("error"); }
  };

  const del = async () => {
    const ok = await confirm({ message: `¿Eliminar "${form.nombre}"?`, danger: true });
    if (!ok) return;
    await supabase.from("items").delete().eq("id", form.id);
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
        {/* Thumbnail */}
        <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden border border-primary/15 bg-primary/5 flex items-center justify-center">
          {form.imagen_url
            ? <img src={form.imagen_url} alt={form.nombre} className="w-full h-full object-cover" />
            : <Package size={16} className="text-primary/25" />}
        </div>

        {/* Name inline editable */}
        <input
          value={form.nombre ?? ""}
          onChange={field("nombre")}
          placeholder="Nombre del objeto"
          className="flex-1 min-w-0 bg-transparent text-sm font-black text-primary outline-none placeholder:text-primary/25"
        />

        {/* Actions */}
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
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5">
        {/* Image + categoría */}
        <div className="flex gap-4">
          <div className="shrink-0 w-24">
            <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
              onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
              placeholder={<Package size={20} className="opacity-20" />} />
          </div>
          <div className="flex-1 content-start">
            <SelectorTexto label="Categoría" value={form.categoria ?? ""}
              onChange={v => setForm(f => ({ ...f, categoria: v }))} opciones={categorias}
              placeholder="Arma, reliquia, objeto…" />
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35">Descripción</label>
          <MarkdownEditor
            value={form.descripcion ?? ""}
            onChange={v => setForm(f => ({ ...f, descripcion: v }))}
            rows={10}
            placeholder="Qué es, qué hace, su historia…"
            toolbar
            defaultMode="edit"
          />
        </div>

        {/* ── Criaturas fuente ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{
            border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)",
            background: "color-mix(in srgb, var(--primary) 2%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <Bug size={12} className="text-primary/35" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/40">
              Criaturas que lo sueltan
            </p>
          </div>
          <BloqueDropsFuente itemId={form.id} />
        </div>
      </div>
    </div>
  );
}