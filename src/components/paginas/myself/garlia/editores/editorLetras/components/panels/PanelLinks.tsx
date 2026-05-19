"use client";

import React, { useState } from "react";
import { Link2, ChevronDown, ExternalLink, Pencil, Trash2, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/api/client/supabase";
import { useConfirm } from "@/components/ui/ConfirmModal";
import type { CancionLink } from "../../types";

export const PanelLinks = ({
  cancionId, links, onLinksChange,
}: {
  cancionId: string;
  links: CancionLink[];
  onLinksChange: (links: CancionLink[]) => void;
}) => {
  const [open,    setOpen]    = useState(false);
  const [titulo,  setTitulo]  = useState("");
  const [url,     setUrl]     = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saving,  setSaving]  = useState(false);
  const { confirm, ConfirmModal } = useConfirm();

  const saveLinks = async (newLinks: CancionLink[]) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("canciones").update({ links: newLinks }).eq("id", cancionId);
      if (error) throw error;
      onLinksChange(newLinks);
    } catch (e) { console.error("Links:", e); }
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !url.trim()) return;
    const newLink = { titulo: titulo.trim(), url: url.trim() };
    const updated = [...links];
    if (editIdx !== null) updated[editIdx] = newLink;
    else updated.push(newLink);
    await saveLinks(updated);
    setTitulo(""); setUrl(""); setEditIdx(null);
  };

  const handleEdit = (i: number) => {
    setTitulo(links[i].titulo);
    setUrl(links[i].url);
    setEditIdx(i);
    setOpen(true);
  };

  const handleDelete = async (i: number) => {
    const ok = await confirm({ message: `¿Eliminar "${links[i].titulo}"?`, danger: true });
    if (!ok) return;
    await saveLinks(links.filter((_, idx) => idx !== i));
  };

  const handleCancel = () => {
    setTitulo(""); setUrl(""); setEditIdx(null);
  };

  return (
    <div className="border-t border-primary/8 px-8 py-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors w-full"
      >
        <Link2 size={12} />
        Enlaces
        {links.length > 0 && (
          <span className="bg-primary/10 text-primary/60 rounded-full px-2 py-0.5 text-[8px]">{links.length}</span>
        )}
        <ChevronDown size={11} className={`ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {links.length > 0 && (
            <div className="space-y-1.5">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <a
                    href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-1.5 text-[11px] font-bold text-primary/60 hover:text-primary transition-colors truncate min-w-0"
                  >
                    <ExternalLink size={10} className="shrink-0" />
                    <span className="truncate">{link.titulo}</span>
                  </a>
                  <button
                    onClick={() => handleEdit(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-primary/30 hover:text-primary transition-all"
                  ><Pencil size={10} /></button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-primary/20 hover:text-red-400 transition-all"
                  ><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Título del enlace…"
                className="flex-1 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-[11px] font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/25"
              />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 text-[11px] font-medium text-primary outline-none focus:border-primary/40 transition-colors placeholder:text-primary/25"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!titulo.trim() || !url.trim() || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-bg-main rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-40 hover:opacity-90 transition-all"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {editIdx !== null ? "Guardar" : "Añadir"}
              </button>
              {editIdx !== null && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-2 rounded-xl border border-primary/15 text-[9px] font-black uppercase text-primary/40 hover:text-primary hover:border-primary/30 transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      <ConfirmModal />
    </div>
  );
};
