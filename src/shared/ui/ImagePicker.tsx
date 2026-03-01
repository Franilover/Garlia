// components/ui/ImagePicker.tsx
// Explorador visual de imágenes desde /public/dibujos
//
// USO BÁSICO — modo URL (cualquier página):
//   import { ImagePicker } from "@/components/ui/ImagePicker"
//   const [open, setOpen] = useState(false)
//   <ImagePicker open={open} onClose={() => setOpen(false)} onInsert={({ url }) => setImg(url)} />
//
// USO EN EDITOR — modo snippet:
//   <ImagePicker snippetMode open={open} onClose={() => setOpen(false)} onInsert={(snippet) => insertAtCursor(snippet)} />
//
// PROPS:
//   open             boolean
//   onClose          () => void
//   onInsert         (result: string | InsertResult) => void
//   snippetMode?     boolean — si true entrega snippet "[[img|...]]" / "[[float|...]]"
//   showModeSelector? boolean — muestra selector inline/flotante (default: true)
//   defaultMode?     "img" | "float" (default: "img")

"use client";

import React, { useEffect, useState } from "react";
import { X, Image, Folder, FolderOpen, ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FileEntry   { name: string; url: string; type: "image" }
interface FolderEntry { name: string; type: "folder"; children: TreeNode[] }
type TreeNode = FileEntry | FolderEntry;

export type InsertMode = "img" | "float";

export interface InsertResult {
  url: string;
  mode: InsertMode;
  caption?: string;
  word?: string;
}

export interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  onInsert: (result: string | InsertResult) => void;
  snippetMode?: boolean;
  showModeSelector?: boolean;
  defaultMode?: InsertMode;
}

function FolderNode({ node, depth, onSelect, selected }: { node: FolderEntry; depth: number; onSelect: (url: string) => void; selected: string | null }) {
  const [expanded, setExpanded] = useState(depth === 0);
  return (
    <div>
      <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 w-full text-left rounded-lg hover:bg-[#6B5E70]/5 transition-all py-1.5" style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: 12 }}>
        {expanded ? <FolderOpen size={14} className="text-[#B08850] shrink-0" /> : <Folder size={14} className="text-[#B08850]/60 shrink-0" />}
        <span className="text-[11px] font-bold text-[#2C262E]/70 truncate">{node.name}</span>
        <ChevronRight size={11} className={cn("ml-auto text-[#6B5E70]/30 transition-transform shrink-0", expanded && "rotate-90")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            {node.children.map((child, i) =>
              child.type === "folder"
                ? <FolderNode key={i} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
                : <ImageThumb key={i} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
            )}
            {node.children.length === 0 && (
              <p className="text-[10px] text-[#6B5E70]/25 italic py-2" style={{ paddingLeft: `${28 + depth * 16}px` }}>Sin imágenes</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageThumb({ node, depth, onSelect, selected }: { node: FileEntry; depth: number; onSelect: (url: string) => void; selected: string | null }) {
  const isSelected = selected === node.url;
  return (
    <button onClick={() => onSelect(node.url)} className={cn("flex items-center gap-3 w-full text-left rounded-lg transition-all py-2", isSelected ? "bg-[#6B5E70]/12" : "hover:bg-[#6B5E70]/5")} style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: 12 }}>
      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[#6B5E70]/10 bg-[#6B5E70]/5">
        <img src={node.url} alt={node.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <span className={cn("text-[11px] truncate flex-1", isSelected ? "font-bold text-[#6B5E70]" : "text-[#2C262E]/60")}>{node.name}</span>
      {isSelected && <Check size={12} className="text-[#6B5E70] shrink-0" />}
    </button>
  );
}

export function ImagePicker({ open, onClose, onInsert, snippetMode = false, showModeSelector = true, defaultMode = "img" }: ImagePickerProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [word, setWord] = useState("");
  const [mode, setMode] = useState<InsertMode>(defaultMode);

  useEffect(() => {
    if (!open) return;
    setSelected(null); setCaption(""); setWord(""); setMode(defaultMode);
    setLoading(true); setError(null);
    fetch("/api/dibujos")
      .then(r => r.json())
      .then(d => { if (d.ok) setTree(d.tree); else setError("No se pudo leer la carpeta."); })
      .catch(() => setError("Error al conectar con la API."))
      .finally(() => setLoading(false));
  }, [open, defaultMode]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleInsert = () => {
    if (!selected) return;
    if (snippetMode) {
      let snippet = "";
      if (mode === "img") snippet = caption ? `[[img|${selected}|${caption}]]` : `[[img|${selected}]]`;
      else { const w = word.trim() || "personaje"; snippet = caption ? `[[float|${w}|${selected}|${caption}]]` : `[[float|${w}|${selected}]]`; }
      (onInsert as (r: string) => void)(snippet);
    } else {
      (onInsert as (r: InsertResult) => void)({ url: selected, mode, caption: caption || undefined, word: word.trim() || undefined });
    }
    onClose();
  };

  const canInsert = !!selected && (mode === "img" || !showModeSelector || !!word.trim());

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-[#1A1218]/50 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed z-[71] inset-x-4 bottom-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[680px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "88vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#6B5E70]/8 shrink-0">
              <div>
                <h3 className="text-sm font-black text-[#2C262E] uppercase tracking-tight">Explorador de imágenes</h3>
                <p className="text-[10px] text-[#6B5E70]/40 font-bold uppercase tracking-widest mt-0.5">/public/dibujos</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#6B5E70]/6 hover:bg-[#6B5E70]/12 flex items-center justify-center text-[#6B5E70]/50 transition-all">
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">

              {/* Árbol */}
              <div className="w-1/2 border-r border-[#6B5E70]/8 overflow-y-auto py-2">
                {loading && (
                  <div className="flex items-center justify-center h-32 gap-2 text-[#6B5E70]/30">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Cargando…</span>
                  </div>
                )}
                {error && (
                  <div className="p-6 text-center">
                    <p className="text-[11px] text-red-400 font-bold">{error}</p>
                    <p className="text-[10px] text-[#6B5E70]/30 mt-1">Necesitás <code className="font-mono">app/api/dibujos/route.ts</code></p>
                  </div>
                )}
                {!loading && !error && tree.length === 0 && (
                  <p className="text-[11px] text-[#6B5E70]/30 italic text-center py-10 px-4">No hay imágenes en /public/dibujos</p>
                )}
                {!loading && !error && tree.map((node, i) =>
                  node.type === "folder"
                    ? <FolderNode key={i} node={node} depth={0} onSelect={setSelected} selected={selected} />
                    : <ImageThumb key={i} node={node} depth={0} onSelect={setSelected} selected={selected} />
                )}
              </div>

              {/* Panel derecho */}
              <div className="w-1/2 flex flex-col overflow-y-auto">
                {selected ? (
                  <>
                    <div className="relative bg-[#F7F3EE] shrink-0" style={{ aspectRatio: "4/3" }}>
                      <img src={selected} alt="" className="w-full h-full object-contain p-4" />
                    </div>
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1">Ruta</p>
                        <code className="text-[10px] text-[#6B5E70]/60 font-mono break-all bg-[#6B5E70]/5 rounded-lg px-2 py-1 block">{selected}</code>
                      </div>

                      {showModeSelector && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-2">Tipo</p>
                          <div className="flex gap-2">
                            {([{ key: "img" as InsertMode, label: "Inline", desc: "Full-width en el texto" }, { key: "float" as InsertMode, label: "Flotante", desc: "Click en una palabra" }] as const).map(opt => (
                              <button key={opt.key} onClick={() => setMode(opt.key)} className={cn("flex-1 py-2 px-3 rounded-xl text-left transition-all border", mode === opt.key ? "bg-[#6B5E70] border-[#6B5E70]" : "border-[#6B5E70]/10 hover:bg-[#6B5E70]/5")}>
                                <p className={cn("text-[11px] font-black uppercase tracking-widest", mode === opt.key ? "text-white" : "text-[#6B5E70]")}>{opt.label}</p>
                                <p className={cn("text-[9px] mt-0.5", mode === opt.key ? "text-white/60" : "text-[#6B5E70]/30")}>{opt.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {showModeSelector && mode === "float" && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1.5">Palabra en el texto</label>
                            <input value={word} onChange={e => setWord(e.target.value)} placeholder="ej: Kael, la espada, el castillo…" className="w-full px-3 py-2 rounded-xl border border-[#6B5E70]/12 text-sm font-serif text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 placeholder:text-[#6B5E70]/20" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1.5">Caption <span className="font-normal opacity-50">(opcional)</span></label>
                        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Descripción breve…" className="w-full px-3 py-2 rounded-xl border border-[#6B5E70]/12 text-sm font-serif text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 placeholder:text-[#6B5E70]/20" />
                      </div>

                      {snippetMode && (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1">Resultado</p>
                          <code className="text-[10px] text-[#6B5E70]/50 font-mono break-all bg-[#6B5E70]/5 rounded-lg px-2 py-1.5 block leading-relaxed">
                            {mode === "img" ? `[[img|${selected}${caption ? `|${caption}` : ""}]]` : `[[float|${word || "palabra"}|${selected}${caption ? `|${caption}` : ""}]]`}
                          </code>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Image size={32} className="text-[#6B5E70]/15 mb-3" />
                    <p className="text-[11px] font-bold text-[#6B5E70]/30 uppercase tracking-widest">Seleccioná una imagen</p>
                    <p className="text-[10px] text-[#6B5E70]/20 mt-1">del árbol de la izquierda</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#6B5E70]/8 shrink-0 flex items-center justify-between gap-4">
              <p className="text-[10px] text-[#6B5E70]/30 font-bold uppercase tracking-widest">{selected ? "Lista para insertar" : "Ninguna seleccionada"}</p>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-[#6B5E70]/40 hover:bg-[#6B5E70]/5 transition-all">Cancelar</button>
                <button onClick={handleInsert} disabled={!canInsert} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-[#6B5E70] text-white hover:bg-[#5a4e5f] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
                  <Image size={12} /> Insertar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}