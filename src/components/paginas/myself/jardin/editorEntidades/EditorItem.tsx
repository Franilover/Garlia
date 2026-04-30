"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Package, Save, Trash2, Bug, GitBranch, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { type Item, type SaveStatus } from "./types";
import { useUniqueValues } from "./hooks";
import { SelectorImagen, SelectorTexto, SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "./MarkdownEditor";

// ─── Tipos locales ─────────────────────────────────────────────────────────────

type DropSource = {
  dropId:       string;       // id en criatura_drops
  criaturaId:   string;
  criaturaName: string;
  criaturaImg?: string | null;
  varianteId:   string | null;
  varianteTipo: string | null;
};

// ─── Hook: quién dropea este ítem ─────────────────────────────────────────────

function useDropSources(itemId: string) {
  const [sources, setSources] = useState<DropSource[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criatura_drops")
      .select(`
        id,
        criatura_id,
        variante_id,
        criaturas!criatura_id(nombre, imagen_url),
        criatura_variantes!variante_id(tipo)
      `)
      .eq("item_id", itemId);

    setSources(
      (data ?? []).map((r: any) => ({
        dropId:       r.id,
        criaturaId:   r.criatura_id,
        criaturaName: (Array.isArray(r.criaturas) ? r.criaturas[0]?.nombre : r.criaturas?.nombre) ?? "—",
        criaturaImg:  (Array.isArray(r.criaturas) ? r.criaturas[0]?.imagen_url : r.criaturas?.imagen_url) ?? null,
        varianteId:   r.variante_id ?? null,
        varianteTipo: (Array.isArray(r.criatura_variantes)
          ? r.criatura_variantes[0]?.tipo
          : r.criatura_variantes?.tipo) ?? null,
      }))
    );
    setLoading(false);
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const remove = async (dropId: string) => {
    await supabase.from("criatura_drops").delete().eq("id", dropId);
    setSources(prev => prev.filter(s => s.dropId !== dropId));
  };

  return { sources, loading, remove };
}

// ─── Panel de fuentes de drop ─────────────────────────────────────────────────

function PanelDropSources({ itemId }: { itemId: string }) {
  const { sources, loading, remove } = useDropSources(itemId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 size={13} className="animate-spin text-primary/20" />
        <span className="text-[10px] text-primary/25 italic">Cargando…</span>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <p className="text-[9px] font-bold text-primary/20 uppercase tracking-widest text-center py-6 border border-dashed border-primary/10 rounded-xl italic">
        Ninguna criatura dropea este ítem todavía
      </p>
    );
  }

  // Agrupar por criatura
  const byCriatura = sources.reduce<Record<string, DropSource[]>>((acc, s) => {
    if (!acc[s.criaturaId]) acc[s.criaturaId] = [];
    acc[s.criaturaId].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-1.5">
      {Object.values(byCriatura).map(group => {
        const { criaturaId, criaturaName, criaturaImg } = group[0];
        return (
          <div
            key={criaturaId}
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
          >
            {/* Cabecera criatura */}
            <div
              className="flex items-center gap-2.5 px-3 py-2.5"
              style={{ background: "color-mix(in srgb, var(--primary) 3%, transparent)" }}
            >
              <div className="shrink-0 w-7 h-7 rounded-lg overflow-hidden border border-primary/10 bg-primary/5 flex items-center justify-center">
                {criaturaImg
                  ? <img src={criaturaImg} alt={criaturaName} className="w-full h-full object-cover" />
                  : <Bug size={12} className="text-primary/20" />}
              </div>
              <span className="text-[11px] font-black text-primary/70 uppercase tracking-widest flex-1 truncate">
                {criaturaName}
              </span>
            </div>

            {/* Filas: base o variante */}
            <div className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
              {group.map(s => (
                <div
                  key={s.dropId}
                  className="flex items-center gap-2 px-3 py-2 group hover:bg-primary/3 transition-colors"
                >
                  {s.varianteTipo ? (
                    <>
                      <GitBranch size={9} className="text-primary/25 shrink-0" />
                      <span className="text-[10px] text-primary/45 flex-1 truncate italic">{s.varianteTipo}</span>
                    </>
                  ) : (
                    <>
                      <ChevronRight size={9} className="text-primary/20 shrink-0" />
                      <span className="text-[10px] text-primary/40 flex-1 italic">Drop base</span>
                    </>
                  )}
                  <button
                    onClick={() => remove(s.dropId)}
                    className="shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 hover:bg-red-500/8 transition-all"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type InnerTab = "info" | "criaturas";

// ─── EditorItem ───────────────────────────────────────────────────────────────

export function EditorItem({
  item, onSaved, onDeleted,
}: {
  item: Item; onSaved: (i: Item) => void; onDeleted: (id: string) => void;
}) {
  const [form,     setForm]     = useState<Item>(item);
  const [status,   setStatus]   = useState<SaveStatus>("idle");
  const [innerTab, setInnerTab] = useState<InnerTab>("info");
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

      {/* ── Inner tabs ───────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center gap-1 px-4 py-2 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 6%, transparent)" }}
      >
        <button
          onClick={() => setInnerTab("info")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          style={innerTab === "info" ? {
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            color: "var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          } : {
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            border: "1px solid transparent",
          }}
        >
          <Package size={11} /> <span className="hidden sm:inline">Info</span>
        </button>
        <button
          onClick={() => setInnerTab("criaturas")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
          style={innerTab === "criaturas" ? {
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            color: "var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
          } : {
            color: "color-mix(in srgb, var(--primary) 35%, transparent)",
            border: "1px solid transparent",
          }}
        >
          <Bug size={11} /> <span className="hidden sm:inline">Criaturas</span>
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* INFO */}
        {innerTab === "info" && (
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Columna izquierda: imagen */}
              <div className="w-full sm:w-96 sm:shrink-0">
                <SelectorImagen label="Imagen" value={form.imagen_url ?? ""}
                  onChange={url => setForm(f => ({ ...f, imagen_url: url }))} aspect="square"
                  placeholder={<Package size={20} className="opacity-20" />} />
              </div>

              {/* Columna derecha: categoría + descripción */}
              <div className="flex-1 min-w-0 space-y-4">
                <SelectorTexto label="Categoría" value={form.categoria ?? ""}
                  onChange={v => setForm(f => ({ ...f, categoria: v }))} opciones={categorias}
                  placeholder="Arma, reliquia, objeto…" />

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
              </div>
            </div>
          </div>
        )}

        {/* CRIATURAS */}
        {innerTab === "criaturas" && (
          <div className="p-4 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 flex items-center gap-1.5">
              <Bug size={10} /> Criaturas que dropean este ítem
            </p>
            <p className="text-[9px] text-primary/25 italic -mt-1">
              Para añadir fuentes, asigná este ítem desde el editor de cada criatura → pestaña Drops.
            </p>
            <PanelDropSources itemId={form.id} />
          </div>
        )}
      </div>
    </div>
  );
}