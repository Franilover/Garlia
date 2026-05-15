"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Save, Trash2, Loader2, Tag, X, Plus, Check } from "lucide-react";
import { type Nota } from "./useNotas";
import { type SaveStatus } from "./types";
import { SaveIndicator } from "./UIComponents";
import { MarkdownEditor } from "../../../../forms/MarkdownEditor";
import { useWikilink } from "../../../../forms/WikilinkContext";
import { useConfirm } from "@/components/ui/ConfirmModal";

// ─── Etiqueta chip ────────────────────────────────────────────────────────────
function EtiquetaChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all"
      style={{
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
        color: "color-mix(in srgb, var(--primary) 55%, transparent)",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-3 h-3 rounded-full flex items-center justify-center hover:text-red-400 transition-colors"
      >
        <X size={7} />
      </button>
    </span>
  );
}

// ─── EditorNota ───────────────────────────────────────────────────────────────
export function EditorNota({
  nota,
  onSaved,
  onDeleted,
}: {
  nota: Nota;
  onSaved: (n: Nota) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<Nota>(nota);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [etiquetaInput, setEtiquetaInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModal } = useConfirm();
  const { onSnippetAction } = useWikilink();

  // Sync cuando cambia la nota seleccionada
  useEffect(() => {
    setForm(nota);
    setStatus("idle");
    setEtiquetaInput("");
    setShowTagInput(false);
  }, [nota.id]);

  // Parsear etiquetas
  const etiquetas: string[] = (() => {
    try { return JSON.parse(form.etiquetas ?? "[]"); } catch { return []; }
  })();

  const setEtiquetas = useCallback((tags: string[]) => {
    setForm(f => ({ ...f, etiquetas: JSON.stringify(tags) }));
  }, []);

  const addTag = useCallback(() => {
    const tag = etiquetaInput.trim().toLowerCase();
    if (!tag || etiquetas.includes(tag)) { setEtiquetaInput(""); return; }
    setEtiquetas([...etiquetas, tag]);
    setEtiquetaInput("");
    setShowTagInput(false);
  }, [etiquetaInput, etiquetas, setEtiquetas]);

  const removeTag = useCallback((tag: string) => {
    setEtiquetas(etiquetas.filter(t => t !== tag));
  }, [etiquetas, setEtiquetas]);

  // Guardar
  const handleSave = async () => {
    setStatus("saving");
    try {
      await onSaved(form);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  };

  // Eliminar
  const handleDelete = async () => {
    const ok = await confirm({
      title: "¿Eliminar nota?",
      message: `Esto eliminará "${form.titulo}" de forma permanente.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    onDeleted(nota.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {ConfirmModal}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col gap-2 px-4 py-3 border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)",
          background: "color-mix(in srgb, var(--primary) 2%, transparent)",
        }}
      >
        {/* Título editable */}
        <input
          value={form.titulo}
          onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
          placeholder="Título de la nota…"
          className="w-full bg-transparent text-[13px] font-black text-primary outline-none placeholder:text-primary/25 border-b border-transparent focus:border-primary/15 pb-0.5 transition-colors"
        />

        {/* Etiquetas */}
        <div className="flex flex-wrap items-center gap-1 min-h-[22px]">
          <Tag size={9} className="text-primary/25 shrink-0" />
          {etiquetas.map(tag => (
            <EtiquetaChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
          ))}

          {showTagInput ? (
            <div className="flex items-center gap-1">
              <input
                ref={tagInputRef}
                value={etiquetaInput}
                onChange={e => setEtiquetaInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
                  if (e.key === "Escape") { setShowTagInput(false); setEtiquetaInput(""); }
                }}
                onBlur={() => { addTag(); setShowTagInput(false); }}
                placeholder="Nueva etiqueta…"
                className="w-24 bg-primary/5 border border-primary/15 rounded-lg px-2 py-0.5 text-[9px] font-medium outline-none focus:border-primary/30 text-primary placeholder:text-primary/25"
                autoFocus
              />
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(); }}
                className="w-4 h-4 rounded flex items-center justify-center text-primary/30 hover:text-primary transition-colors"
              >
                <Check size={9} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-dashed transition-all text-primary/25 hover:text-primary/50"
              style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
            >
              <Plus size={7} /> Tag
            </button>
          )}
        </div>
      </div>

      {/* ── Contenido — Markdown ────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <MarkdownEditor
          value={form.contenido ?? ""}
          onChange={v => setForm(f => ({ ...f, contenido: v }))}
          placeholder="Escribe tu nota aquí… Ideas, referencias, fragmentos, recordatorios…"
          rows={24}
          toolbar
          defaultMode="edit"
          onSnippetAction={onSnippetAction}
        />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}
      >
        {/* Eliminar */}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/5 transition-all"
        >
          <Trash2 size={10} /> Eliminar
        </button>

        {/* Guardar */}
        <div className="flex items-center gap-2">
          <SaveIndicator status={status} />
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-primary text-btn-text hover:bg-primary/90 transition-all shadow-sm shadow-primary/20 disabled:opacity-50"
          >
            {status === "saving"
              ? <Loader2 size={10} className="animate-spin" />
              : <Save size={10} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ListaNotas: panel lateral izquierdo de notas ────────────────────────────
export function ListaNotas({
  notas,
  loading,
  selectedId,
  search,
  onSearch,
  onSelect,
  onNew,
}: {
  notas: Nota[];
  loading: boolean;
  selectedId: string | null;
  search: string;
  onSearch: (v: string) => void;
  onSelect: (n: Nota) => void;
  onNew: () => void;
}) {
  const filtered = notas.filter(n =>
    n.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (n.contenido ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (n.etiquetas ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Parsear etiquetas rápido
  const getTags = (n: Nota): string[] => {
    try { return JSON.parse(n.etiquetas ?? "[]"); } catch { return []; }
  };

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Buscador + botón nuevo */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 border-b"
        style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)" }}>
        <div className="relative flex-1">
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar notas…"
            className="w-full bg-primary/4 border border-primary/10 rounded-xl pl-2.5 pr-5 py-1.5 text-[10px] font-medium outline-none focus:border-primary/25 text-primary placeholder:text-primary/25"
          />
          {search && (
            <button onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/25 hover:text-primary transition-colors">
              <X size={8} />
            </button>
          )}
        </div>
        <button
          onClick={onNew}
          className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all border"
          style={{
            background: "color-mix(in srgb, var(--primary) 8%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "var(--primary)",
          }}
          title="Nueva nota"
        >
          <Plus size={11} />
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-0.5">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={16} className="animate-spin text-primary/20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText size={20} strokeWidth={1} className="text-primary/15" />
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/20">
              {search ? "Sin resultados" : "Sin notas aún"}
            </p>
            {!search && (
              <button
                onClick={onNew}
                className="mt-1 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-dashed transition-all text-primary/30 hover:text-primary/60"
                style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
                Crear primera nota
              </button>
            )}
          </div>
        ) : (
          filtered.map(n => {
            const tags = getTags(n);
            const isSelected = n.id === selectedId;
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n)}
                className="w-full text-left px-3 py-2.5 rounded-xl border transition-all group"
                style={isSelected ? {
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--primary) 20%, transparent)",
                } : {
                  background: "transparent",
                  borderColor: "transparent",
                }}
              >
                <p className={`text-[11px] font-bold truncate transition-colors ${
                  isSelected ? "text-primary" : "text-primary/70 group-hover:text-primary/90"
                }`}>
                  {n.titulo || <span className="italic text-primary/30">Sin título</span>}
                </p>
                {/* Preview del contenido */}
                {n.contenido?.trim() && (
                  <p className="text-[9px] text-primary/35 truncate mt-0.5 leading-tight">
                    {n.contenido.replace(/#+\s|[*_`]/g, "").trim().slice(0, 80)}
                  </p>
                )}
                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {tags.slice(0, 3).map(tag => (
                      <span key={tag}
                        className="px-1 py-0 rounded text-[7px] font-black uppercase tracking-wider"
                        style={{
                          background: "color-mix(in srgb, var(--primary) 7%, transparent)",
                          color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {tags.length > 3 && (
                      <span className="text-[7px] text-primary/25">+{tags.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
