"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import {
  ChevronLeft, ChevronRight, List, Save, Edit3, X,
  BookOpen, Clock, AlignLeft, Maximize2, Minimize2,
  ChevronDown, Check, Eye, Type, Image, Quote,
  Folder, FolderOpen, ChevronRight as ChevronR, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { librosQueries, Capitulo } from "@/lib/api/queries/wiki/libros";

interface CapituloLista {
  id: string; orden: number; fecha_publicacion: string; titulo_capitulo?: string;
}
interface FileEntry  { name: string; url: string; type: "image" }
interface FolderEntry { name: string; type: "folder"; children: TreeNode[] }
type TreeNode = FileEntry | FolderEntry;
type Segment =
  | { type: "text"; value: string }
  | { type: "cita"; content: string }
  | { type: "img"; url: string; caption?: string }
  | { type: "float"; word: string; url: string; caption?: string };

function parseContenido(texto: string): Segment[] {
  const regex = /\[\[(\w+)\|([^\]]+)\]\]/g;
  const segs: Segment[] = [];
  let lastIndex = 0, match: RegExpExecArray | null;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) segs.push({ type: "text", value: texto.slice(lastIndex, match.index) });
    const [, kind, rest] = match;
    const parts = rest.split("|").map(p => p.trim());
    if (kind === "cita") segs.push({ type: "cita", content: parts[0] });
    else if (kind === "img") segs.push({ type: "img", url: parts[0], caption: parts[1] });
    else if (kind === "float") segs.push({ type: "float", word: parts[0], url: parts[1], caption: parts[2] });
    else segs.push({ type: "text", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < texto.length) segs.push({ type: "text", value: texto.slice(lastIndex) });
  return segs;
}

function CitaVisual({ content }: { content: string }) {
  const dashIdx = content.lastIndexOf(" — ");
  const texto = dashIdx !== -1 ? content.slice(0, dashIdx) : content;
  const fuente = dashIdx !== -1 ? content.slice(dashIdx + 3) : null;
  return (
    <div className="my-10 mx-0 relative">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full" style={{ background: "linear-gradient(to bottom, #C4A882, #6B5E70, #C4A882)" }} />
      <div className="absolute -top-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-[#C4A882]" />
      <div className="absolute -bottom-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-[#6B5E70]" />
      <div className="pl-7 py-2 bg-gradient-to-r from-[#F7F3EE] to-transparent rounded-r-2xl">
        <span className="block font-serif text-5xl leading-none mb-2 select-none" style={{ color: "#C4A882", opacity: 0.5, fontStyle: "italic" }} aria-hidden>"</span>
        <p className="font-serif text-lg md:text-xl italic leading-[1.9] text-[#2C262E]/75">{texto}</p>
        {fuente && <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-[#6B5E70]/40">— {fuente}</p>}
      </div>
    </div>
  );
}

function ImgInline({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="my-12 -mx-6 md:-mx-12">
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-xl shadow-[#2C262E]/10">
        <img src={url} alt={caption ?? ""} className="w-full object-cover" style={{ maxHeight: 520 }} />
        {caption && <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1A1218]/60 to-transparent" />}
      </div>
      {caption && <figcaption className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#6B5E70]/35">{caption}</figcaption>}
    </figure>
  );
}

function FloatWord({ word, url, caption }: { word: string; url: string; caption?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const handleClick = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
    }
    setOpen(v => !v);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  return (
    <>
      <button ref={btnRef} onClick={handleClick} className="relative inline font-serif cursor-pointer group">
        <span style={{ backgroundImage: "linear-gradient(#9B7BAA, #9B7BAA)", backgroundRepeat: "no-repeat", backgroundSize: "100% 1px", backgroundPosition: "0 100%", paddingBottom: "1px" }}>{word}</span>
        <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-[#9B7BAA]/60 group-hover:bg-[#9B7BAA] transition-colors" />
      </button>
      <AnimatePresence>
        {open && pos && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[55]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 8 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }} className="fixed z-[56] pointer-events-auto"
              style={{ left: Math.min(Math.max(pos.x - 160, 12), (typeof window !== "undefined" ? window.innerWidth : 800) - 332), top: Math.max(pos.y - 280 - window.scrollY, 12), width: 320 }}>
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: "0 24px 64px rgba(44,38,46,0.22), 0 4px 16px rgba(44,38,46,0.12)" }}>
                <div className="relative">
                  <img src={url} alt={caption ?? word} className="w-full object-cover" style={{ maxHeight: 260 }} />
                  <button onClick={() => setOpen(false)} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#1A1218]/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-[#1A1218]/70 transition-all"><X size={13} /></button>
                </div>
                {caption && <div className="bg-white px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 text-center">{caption}</p></div>}
              </div>
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: caption ? "8px solid white" : "8px solid #2C262E" }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ContenidoInteractivo({ texto }: { texto: string }) {
  const segs = parseContenido(texto);
  return (
    <div className="text-lg md:text-xl leading-[2.2] text-[#2C262E]/90 font-serif">
      {segs.map((seg, i) => {
        if (seg.type === "text") return <span key={i} className={cn("whitespace-pre-line", i === 0 && "first-letter:text-7xl first-letter:font-black first-letter:text-[#6B5E70] first-letter:mr-4 first-letter:float-left first-letter:mt-3")}>{seg.value}</span>;
        if (seg.type === "cita")  return <CitaVisual key={i} content={seg.content} />;
        if (seg.type === "img")   return <ImgInline key={i} url={seg.url} caption={seg.caption} />;
        if (seg.type === "float") return <FloatWord key={i} word={seg.word} url={seg.url} caption={seg.caption} />;
        return null;
      })}
    </div>
  );
}

// ─── EXPLORADOR DE IMÁGENES ──────────────────────────────────────────────────
type InsertMode = "img" | "float";

function FolderNode({ node, depth, onSelect, selected }: { node: FolderEntry; depth: number; onSelect: (url: string) => void; selected: string | null }) {
  const [expanded, setExpanded] = useState(depth === 0);
  return (
    <div>
      <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 w-full text-left rounded-lg hover:bg-[#6B5E70]/5 transition-all py-1.5" style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: 12 }}>
        {expanded ? <FolderOpen size={14} className="text-[#B08850] shrink-0" /> : <Folder size={14} className="text-[#B08850]/60 shrink-0" />}
        <span className="text-[11px] font-bold text-[#2C262E]/70 truncate">{node.name}</span>
        <ChevronR size={11} className={cn("ml-auto text-[#6B5E70]/30 transition-transform shrink-0", expanded && "rotate-90")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            {node.children.map((child, i) =>
              child.type === "folder"
                ? <FolderNode key={i} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
                : <ImageThumb key={i} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
            )}
            {node.children.length === 0 && <p className="text-[10px] text-[#6B5E70]/25 italic py-2" style={{ paddingLeft: `${28 + depth * 16}px` }}>Sin imágenes</p>}
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

function ImagePicker({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (snippet: string) => void }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [word, setWord] = useState("");
  const [mode, setMode] = useState<InsertMode>("img");

  useEffect(() => {
    if (!open) return;
    setSelected(null); setCaption(""); setWord("");
    setLoading(true); setError(null);
    fetch("/api/dibujos")
      .then(r => r.json())
      .then(d => { if (d.ok) setTree(d.tree); else setError("No se pudo leer la carpeta."); })
      .catch(() => setError("Error al conectar con la API."))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const handleInsert = () => {
    if (!selected) return;
    let snippet = "";
    if (mode === "img") snippet = caption ? `[[img|${selected}|${caption}]]` : `[[img|${selected}]]`;
    else { const w = word.trim() || "personaje"; snippet = caption ? `[[float|${w}|${selected}|${caption}]]` : `[[float|${w}|${selected}]]`; }
    onInsert(snippet);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-[#1A1218]/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed z-[71] inset-x-4 bottom-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[680px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "88vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#6B5E70]/8 shrink-0">
              <div>
                <h3 className="text-sm font-black text-[#2C262E] uppercase tracking-tight">Explorador de imágenes</h3>
                <p className="text-[10px] text-[#6B5E70]/40 font-bold uppercase tracking-widest mt-0.5">/public/dibujos</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[#6B5E70]/6 hover:bg-[#6B5E70]/12 flex items-center justify-center text-[#6B5E70]/50 transition-all"><X size={15} /></button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Árbol */}
              <div className="w-1/2 border-r border-[#6B5E70]/8 overflow-y-auto py-2">
                {loading && <div className="flex items-center justify-center h-32 gap-2 text-[#6B5E70]/30"><Loader2 size={16} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Cargando…</span></div>}
                {error && <div className="p-6 text-center"><p className="text-[11px] text-red-400 font-bold">{error}</p><p className="text-[10px] text-[#6B5E70]/30 mt-1">Asegurate que existe <code className="font-mono">app/api/dibujos/route.ts</code></p></div>}
                {!loading && !error && tree.length === 0 && <p className="text-[11px] text-[#6B5E70]/30 italic text-center py-10 px-4">No hay imágenes en /public/dibujos</p>}
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
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-2">Tipo de inserción</p>
                        <div className="flex gap-2">
                          {([{ key: "img" as InsertMode, label: "Inline", desc: "Full-width en el texto" }, { key: "float" as InsertMode, label: "Flotante", desc: "Click en una palabra" }] as const).map(opt => (
                            <button key={opt.key} onClick={() => setMode(opt.key)} className={cn("flex-1 py-2 px-3 rounded-xl text-left transition-all border", mode === opt.key ? "bg-[#6B5E70] border-[#6B5E70] text-white" : "border-[#6B5E70]/10 hover:bg-[#6B5E70]/5")}>
                              <p className={cn("text-[11px] font-black uppercase tracking-widest", mode === opt.key ? "text-white" : "text-[#6B5E70]")}>{opt.label}</p>
                              <p className={cn("text-[9px] mt-0.5", mode === opt.key ? "text-white/60" : "text-[#6B5E70]/30")}>{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <AnimatePresence>
                        {mode === "float" && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1.5">Palabra en el texto</label>
                            <input value={word} onChange={e => setWord(e.target.value)} placeholder="ej: Kael, la espada, el castillo…" className="w-full px-3 py-2 rounded-xl border border-[#6B5E70]/12 bg-[#6B5E70]/3 text-sm font-serif text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 placeholder:text-[#6B5E70]/20" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1.5">Caption <span className="font-normal opacity-50">(opcional)</span></label>
                        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Descripción breve…" className="w-full px-3 py-2 rounded-xl border border-[#6B5E70]/12 bg-[#6B5E70]/3 text-sm font-serif text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 placeholder:text-[#6B5E70]/20" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-1">Resultado</p>
                        <code className="text-[10px] text-[#6B5E70]/50 font-mono break-all bg-[#6B5E70]/5 rounded-lg px-2 py-1.5 block leading-relaxed">
                          {mode === "img" ? `[[img|${selected}${caption ? `|${caption}` : ""}]]` : `[[float|${word || "palabra"}|${selected}${caption ? `|${caption}` : ""}]]`}
                        </code>
                      </div>
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
                <button onClick={handleInsert} disabled={!selected || (mode === "float" && !word.trim())} className="px-5 py-2 rounded-xl text-[10px] font-black uppercase bg-[#6B5E70] text-white hover:bg-[#5a4e5f] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
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

function useTextStats(text: string) {
  const clean = text.replace(/\[\[cita\|[^\]]+\]\]/g, "").replace(/\[\[img\|[^\]]+\]\]/g, "").replace(/\[\[float\|([^|]+)\|[^\]]+\]\]/g, "$1");
  const words = clean.trim() ? clean.trim().split(/\s+/).length : 0;
  return { words, readMin: Math.max(1, Math.round(words / 200)) };
}

function SyntaxHelper({ onInsert }: { onInsert: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const bloques = [
    { label: "Cita visual", icon: Quote, badge: "bg-amber-100 text-amber-700", snippet: "[[cita|El texto de la cita. — Fuente]]", desc: "Bloque decorativo con línea lateral." },
    { label: "Imagen inline", icon: Image, badge: "bg-emerald-100 text-emerald-700", snippet: "[[img|/dibujos/imagen.jpg|Caption opcional]]", desc: "Imagen full-width en el flujo." },
    { label: "Imagen flotante", icon: Image, badge: "bg-purple-100 text-purple-700", snippet: "[[float|nombre|/dibujos/imagen.jpg|Caption]]", desc: "Palabra clickeable que muestra la imagen." },
  ];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 hover:bg-[#6B5E70]/8 hover:text-[#6B5E70] transition-all border border-dashed border-[#6B5E70]/20">
        ✦ Insertar <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full mt-2 w-96 bg-white border border-[#6B5E70]/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 pt-4 pb-1">
              {bloques.map(b => { const Icon = b.icon; return (
                <button key={b.label} onClick={() => { onInsert(b.snippet); setOpen(false); }} className="w-full text-left p-3 rounded-xl hover:bg-[#6B5E70]/5 transition-all mb-1 group">
                  <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit mb-1.5 ${b.badge}`}><Icon size={9} /> {b.label}</span>
                  <p className="text-[10px] text-[#6B5E70]/40 mb-1">{b.desc}</p>
                  <code className="text-[10px] text-[#6B5E70]/40 group-hover:text-[#6B5E70]/60 font-mono break-all block">{b.snippet}</code>
                </button>
              ); })}
            </div>
            <p className="px-4 pb-4 text-[9px] text-[#6B5E70]/25">Clic para insertar en el cursor.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChapterSelector({ lista, capIdActual, isAdmin, onSelect }: { lista: CapituloLista[]; capIdActual: string; isAdmin: boolean; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoy = new Date().toISOString().split("T")[0];
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const capActual = lista.find(c => c.id === capIdActual);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#6B5E70]/15 bg-[#6B5E70]/5 hover:bg-[#6B5E70]/10 transition-all text-[#6B5E70] text-[10px] font-black uppercase tracking-widest">
        <BookOpen size={13} /> Cap. {capActual?.orden ?? "—"} <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full mt-2 w-64 bg-white border border-[#6B5E70]/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {lista.map(cap => { const publicado = isAdmin || cap.fecha_publicacion <= hoy; const esActual = cap.id === capIdActual; return (
                <button key={cap.id} disabled={!publicado} onClick={() => { onSelect(cap.id); setOpen(false); }} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all", esActual ? "bg-[#6B5E70]/8 text-[#6B5E70]" : publicado ? "hover:bg-[#6B5E70]/5 text-[#2C262E]/80" : "opacity-30 cursor-not-allowed text-[#2C262E]/40")}>
                  <span className="text-[10px] font-black text-[#6B5E70]/40 w-6 shrink-0">{cap.orden}</span>
                  <span className="text-xs font-semibold truncate flex-1">{cap.titulo_capitulo ?? `Capítulo ${cap.orden}`}</span>
                  {esActual && <Check size={12} className="text-[#6B5E70] shrink-0" />}
                  {!publicado && <span className="text-[9px] text-[#6B5E70]/30 shrink-0">{new Date(cap.fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>}
                </button>
              ); })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditorToolbar({ textareaRef, value, onChange, onSave, onCancel, saving }: { textareaRef: React.RefObject<HTMLTextAreaElement>; value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; saving: boolean }) {
  const { words, readMin } = useTextStats(value);
  const [focusMode, setFocusMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const insertAtCursor = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const next = value.slice(0, s) + snippet + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + snippet.length, s + snippet.length); }, 0);
  }, [textareaRef, value, onChange]);

  const insertAround = (before: string, after = before) => {
    const el = textareaRef.current; if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    onChange(value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e));
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, e + before.length); }, 0);
  };

  const tools = [
    { label: "—", title: "Separador", action: () => insertAtCursor("\n— — —\n") },
    { label: "« »", title: "Comillas latinas", action: () => insertAround("«", "»") },
    { label: "…", title: "Elipsis", action: () => insertAtCursor("…") },
    { label: "—", title: "Guión largo", action: () => insertAtCursor("—") },
    { label: "¶", title: "Párrafo", action: () => insertAtCursor("\n\n") },
  ];

  const BarContent = ({ isFocus = false }: { isFocus?: boolean }) => (
    <div className={cn("flex items-center gap-2 flex-wrap", isFocus ? "px-8 py-4" : "px-4 py-2")}>
      <div className="flex items-center gap-1 pr-3 border-r border-[#6B5E70]/10">
        {tools.map((t, i) => <button key={i} title={t.title} onClick={t.action} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#6B5E70]/60 hover:text-[#6B5E70] hover:bg-[#6B5E70]/8 transition-all font-mono">{t.label}</button>)}
      </div>
      <SyntaxHelper onInsert={insertAtCursor} />
      <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 hover:bg-[#6B5E70]/8 hover:text-[#6B5E70] transition-all border border-[#6B5E70]/15" title="Explorador de imágenes">
        <Image size={12} /> Imágenes
      </button>
      {!isFocus && <button onClick={() => setFocusMode(true)} className="p-1.5 rounded-lg text-[#6B5E70]/50 hover:text-[#6B5E70] hover:bg-[#6B5E70]/8 transition-all"><Maximize2 size={14} /></button>}
      <div className="ml-auto flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30">
        <span className="flex items-center gap-1"><Type size={10} /> {words.toLocaleString()}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> ~{readMin}min</span>
      </div>
      <div className="flex items-center gap-2 pl-3 border-l border-[#6B5E70]/10">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-50 transition-all flex items-center gap-1"><X size={12} /> Cancelar</button>
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#6B5E70] text-white hover:bg-[#5a4e5f] transition-all flex items-center gap-1.5 disabled:opacity-50"><Save size={12} /> {saving ? "..." : "Guardar"}</button>
        {isFocus && <button onClick={() => setFocusMode(false)} className="p-2 rounded-xl text-[#6B5E70]/50 hover:text-[#6B5E70] hover:bg-[#6B5E70]/8 transition-all"><Minimize2 size={14} /></button>}
      </div>
    </div>
  );

  return (
    <>
      <ImagePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onInsert={insertAtCursor} />
      <div className="sticky top-[65px] z-40 bg-white/90 backdrop-blur-md border-b border-[#6B5E70]/8"><BarContent isFocus={false} /></div>
      <AnimatePresence>
        {focusMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#FAF8FA] z-50 flex flex-col">
            <ImagePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onInsert={insertAtCursor} />
            <div className="bg-white/80 backdrop-blur-md border-b border-[#6B5E70]/8"><BarContent isFocus={true} /></div>
            <div className="flex-1 overflow-auto flex justify-center py-12 px-6">
              <textarea ref={textareaRef} value={value} onChange={e => onChange(e.target.value)} autoFocus className="w-full max-w-2xl bg-transparent font-serif text-xl leading-[2.2] text-[#2C262E] focus:outline-none resize-none" placeholder={"Escribe aquí…\n\n[[cita|Texto. — Fuente]]\n[[img|url|caption]]\n[[float|palabra|url|caption]]"} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Lector() {
  const params = useParams();
  const id = params?.id as string;
  const capId = params?.capId as string;
  const router = useRouter();
  const [capitulo, setCapitulo] = useState<Capitulo | null>(null);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [saving, setSaving] = useState(false);
  const isInitialMount = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { words: wordsPublicado } = useTextStats(capitulo?.contenido ?? "");
  const { words: wordsEdit } = useTextStats(nuevoContenido);

  useEffect(() => {
    const fetchDatos = async () => {
      if (!capId || !id) return;
      try {
        if (isInitialMount.current) setLoading(true);
        setError(null);
        const [sessionRes, queryRes] = await Promise.all([supabase.auth.getSession(), librosQueries.getCapituloParaLectura(capId, id, true)]);
        setIsAdmin(!!sessionRes.data.session);
        if (queryRes.error || !queryRes.data) { setError(queryRes.error || "No se pudo cargar el capítulo"); }
        else { setCapitulo(queryRes.data.capitulo); setListaCapitulos(queryRes.data.listaCapitulos); setNuevoContenido(queryRes.data.capitulo.contenido || ""); }
      } catch (err) { console.error("Error crítico en Lector:", err); setError("Error al abrir el pergamino"); }
      finally { setLoading(false); isInitialMount.current = false; }
    };
    fetchDatos();
  }, [capId, id]);

  const handleSave = async () => {
    if (!capitulo || !capId) return;
    const contenidoPrevio = capitulo.contenido;
    setCapitulo({ ...capitulo, contenido: nuevoContenido }); setEditMode(false); setSaving(true);
    try { const { error: saveError } = await librosQueries.updateContenido(capId, nuevoContenido); if (saveError) throw saveError; }
    catch (err: any) { setCapitulo({ ...capitulo, contenido: contenidoPrevio }); setNuevoContenido(contenidoPrevio); setEditMode(true); alert("Error al guardar: " + err.message); }
    finally { setSaving(false); }
  };

  const handleCancelEdit = () => { setEditMode(false); setNuevoContenido(capitulo?.contenido ?? ""); setPreviewMode(false); };
  const handleChapterSelect = useCallback((newCapId: string) => router.push(`/wiki/paginas/libros/${id}/leer/${newCapId}`), [id, router]);

  const hoy = new Date().toISOString().split("T")[0];
  const indiceActual = listaCapitulos.findIndex(c => c.id === capId);
  const anteriorCap = listaCapitulos.slice(0, indiceActual).reverse().find(c => isAdmin || c.fecha_publicacion <= hoy);
  const siguienteCap = listaCapitulos.slice(indiceActual + 1).find(c => isAdmin || c.fecha_publicacion <= hoy);

  if (loading && !capitulo) return <div className="h-screen flex items-center justify-center bg-[#FDFCFD]"><div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">Abriendo pergamino...</div></div>;
  if (error || !capitulo) return <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFD] text-[#6B5E70] p-6 text-center"><h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">{error || "Capítulo no encontrado"}</h2><button onClick={() => router.push(`/wiki/paginas/libros/${id}`)} className="text-[10px] font-black uppercase border-b-2 border-[#6B5E70] pb-1">Volver al índice</button></div>;

  return (
    <div className="min-h-screen bg-[#FDFCFD] text-[#2C262E] pb-24">
      <nav className="sticky top-0 z-50 bg-[#FDFCFD]/80 backdrop-blur-md border-b border-[#6B5E70]/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)} className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors shrink-0"><ChevronLeft size={24} /></button>
          <div className="flex flex-col items-center gap-1 min-w-0">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B5E70]/40 leading-none truncate">{capitulo.libros?.titulo}</h2>
            {listaCapitulos.length > 1 ? <ChapterSelector lista={listaCapitulos} capIdActual={capId} isAdmin={isAdmin} onSelect={handleChapterSelect} /> : <p className="text-[11px] font-bold text-[#6B5E70] uppercase">Capítulo {capitulo.orden}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && !editMode && <button onClick={() => setEditMode(true)} className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors p-1"><Edit3 size={20} /></button>}
            <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)} className="text-[#6B5E70]/40 hover:text-[#6B5E70]"><List size={24} /></button>
          </div>
        </div>
      </nav>

      {isAdmin && editMode && <EditorToolbar textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>} value={nuevoContenido} onChange={setNuevoContenido} onSave={handleSave} onCancel={handleCancelEdit} saving={saving} />}

      <article className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-12 text-center">
          <span className="text-[#6B5E70]/20 font-serif italic text-4xl block mb-2">§ {capitulo.orden}</span>
          <h1 className="text-3xl md:text-4xl font-black text-[#6B5E70] tracking-tighter uppercase italic leading-none">{capitulo.titulo_capitulo}</h1>
          {!editMode && (
            <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/25">
              <span className="flex items-center gap-1"><AlignLeft size={9} /> {wordsPublicado.toLocaleString()} palabras</span>
              <span className="flex items-center gap-1"><Clock size={9} /> ~{Math.max(1, Math.round(wordsPublicado / 200))} min</span>
            </div>
          )}
        </header>

        <div className="min-h-[50vh]">
          {isAdmin && editMode ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {([{ key: false, icon: Edit3, label: "Editar" }, { key: true, icon: Eye, label: "Preview" }] as const).map(({ key, icon: Icon, label }) => (
                  <button key={String(key)} onClick={() => setPreviewMode(key as boolean)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", previewMode === key ? "bg-[#6B5E70] text-white" : "text-[#6B5E70]/50 hover:bg-[#6B5E70]/8")}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {previewMode
                  ? <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[60vh] p-8 bg-white border border-[#6B5E70]/10 rounded-[2.5rem] overflow-hidden"><ContenidoInteractivo texto={nuevoContenido} /></motion.div>
                  : <motion.textarea key="editor" ref={textareaRef as any} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} value={nuevoContenido} onChange={e => setNuevoContenido(e.target.value)} className="w-full min-h-[60vh] p-8 bg-white border border-[#6B5E70]/10 rounded-[2.5rem] font-serif text-lg leading-relaxed text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 shadow-inner resize-none" autoFocus placeholder={"Escribe aquí…\n\n[[cita|Texto. — Fuente]]\n[[img|url|caption]]\n[[float|palabra|url|caption]]"} />
                }
              </AnimatePresence>
              <div className="flex justify-end mt-3 px-2">
                {wordsEdit !== wordsPublicado && wordsEdit > 0 && <span className={cn("text-[9px] font-black uppercase tracking-widest", wordsEdit > wordsPublicado ? "text-emerald-400" : "text-amber-400")}>{wordsEdit > wordsPublicado ? "+" : ""}{wordsEdit - wordsPublicado} palabras vs. guardado</span>}
              </div>
            </div>
          ) : (
            <ContenidoInteractivo texto={capitulo.contenido} />
          )}
        </div>

        {!editMode && (
          <footer className="mt-20 pt-10 border-t border-[#6B5E70]/10 flex flex-col items-center gap-8">
            <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)} className="flex items-center gap-2 text-[#6B5E70]/40 hover:text-[#6B5E70] font-black text-[10px] uppercase tracking-widest transition-all"><List size={16} /> Volver al Índice</button>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button onClick={() => anteriorCap && router.push(`/wiki/paginas/libros/${id}/leer/${anteriorCap.id}`)} disabled={!anteriorCap} className={cn("p-5 rounded-2xl border font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all", !anteriorCap ? "opacity-20 cursor-not-allowed" : "border-[#6B5E70]/10 text-[#6B5E70]/60 hover:bg-[#6B5E70]/5 active:scale-95")}><ChevronLeft size={14} /> Anterior</button>
              <button onClick={() => siguienteCap ? router.push(`/wiki/paginas/libros/${id}/leer/${siguienteCap.id}`) : router.push(`/wiki/paginas/libros/${id}`)} className="p-5 rounded-2xl bg-[#6B5E70] text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg hover:shadow-[#6B5E70]/30 active:scale-95 transition-all">{siguienteCap ? "Siguiente" : "Finalizar"} <ChevronRight size={14} /></button>
            </div>
            {!isAdmin && !siguienteCap && listaCapitulos[indiceActual + 1] && <p className="text-[#6B5E70]/40 font-bold text-[10px] uppercase tracking-widest italic text-center">Próximo capítulo el{" "}{new Date(listaCapitulos[indiceActual + 1].fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>}
          </footer>
        )}
      </article>
    </div>
  );
}