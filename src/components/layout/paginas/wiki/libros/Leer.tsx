"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import {
  ChevronLeft, ChevronRight, List, Save, Edit3, X,
  BookOpen, Clock, AlignLeft, Maximize2, Minimize2,
  ChevronDown, Check, Eye, Type, Image, Quote,
  Folder, FolderOpen, ChevronRight as ChevronR, Loader2,
  Music2, Sword, GitMerge, MousePointerClick, PlusCircle
} from "lucide-react";
import { SoundPicker } from "@/components/forms/SoundPicker";
import { EntidadPicker } from "@/components/forms/EntidadPicker";
import { DropWord } from "@/components/ui/DropWord";
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
  | { type: "float"; word: string; url: string; caption?: string }
  | { type: "sound"; url: string; volume: number }
  | { type: "drop"; word: string; entidadTipo: "item" | "criatura" | "personaje"; entidadId: string; entidadNombre: string }
  | { type: "choice"; label: string; target: string }
  | { type: "use"; word: string; itemId: string; targetSuccess: string; targetFail?: string }
  | { type: "section"; id: string; label?: string };

type SaveStatus = "saved" | "saving" | "pending" | "offline" | "error";

function getLocalKey(capId: string) { return `cap_draft_${capId}`; }

function saveLocalDraft(capId: string, content: string) {
  try {
    localStorage.setItem(getLocalKey(capId), JSON.stringify({ content, ts: Date.now() }));
  } catch {}
}

function loadLocalDraft(capId: string): { content: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(getLocalKey(capId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearLocalDraft(capId: string) {
  try { localStorage.removeItem(getLocalKey(capId)); } catch {}
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { label: string; color: string }> = {
    saved:   { label: "Guardado",     color: "text-emerald-400" },
    saving:  { label: "Guardando…",   color: "text-primary/40" },
    pending: { label: "Sin guardar",  color: "text-amber-400"  },
    offline: { label: "Sin conexión — guardado local", color: "text-orange-400" },
    error:   { label: "Error al guardar", color: "text-red-400" },
  };
  const { label, color } = map[status];
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${color}`}>
      {status === "saving" && <Loader2 size={9} className="animate-spin" />}
      {status === "saved"  && <Check size={9} />}
      {label}
    </span>
  );
}

type SectionMap = Record<string, Segment[]>;

function parseSections(segs: Segment[]): SectionMap {
  const map: SectionMap = { "": [] };
  let current = "";
  for (const seg of segs) {
    if (seg.type === "section") {
      current = seg.id;
      if (!map[current]) map[current] = [];
    } else {
      map[current].push(seg);
    }
  }
  return map;
}

function parseContenido(texto: string): Segment[] {
  const regex = /\[\[(\w+)\|([\s\S]+?)\]\]/g;
  const segs: Segment[] = [];
  let lastIndex = 0, match: RegExpExecArray | null;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) segs.push({ type: "text", value: texto.slice(lastIndex, match.index) });
    const [, kind, rest] = match;
    const parts = rest.split("|").map(p => p.trim());
    if (kind === "cita") segs.push({ type: "cita", content: parts[0] });
    else if (kind === "img") segs.push({ type: "img", url: parts[0], caption: parts[1] });
    else if (kind === "float") segs.push({ type: "float", word: parts[0], url: parts[1], caption: parts[2] });
    else if (kind === "sound") segs.push({ type: "sound", url: parts[0], volume: parseFloat(parts[1] ?? "0.5") });
    else if (kind === "drop") segs.push({
      type: "drop",
      word: parts[0],
      entidadTipo: (parts[1] as "item" | "criatura" | "personaje"),
      entidadId: parts[2],
      entidadNombre: parts[3] ?? parts[0],
    });
    else if (kind === "choice") segs.push({ type: "choice", label: parts[0], target: parts[1] });
    else if (kind === "section") segs.push({ type: "section", id: parts[0], label: parts[1] });
    else if (kind === "use") segs.push({ 
      type: "use", 
      word: parts[0], 
      itemId: parts[1], 
      targetSuccess: parts[2], 
      targetFail: parts[3] 
    });
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
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full" style={{ background: "linear-gradient(to bottom, var(--accent), var(--color-primary, var(--primary)), var(--accent))" }} />
      <div className="absolute -top-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-[var(--accent)]" />
      <div className="absolute -bottom-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-primary" />
      <div className="pl-7 py-2 bg-gradient-to-r from-primary/5 to-transparent rounded-r-2xl">
        <span className="block font-serif text-5xl leading-none mb-2 select-none" style={{ color: "var(--accent)", opacity: 0.5, fontStyle: "italic" }} aria-hidden>"</span>
        <p className="font-serif text-lg md:text-xl italic leading-[1.9] text-primary-dark/75">{texto}</p>
        {fuente && <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-primary/40">— {fuente}</p>}
      </div>
    </div>
  );
}

function ImgInline({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="my-12 -mx-6 md:-mx-12">
      <div className="relative overflow-hidden rounded-[var(--radius-btn)] md:rounded-[var(--radius-card)] shadow-xl shadow-[var(--foreground)]/10">
        <img src={url} alt={caption ?? ""} className="w-full object-cover" style={{ maxHeight: 520 }} />
        {caption && <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[var(--bg-menu)]/60 to-transparent" />}
      </div>
      {caption && <figcaption className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary/35">{caption}</figcaption>}
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
        <span style={{ backgroundImage: "linear-gradient(var(--accent), var(--accent))", backgroundRepeat: "no-repeat", backgroundSize: "100% 1px", backgroundPosition: "0 100%", paddingBottom: "1px" }}>{word}</span>
        <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60 group-hover:bg-[var(--accent)] transition-colors" />
      </button>
      <AnimatePresence>
        {open && pos && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[55]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 8 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }} className="fixed z-[56] pointer-events-auto"
              style={{ left: Math.min(Math.max(pos.x - 160, 12), (typeof window !== "undefined" ? window.innerWidth : 800) - 332), top: Math.max(pos.y - 280 - window.scrollY, 12), width: 320 }}>
              <div className="rounded-[var(--radius-btn)] overflow-hidden shadow-2xl" style={{ boxShadow: "0 24px 64px rgba(44,38,46,0.22), 0 4px 16px rgba(44,38,46,0.12)" }}>
                <div className="relative">
                  <img src={url} alt={caption ?? word} className="w-full object-cover" style={{ maxHeight: 260 }} />
                  <button onClick={() => setOpen(false)} className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-primary-dark/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-primary-dark/70 transition-all"><X size={13} /></button>
                </div>
                {caption && <div className="bg-white-custom px-4 py-3"><p className="text-[10px] font-black uppercase tracking-widest text-primary/50 text-center">{caption}</p></div>}
              </div>
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: caption ? "8px solid white" : "8px solid var(--foreground)" }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── BOTÓN DE SONIDO INLINE ──────────────────────────────────────────────────
function SoundInline({ url, volume }: { url: string; volume: number }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const label = url.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "sonido";

  return (
    <span
      className="inline-flex items-center gap-2 mx-1 my-2 px-3 py-1.5 rounded-[var(--radius-btn)] border align-middle transition-all select-none cursor-pointer"
      style={{
        background: playing ? "var(--color-primary, var(--primary))" : "rgba(var(--color-primary-rgb, 107,94,112), 0.06)",
        borderColor: playing ? "var(--color-primary, var(--primary))" : "rgba(var(--color-primary-rgb, 107,94,112), 0.15)",
        color: playing ? "white" : "rgba(107,94,112,0.6)",
      }}
      onClick={toggle} role="button"
      title={playing ? "Detener ambientación" : "Reproducir ambientación"}
    >
      {playing ? (
        <span className="inline-flex items-end gap-px h-3">
          {[0,1,2].map(i => (
            <motion.span key={i} className="w-px rounded-full bg-white-custom" style={{ display: "inline-block" }}
              animate={{ height: ["4px","10px","5px","12px","4px"][i % 5] }}
              transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          ))}
        </span>
      ) : <Music2 size={12} />}
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
    </span>
  );
}

// ─── LÓGICA DE DECISIONES Y USO DE ITEMS ─────────────────────────────────────
function ChoiceButton({ label, onSelect }: { label: string; onSelect: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="flex items-center justify-between w-full my-3 p-4 rounded-[var(--radius-btn)] border border-primary/20 bg-primary/5 hover:bg-primary text-primary hover:text-white transition-all group"
    >
      <span className="font-black uppercase text-xs tracking-widest">{label}</span>
      <ChevronR size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
}

function UseWord({ word, itemId, targetSuccess, targetFail, onNavigate }: { word: string; itemId: string; targetSuccess: string; targetFail?: string; onNavigate: (capId: string) => void }) {
  const handleUse = async () => {
    // AQUÍ VA TU LÓGICA REAL PARA VERIFICAR SI FRANILOVER TIENE EL ITEM.
    // Simulando por ahora:
    const confirmar = confirm(`¿Quieres usar "${word}" (ID: ${itemId})?`);
    if (confirmar) {
      // Si tiene el item, lo consumes en DB y navegas:
      onNavigate(targetSuccess);
    } else {
      // Si no lo tiene o cancela, navega al fallo (si existe) o da un aviso.
      if (targetFail) {
        onNavigate(targetFail);
      } else {
        alert("No tienes el objeto necesario o decidiste no usarlo.");
      }
    }
  };

  return (
    <button onClick={handleUse} className="relative inline font-serif cursor-pointer group text-amber-600 hover:text-amber-700 font-bold transition-colors">
      <span style={{ borderBottom: "2px dotted currentColor" }}>{word}</span>
    </button>
  );
}

// ─── RENDERIZADOR DE SEGMENTOS ───────────────────────────────────────────────
function RenderSegmentos({ segs, onNavigate, isFirst = false }: {
  segs: Segment[]; onNavigate: (id: string) => void; isFirst?: boolean;
}) {
  return (
    <>
      {segs.map((seg, i) => {
        const firstText = isFirst && i === 0;
        if (seg.type === "text")   return <span key={i} className={cn("whitespace-pre-line", firstText && "first-letter:text-7xl first-letter:font-black first-letter:text-primary first-letter:mr-4 first-letter:float-left first-letter:mt-3")}>{seg.value}</span>;
        if (seg.type === "cita")   return <CitaVisual key={i} content={seg.content} />;
        if (seg.type === "img")    return <ImgInline key={i} url={seg.url} caption={seg.caption} />;
        if (seg.type === "float")  return <FloatWord key={i} word={seg.word} url={seg.url} caption={seg.caption} />;
        if (seg.type === "sound")  return <SoundInline key={i} url={seg.url} volume={seg.volume} />;
        if (seg.type === "drop")   return <DropWord key={i} word={seg.word} tipo={seg.entidadTipo} entidadId={seg.entidadId} entidadNombre={seg.entidadNombre} />;
        if (seg.type === "choice") return <ChoiceButton key={i} label={seg.label} onSelect={() => onNavigate(seg.target)} />;
        if (seg.type === "use")    return <UseWord key={i} word={seg.word} itemId={seg.itemId} targetSuccess={seg.targetSuccess} targetFail={seg.targetFail} onNavigate={onNavigate} />;
        return null;
      })}
    </>
  );
}

function ContenidoInteractivo({ texto, onNavigate }: { texto: string; onNavigate: (capId: string) => void }) {
  const allSegs      = parseContenido(texto);
  const sectionMap   = parseSections(allSegs);
  const hasSections  = Object.keys(sectionMap).length > 1; // hay al menos una [[section]]

  // historial de secciones visitadas: empieza en la raíz ""
  const [history, setHistory] = useState<string[]>([""]);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Resetear al cambiar de capítulo
  useEffect(() => { setHistory([""]); }, [texto]);

  const handleNavigate = (target: string) => {
    // Es sección local si: hay secciones, el target existe en el mapa, y NO es un UUID de capítulo
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
    const isLocalSection = hasSections && !isUUID && sectionMap[target] !== undefined;
    if (isLocalSection) {
      setHistory(prev => [...prev, target]);
      setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } else {
      // Es un capítulo externo → delegar al padre
      onNavigate(target);
    }
  };

  const handleBack = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  const currentId   = history[history.length - 1];
  const currentSegs = sectionMap[currentId] ?? sectionMap[""] ?? [];
  const canGoBack   = history.length > 1;

  return (
    <div className="text-lg md:text-xl leading-[2.2] text-primary-dark/90 font-serif">
      {/* Texto raíz — siempre visible */}
      <RenderSegmentos segs={sectionMap[""]} onNavigate={handleNavigate} isFirst />

      {/* Sección activa — con fade */}
      <AnimatePresence mode="wait">
        {currentId !== "" && (
          <motion.div
            key={currentId}
            ref={sectionRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-2"
          >
            {/* Separador visual + breadcrumb */}
            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <div className="flex items-center gap-2">
                {canGoBack && (
                  <button
                    onClick={handleBack}
                    className="text-[9px] font-black uppercase tracking-widest text-primary/30 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={10} /> volver
                  </button>
                )}
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/20 italic">
                  {history.filter(h => h !== "").join(" › ")}
                </span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>

            <RenderSegmentos segs={currentSegs} onNavigate={handleNavigate} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EXPLORADOR DE IMÁGENES ──────────────────────────────────────────────────
type InsertMode = "img" | "float";

function FolderNode({ node, depth, onSelect, selected }: { node: FolderEntry; depth: number; onSelect: (url: string) => void; selected: string | null }) {
  const [expanded, setExpanded] = useState(depth === 0);
  return (
    <div>
      <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 w-full text-left rounded-[var(--radius-input)] hover:bg-primary/5 transition-all py-1.5" style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: 12 }}>
        {expanded ? <FolderOpen size={14} className="text-[var(--accent)] shrink-0" /> : <Folder size={14} className="text-[var(--accent)]/60 shrink-0" />}
        <span className="text-[11px] font-bold text-primary-dark/70 truncate">{node.name}</span>
        <ChevronR size={11} className={cn("ml-auto text-primary/30 transition-transform shrink-0", expanded && "rotate-90")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            {node.children.map((child, i) =>
              child.type === "folder"
                ? <FolderNode key={i} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
                : <ImageThumb key={i} node={child} depth={depth + 1} onSelect={onSelect} selected={selected} />
            )}
            {node.children.length === 0 && <p className="text-[10px] text-primary/25 italic py-2" style={{ paddingLeft: `${28 + depth * 16}px` }}>Sin imágenes</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageThumb({ node, depth, onSelect, selected }: { node: FileEntry; depth: number; onSelect: (url: string) => void; selected: string | null }) {
  const isSelected = selected === node.url;
  return (
    <button onClick={() => onSelect(node.url)} className={cn("flex items-center gap-3 w-full text-left rounded-[var(--radius-input)] transition-all py-2", isSelected ? "bg-primary/12" : "hover:bg-primary/5")} style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: 12 }}>
      <div className="w-9 h-9 rounded-[var(--radius-input)] overflow-hidden shrink-0 border border-primary/10 bg-primary/5">
        <img src={node.url} alt={node.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <span className={cn("text-[11px] truncate flex-1", isSelected ? "font-bold text-primary" : "text-primary-dark/60")}>{node.name}</span>
      {isSelected && <Check size={12} className="text-primary shrink-0" />}
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
    onInsert(snippet); onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[70] bg-primary-dark/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed z-[71] inset-x-4 bottom-0 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2 md:w-[680px] bg-white-custom rounded-t-3xl md:rounded-[var(--radius-card)] shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "88vh" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-primary/8 shrink-0">
              <div>
                <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight">Explorador de imágenes</h3>
                <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest mt-0.5">/public/dibujos</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-[var(--radius-btn)] bg-primary/6 hover:bg-primary/12 flex items-center justify-center text-primary/50 transition-all"><X size={15} /></button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              <div className="w-1/2 border-r border-primary/8 overflow-y-auto py-2">
                {loading && <div className="flex items-center justify-center h-32 gap-2 text-primary/30"><Loader2 size={16} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Cargando…</span></div>}
                {error && <div className="p-6 text-center"><p className="text-[11px] text-red-400 font-bold">{error}</p><p className="text-[10px] text-primary/30 mt-1">Asegurate que existe <code className="font-mono">app/api/dibujos/route.ts</code></p></div>}
                {!loading && !error && tree.length === 0 && <p className="text-[11px] text-primary/30 italic text-center py-10 px-4">No hay imágenes en /public/dibujos</p>}
                {!loading && !error && tree.map((node, i) =>
                  node.type === "folder"
                    ? <FolderNode key={i} node={node} depth={0} onSelect={setSelected} selected={selected} />
                    : <ImageThumb key={i} node={node} depth={0} onSelect={setSelected} selected={selected} />
                )}
              </div>
              <div className="w-1/2 flex flex-col overflow-y-auto">
                {selected ? (
                  <>
                    <div className="relative bg-primary/5 shrink-0" style={{ aspectRatio: "4/3" }}>
                      <img src={selected} alt="" className="w-full h-full object-contain p-4" />
                    </div>
                    <div className="p-5 flex flex-col gap-4 flex-1">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1">Ruta</p>
                        <code className="text-[10px] text-primary/60 font-mono break-all bg-primary/5 rounded-[var(--radius-input)] px-2 py-1 block">{selected}</code>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-2">Tipo de inserción</p>
                        <div className="flex gap-2">
                          {([{ key: "img" as InsertMode, label: "Inline", desc: "Full-width en el texto" }, { key: "float" as InsertMode, label: "Flotante", desc: "Click en una palabra" }] as const).map(opt => (
                            <button key={opt.key} onClick={() => setMode(opt.key)} className={cn("flex-1 py-2 px-3 rounded-[var(--radius-btn)] text-left transition-all border", mode === opt.key ? "bg-primary border-primary text-white" : "border-primary/10 hover:bg-primary/5")}>
                              <p className={cn("text-[11px] font-black uppercase tracking-widest", mode === opt.key ? "text-white" : "text-primary")}>{opt.label}</p>
                              <p className={cn("text-[9px] mt-0.5", mode === opt.key ? "text-white/60" : "text-primary/30")}>{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <AnimatePresence>
                        {mode === "float" && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">Palabra en el texto</label>
                            <input value={word} onChange={e => setWord(e.target.value)} placeholder="ej: Kael, la espada, el castillo…" className="w-full px-3 py-2 rounded-[var(--radius-btn)] border border-primary/12 bg-primary/3 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/30 placeholder:text-primary/20" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1.5">Caption <span className="font-normal opacity-50">(opcional)</span></label>
                        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Descripción breve…" className="w-full px-3 py-2 rounded-[var(--radius-btn)] border border-primary/12 bg-primary/3 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/30 placeholder:text-primary/20" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1">Resultado</p>
                        <code className="text-[10px] text-primary/50 font-mono break-all bg-primary/5 rounded-[var(--radius-input)] px-2 py-1.5 block leading-relaxed">
                          {mode === "img" ? `[[img|${selected}${caption ? `|${caption}` : ""}]]` : `[[float|${word || "palabra"}|${selected}${caption ? `|${caption}` : ""}]]`}
                        </code>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Image size={32} className="text-primary/15 mb-3" />
                    <p className="text-[11px] font-bold text-primary/30 uppercase tracking-widest">Seleccioná una imagen</p>
                    <p className="text-[10px] text-primary/20 mt-1">del árbol de la izquierda</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-primary/8 shrink-0 flex items-center justify-between gap-4">
              <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">{selected ? "Lista para insertar" : "Ninguna seleccionada"}</p>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">Cancelar</button>
                <button onClick={handleInsert} disabled={!selected || (mode === "float" && !word.trim())} className="px-5 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-primary text-white hover:bg-primary/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5">
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

function NodeCreatorModal({ open, onClose, onInsert, libroId, nextOrder }: { open: boolean; onClose: () => void; onInsert: (s: string) => void; libroId: string; nextOrder: number }) {
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setLabel("");
  }, [open]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!label.trim()) return;
    setLoading(true);
    try {
      // NOTA: Si tu tabla en Supabase no se llama "capitulos" (ej: wiki_capitulos), cámbialo aquí abajo.
      const { data, error } = await supabase
        .from("capitulos")
        .insert({
          libro_id: libroId,
          titulo_capitulo: `[Ruta] ${label}`,
          contenido: "Continúa escribiendo tu historia aquí...",
          orden: nextOrder,
          fecha_publicacion: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (error) throw error;

      onInsert(`[[choice|${label}|${data.id}]]`);
      onClose();
    } catch (err: any) {
      alert("Error al crear el nuevo nodo/capítulo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-primary-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-full max-w-sm bg-white-custom p-6 rounded-[var(--radius-card)] shadow-2xl border border-primary/10">
        <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight mb-2 flex items-center gap-2">
          <GitMerge size={16} className="text-blue-500" /> Crear nueva ruta
        </h3>
        <p className="text-[10px] text-primary/50 mb-4">Esto generará automáticamente un nuevo capítulo vinculado a este libro y creará el botón en el editor actual.</p>
        
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Texto de la opción</label>
        <input 
          autoFocus
          value={label} 
          onChange={e => setLabel(e.target.value)} 
          placeholder="ej: Abrir el cofre" 
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/40 mb-5"
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">Cancelar</button>
          <button onClick={handleCreate} disabled={loading || !label.trim()} className="px-5 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />} 
            {loading ? "Creando..." : "Crear Ruta"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── PANEL DE ÍNDICE (DRAWER LATERAL) ───────────────────────────────────────
function IndexPanel({ open, onClose, lista, capIdActual, isAdmin, libroTitulo, onSelect }: {
  open: boolean; onClose: () => void; lista: CapituloLista[]; capIdActual: string;
  isAdmin: boolean; libroTitulo?: string; onSelect: (id: string) => void;
}) {
  const hoy = new Date().toISOString().split("T")[0];
  const capActualRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => capActualRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-primary-dark/30 backdrop-blur-sm" />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }} className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-sm bg-bg-main shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-primary/8 shrink-0">
              <div>
                {libroTitulo && <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 italic mb-0.5">{libroTitulo}</p>}
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><List size={13} /> Índice</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-[var(--radius-btn)] bg-primary/6 hover:bg-primary/12 flex items-center justify-center text-primary/40 hover:text-primary transition-all"><X size={15} /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {lista.filter(cap => isAdmin || cap.fecha_publicacion <= hoy).map((cap) => {
                const esActual = cap.id === capIdActual;
                const esFuturo = isAdmin && cap.fecha_publicacion > hoy;
                return (
                  <button key={cap.id} ref={esActual ? capActualRef : undefined} onClick={() => { onSelect(cap.id); onClose(); }}
                    className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-[var(--radius-btn)] text-left transition-all mb-1", esActual ? "bg-primary text-white" : "hover:bg-primary/6 text-primary-dark")}
                  >
                    <span className={cn("text-[10px] font-black w-6 shrink-0 text-center tabular-nums", esActual ? "text-white/60" : "text-primary/40")}>{cap.orden}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("block text-[12px] font-bold leading-snug uppercase tracking-tight truncate", esActual ? "text-white" : "text-primary-dark")}>
                        {cap.titulo_capitulo || `Capítulo ${cap.orden}`}
                      </span>
                      {esFuturo && <span className="text-[8px] font-black uppercase tracking-widest text-primary/40 mt-0.5 block">Programado · {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>}
                    </div>
                    {esActual ? <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" /> : <ChevronR size={13} className="text-primary/20 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-all text-primary text-[10px] font-black uppercase tracking-widest">
        <BookOpen size={13} /> Cap. {capActual?.orden ?? "—"} <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }} className="absolute left-0 top-full mt-2 w-64 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] shadow-2xl z-50 overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              {lista.map(cap => {
                const publicado = isAdmin || cap.fecha_publicacion <= hoy;
                const esActual = cap.id === capIdActual;
                return (
                  <button key={cap.id} disabled={!publicado} onClick={() => { onSelect(cap.id); setOpen(false); }}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all", esActual ? "bg-primary/8 text-primary" : publicado ? "hover:bg-primary/5 text-primary-dark/80" : "opacity-30 cursor-not-allowed text-primary-dark/40")}
                  >
                    <span className="text-[10px] font-black text-primary/40 w-6 shrink-0">{cap.orden}</span>
                    <span className="text-xs font-semibold truncate flex-1">{cap.titulo_capitulo ?? `Capítulo ${cap.orden}`}</span>
                    {esActual && <Check size={12} className="text-primary shrink-0" />}
                    {!publicado && <span className="text-[9px] text-primary/30 shrink-0">{new Date(cap.fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MODAL GUI: CITA VISUAL ──────────────────────────────────────────────────
function CitaModal({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (s: string) => void }) {
  const [texto, setTexto] = useState("");
  const [fuente, setFuente] = useState("");
  useEffect(() => { if (open) { setTexto(""); setFuente(""); } }, [open]);
  if (!open) return null;
  const snippet = fuente.trim() ? `[[cita|${texto} — ${fuente}]]` : `[[cita|${texto}]]`;
  const handleInsert = () => { if (!texto.trim()) return; onInsert(snippet); onClose(); };
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-primary-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-full max-w-md bg-white-custom p-6 rounded-[var(--radius-card)] shadow-2xl border border-primary/10">
        <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight mb-1 flex items-center gap-2">
          <Quote size={16} className="text-amber-500" /> Cita visual
        </h3>
        <p className="text-[10px] text-primary/40 mb-4">Bloque decorativo con línea lateral y tipografía serif.</p>
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Texto de la cita *</label>
        <textarea autoFocus rows={3} value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="El texto que será citado…"
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/40 mb-3 resize-none"
        />
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Fuente <span className="font-normal opacity-50">(opcional)</span></label>
        <input value={fuente} onChange={e => setFuente(e.target.value)} placeholder="ej: Crónicas del Norte, vol. II"
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/40 mb-4"
          onKeyDown={e => { if (e.key === "Enter") handleInsert(); }}
        />
        {texto.trim() && (
          <div className="mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1">Vista previa</p>
            <code className="text-[10px] text-primary/50 font-mono break-all bg-primary/5 rounded-[var(--radius-input)] px-3 py-2 block">{snippet}</code>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">Cancelar</button>
          <button onClick={handleInsert} disabled={!texto.trim()} className="px-5 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center gap-1.5">
            <Quote size={12} /> Insertar Cita
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MODAL GUI: USAR ÍTEM ────────────────────────────────────────────────────
function UseModal({ open, onClose, onInsert, listaCapitulos }: { open: boolean; onClose: () => void; onInsert: (s: string) => void; listaCapitulos: CapituloLista[] }) {
  const [word, setWord] = useState("");
  const [itemId, setItemId] = useState("");
  const [targetSuccess, setTargetSuccess] = useState("");
  const [targetFail, setTargetFail] = useState("");
  useEffect(() => { if (open) { setWord(""); setItemId(""); setTargetSuccess(""); setTargetFail(""); } }, [open]);
  if (!open) return null;
  const snippet = `[[use|${word || "palabra"}|${itemId || "id-item"}|${targetSuccess || "id-cap-exito"}${targetFail ? `|${targetFail}` : ""}]]`;
  const handleInsert = () => {
    if (!word.trim() || !itemId.trim() || !targetSuccess.trim()) return;
    onInsert(`[[use|${word}|${itemId}|${targetSuccess}${targetFail.trim() ? `|${targetFail}` : ""}]]`);
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-primary-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-full max-w-md bg-white-custom p-6 rounded-[var(--radius-card)] shadow-2xl border border-primary/10 overflow-y-auto" style={{ maxHeight: "90vh" }}>
        <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight mb-1 flex items-center gap-2">
          <MousePointerClick size={16} className="text-rose-500" /> Usar Ítem
        </h3>
        <p className="text-[10px] text-primary/40 mb-4">Requiere un ítem del inventario para avanzar.</p>
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Palabra en el texto *</label>
        <input value={word} onChange={e => setWord(e.target.value)} placeholder="ej: usar llave, abrir cofre…"
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/40 mb-3" />
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">ID del ítem (UUID) *</label>
        <input value={itemId} onChange={e => setItemId(e.target.value)} placeholder="ej: 550e8400-e29b-41d4-a716-446655440000"
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-mono text-primary-dark focus:outline-none focus:border-primary/40 mb-3" />
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Capítulo si TIENE el ítem *</label>
        <select value={targetSuccess} onChange={e => setTargetSuccess(e.target.value)}
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm text-primary-dark focus:outline-none focus:border-primary/40 mb-3">
          <option value="">— Seleccionar capítulo —</option>
          {listaCapitulos.map(c => <option key={c.id} value={c.id}>Cap. {c.orden} — {c.titulo_capitulo || `Capítulo ${c.orden}`}</option>)}
        </select>
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Capítulo si NO tiene el ítem <span className="font-normal opacity-50">(opcional)</span></label>
        <select value={targetFail} onChange={e => setTargetFail(e.target.value)}
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm text-primary-dark focus:outline-none focus:border-primary/40 mb-4">
          <option value="">— Ninguno —</option>
          {listaCapitulos.map(c => <option key={c.id} value={c.id}>Cap. {c.orden} — {c.titulo_capitulo || `Capítulo ${c.orden}`}</option>)}
        </select>
        <div className="mb-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1">Vista previa</p>
          <code className="text-[10px] text-primary/50 font-mono break-all bg-primary/5 rounded-[var(--radius-input)] px-3 py-2 block">{snippet}</code>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">Cancelar</button>
          <button onClick={handleInsert} disabled={!word.trim() || !itemId.trim() || !targetSuccess} className="px-5 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center gap-1.5">
            <MousePointerClick size={12} /> Insertar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MODAL GUI: CHOICE (botón de decisión inline) ────────────────────────────
function ChoiceModal({ open, onClose, onInsert, listaCapitulos }: {
  open: boolean; onClose: () => void; onInsert: (s: string) => void; listaCapitulos: CapituloLista[];
}) {
  const [label, setLabel]   = useState("");
  const [target, setTarget] = useState("");
  const [mode, setMode]     = useState<"existing" | "manual">("existing");
  useEffect(() => { if (open) { setLabel(""); setTarget(""); setMode("existing"); } }, [open]);
  if (!open) return null;

  const snippet = label.trim() && target.trim() ? `[[choice|${label}|${target}]]` : "";
  const handleInsert = () => { if (!label.trim() || !target.trim()) return; onInsert(snippet); onClose(); };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-primary-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-full max-w-md bg-white-custom p-6 rounded-[var(--radius-card)] shadow-2xl border border-primary/10">
        <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight mb-1 flex items-center gap-2">
          <ChevronR size={16} className="text-blue-500" /> Botón de decisión
        </h3>
        <p className="text-[10px] text-primary/40 mb-4">Crea un botón que lleva al lector a otra sección o capítulo.</p>

        {/* Tabs: sección del mismo cap vs capítulo existente */}
        <div className="flex gap-1 p-1 bg-primary/5 rounded-[var(--radius-btn)] mb-4">
          {([
            { key: "existing", label: "Capítulo existente" },
            { key: "manual",   label: "Sección / ID manual" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => { setMode(tab.key); setTarget(""); }}
              className={cn("flex-1 py-1.5 rounded-[var(--radius-input)] text-[10px] font-black uppercase tracking-widest transition-all",
                mode === tab.key ? "bg-white-custom shadow text-primary" : "text-primary/40 hover:text-primary")}>
              {tab.label}
            </button>
          ))}
        </div>

        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Texto del botón *</label>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
          placeholder="ej: Abrir el cofre, Huir, Atacar…"
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/40 mb-3"
          onKeyDown={e => { if (e.key === "Enter") handleInsert(); }}
        />

        {mode === "existing" ? (
          <>
            <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Capítulo destino *</label>
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm text-primary-dark focus:outline-none focus:border-primary/40 mb-4">
              <option value="">— Seleccionar capítulo —</option>
              {listaCapitulos.map(c => (
                <option key={c.id} value={c.id}>Cap. {c.orden} — {c.titulo_capitulo || `Capítulo ${c.orden}`}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">ID de sección o capítulo *</label>
            <input value={target} onChange={e => setTarget(e.target.value)}
              placeholder="ej: cofre  (debe coincidir con [[section|cofre]])"
              className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-mono text-primary-dark focus:outline-none focus:border-primary/40 mb-4"
              onKeyDown={e => { if (e.key === "Enter") handleInsert(); }}
            />
          </>
        )}

        {snippet && (
          <div className="mb-4 p-3 bg-blue-50 rounded-[var(--radius-btn)] border border-blue-100">
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Snippet</p>
            <code className="text-[11px] text-blue-600 font-mono">{snippet}</code>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">Cancelar</button>
          <button onClick={handleInsert} disabled={!label.trim() || !target.trim()}
            className="px-5 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-1.5">
            <ChevronR size={12} /> Insertar Choice
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MODAL GUI: SECCIÓN ──────────────────────────────────────────────────────
function SectionModal({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (s: string) => void }) {
  const [sectionId, setSectionId] = useState("");
  const [label, setLabel]         = useState("");
  useEffect(() => { if (open) { setSectionId(""); setLabel(""); } }, [open]);
  if (!open) return null;
  const autoId = sectionId || label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const snippet = label ? `[[section|${autoId}|${label}]]` : `[[section|${autoId}]]`;
  const handleInsert = () => { if (!autoId) return; onInsert(snippet); onClose(); };
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-primary-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-full max-w-md bg-white-custom p-6 rounded-[var(--radius-card)] shadow-2xl border border-primary/10">
        <h3 className="text-sm font-black text-primary-dark uppercase tracking-tight mb-1 flex items-center gap-2">
          <GitMerge size={16} className="text-violet-500" /> Nueva Sección
        </h3>
        <p className="text-[10px] text-primary/40 mb-5">
          Divide el capítulo en ramas. Apunta con <code className="font-mono bg-primary/8 px-1 rounded">[[choice|Texto|id]]</code> al mismo ID.
        </p>
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Nombre visible <span className="font-normal opacity-50">(opcional)</span></label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="ej: Abrir el cofre"
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-serif text-primary-dark focus:outline-none focus:border-primary/40 mb-3" />
        <label className="block text-[9px] font-black uppercase tracking-widest text-primary/40 mb-1.5">ID <span className="font-normal opacity-50">(debe coincidir con el target del choice)</span></label>
        <input value={sectionId} onChange={e => setSectionId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder={autoId || "ej: cofre"}
          className="w-full px-4 py-3 rounded-[var(--radius-btn)] border border-primary/15 bg-primary/5 text-sm font-mono text-primary-dark focus:outline-none focus:border-primary/40 mb-4"
          onKeyDown={e => { if (e.key === "Enter") handleInsert(); }}
        />
        <div className="mb-4 p-3 bg-violet-50 rounded-[var(--radius-btn)] border border-violet-100">
          <p className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1">Snippet</p>
          <code className="text-[11px] text-violet-600 font-mono">{snippet}</code>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-primary/40 hover:bg-primary/5 transition-all">Cancelar</button>
          <button onClick={handleInsert} disabled={!autoId} className="px-5 py-2 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center gap-1.5">
            <GitMerge size={12} /> Insertar Sección
          </button>
        </div>
      </div>
    </>
  );
}

// ─── TOOLBAR DROPDOWN HELPER ─────────────────────────────────────────────────
function ToolbarDropdown({ label, icon: Icon, color = "text-primary/50", children }: {
  label: string; icon: React.ElementType; color?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-primary/8 border border-transparent hover:border-primary/10", color, open && "bg-primary/8 border-primary/10")}
      >
        <Icon size={13} />
        <span>{label}</span>
        <ChevronDown size={10} className={cn("transition-transform opacity-50", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 top-full mt-1.5 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] shadow-2xl z-50 overflow-hidden min-w-[180px]"
            onClick={() => setOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownItem({ icon: Icon, label, desc, color = "text-primary-dark", onClick }: {
  icon: React.ElementType; label: string; desc?: string; color?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-all text-left group">
      <div className={cn("w-7 h-7 rounded-[var(--radius-input)] flex items-center justify-center shrink-0 bg-primary/6 group-hover:bg-primary/12 transition-all", color)}>
        <Icon size={13} />
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-primary-dark leading-none">{label}</p>
        {desc && <p className="text-[9px] text-primary/35 mt-0.5 leading-snug">{desc}</p>}
      </div>
    </button>
  );
}

function DropdownDivider() {
  return <div className="mx-3 my-1 h-px bg-primary/8" />;
}

// ─── EDITOR TOOLBAR ──────────────────────────────────────────────────────────
function EditorToolbar({ textareaRef, value, onChange, onSave, onCancel, saving, saveStatus, libroId, nextOrder, listaCapitulos }: {
  textareaRef: React.RefObject<HTMLTextAreaElement>; value: string; onChange: (v: string) => void;
  onSave: () => void; onCancel: () => void; saving: boolean; saveStatus: SaveStatus; libroId: string; nextOrder: number;
  listaCapitulos: CapituloLista[];
}) {
  const { words, readMin } = useTextStats(value);
  const [focusMode, setFocusMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [dropPickerOpen, setDropPickerOpen] = useState(false);
  const [nodeCreatorOpen, setNodeCreatorOpen] = useState(false);
  const [citaModalOpen, setCitaModalOpen] = useState(false);
  const [useModalOpen, setUseModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);

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

  const BarContent = ({ isFocus = false }: { isFocus?: boolean }) => (
    <div className={cn("flex items-center gap-1.5 flex-wrap", isFocus ? "px-8 py-3" : "px-4 py-2")}>

      {/* ── TEXTO ───────────────────────────────────────────── */}
      <ToolbarDropdown label="Texto" icon={Type} color="text-primary/50">
        <div className="px-2 py-1.5">
          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25 px-2 mb-1">Caracteres especiales</p>
          {([
            { label: "« Comillas »",   title: "Comillas latinas", action: () => insertAround("«", "»") },
            { label: "— — — Separador", title: "Separador",       action: () => insertAtCursor("\n— — —\n") },
            { label: "… Elipsis",      title: "Elipsis",          action: () => insertAtCursor("…") },
            { label: "— Guión largo",  title: "Guión largo",      action: () => insertAtCursor("—") },
            { label: "¶ Párrafo",      title: "Párrafo",          action: () => insertAtCursor("\n\n") },
          ] as const).map((t) => (
            <button key={t.title} onClick={t.action} title={t.title}
              className="w-full text-left px-3 py-2 rounded-[var(--radius-btn)] text-[11px] font-mono font-bold text-primary/60 hover:text-primary hover:bg-primary/6 transition-all">
              {t.label}
            </button>
          ))}
        </div>
        <DropdownDivider />
        <div className="px-2 py-1.5">
          <DropdownItem icon={Quote} label="Cita visual" desc="Bloque decorativo con fuente" onClick={() => setCitaModalOpen(true)} />
        </div>
      </ToolbarDropdown>

      {/* ── MEDIOS ──────────────────────────────────────────── */}
      <ToolbarDropdown label="Medios" icon={Image} color="text-emerald-600">
        <div className="px-2 py-1.5">
          <DropdownItem icon={Image}  label="Imagen / Flotante" desc="Inline o clickeable en palabra" color="text-emerald-600" onClick={() => setPickerOpen(true)} />
          <DropdownItem icon={Music2} label="Sonido ambiente"   desc="Música o efecto de fondo"      color="text-indigo-500"  onClick={() => setSoundPickerOpen(true)} />
        </div>
      </ToolbarDropdown>

      {/* ── INTERACCIÓN ─────────────────────────────────────── */}
      <ToolbarDropdown label="Interacción" icon={GitMerge} color="text-blue-500">
        <div className="px-2 py-1.5">
          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25 px-2 mb-1">Narrativa ramificada</p>
          <DropdownItem icon={GitMerge}          label="Nueva ruta"     desc="Crea cap. y enlaza choice"      color="text-blue-500"   onClick={() => setNodeCreatorOpen(true)} />
          <DropdownItem icon={ChevronR}          label="Sección / Rama" desc="Rama dentro del mismo capítulo" color="text-violet-500" onClick={() => setSectionModalOpen(true)} />
          <DropdownItem icon={GitMerge}          label="Choice (botón)"  desc="Apunta a sección o capítulo"    color="text-blue-400"   onClick={() => setChoiceModalOpen(true)} />
        </div>
        <DropdownDivider />
        <div className="px-2 py-1.5">
          <p className="text-[8px] font-black uppercase tracking-widest text-primary/25 px-2 mb-1">Objetos e ítems</p>
          <DropdownItem icon={Sword}             label="Drop"       desc="Otorga ítem o criatura"         color="text-amber-500" onClick={() => setDropPickerOpen(true)} />
          <DropdownItem icon={MousePointerClick} label="Usar ítem"  desc="Requiere ítem para avanzar"     color="text-rose-500"  onClick={() => setUseModalOpen(true)} />
        </div>
      </ToolbarDropdown>

      <div className="w-px h-5 bg-primary/10 mx-0.5" />

      {/* ── STATS ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-primary/25">
        <span className="flex items-center gap-1"><AlignLeft size={10} /> {words.toLocaleString()}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> ~{readMin}m</span>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* ── ACCIONES ────────────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2">
        {!isFocus && (
          <button onClick={() => setFocusMode(true)} title="Modo focus" className="p-1.5 rounded-[var(--radius-input)] text-primary/40 hover:text-primary hover:bg-primary/8 transition-all">
            <Maximize2 size={14} />
          </button>
        )}
        <button onClick={onCancel} className="px-3 py-1.5 rounded-[var(--radius-btn)] text-[10px] font-black uppercase text-red-400 hover:bg-red-50 transition-all flex items-center gap-1">
          <X size={12} /> Cancelar
        </button>
        <button onClick={onSave} disabled={saving} className="px-4 py-1.5 rounded-[var(--radius-btn)] text-[10px] font-black uppercase bg-primary text-white hover:bg-primary/80 transition-all flex items-center gap-1.5 disabled:opacity-50">
          <Save size={12} /> {saving ? "…" : "Guardar"}
        </button>
        {isFocus && (
          <button onClick={() => setFocusMode(false)} className="p-2 rounded-[var(--radius-btn)] text-primary/40 hover:text-primary hover:bg-primary/8 transition-all">
            <Minimize2 size={14} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <NodeCreatorModal open={nodeCreatorOpen} onClose={() => setNodeCreatorOpen(false)} onInsert={insertAtCursor} libroId={libroId} nextOrder={nextOrder} />
      <ImagePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onInsert={insertAtCursor} />
      <SoundPicker open={soundPickerOpen} onClose={() => setSoundPickerOpen(false)} onInsert={insertAtCursor} />
      <EntidadPicker open={dropPickerOpen} onClose={() => setDropPickerOpen(false)} onInsert={insertAtCursor} />
      <CitaModal open={citaModalOpen} onClose={() => setCitaModalOpen(false)} onInsert={insertAtCursor} />
      <UseModal open={useModalOpen} onClose={() => setUseModalOpen(false)} onInsert={insertAtCursor} listaCapitulos={listaCapitulos} />
      <SectionModal open={sectionModalOpen} onClose={() => setSectionModalOpen(false)} onInsert={insertAtCursor} />
      <ChoiceModal open={choiceModalOpen} onClose={() => setChoiceModalOpen(false)} onInsert={insertAtCursor} listaCapitulos={listaCapitulos} />
      <div className="sticky top-[65px] z-40 bg-white-custom/90 backdrop-blur-md border-b border-primary/8">
        <BarContent isFocus={false} />
      </div>
      <AnimatePresence>
        {focusMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-bg-main z-50 flex flex-col">
            <ImagePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onInsert={insertAtCursor} />
            <EntidadPicker open={dropPickerOpen} onClose={() => setDropPickerOpen(false)} onInsert={insertAtCursor} />
            <div className="bg-white-custom/80 backdrop-blur-md border-b border-primary/8">
              <BarContent isFocus={true} />
            </div>
            <div className="flex-1 overflow-auto flex justify-center py-12 px-6">
              <textarea
                ref={textareaRef} value={value} onChange={e => onChange(e.target.value)} autoFocus
                className="w-full max-w-2xl bg-transparent font-serif text-xl leading-[2.2] text-primary-dark focus:outline-none resize-none"
                placeholder={"Escribe aquí…\n\n[[cita|Texto. — Fuente]]\n[[img|url|caption]]\n[[float|palabra|url|caption]]\n[[drop|palabra|item|uuid|Nombre]]"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
// ─── SKELETON DE CARGA ───────────────────────────────────────────────────────
function LectorSkeleton() {
  return (
    <div className="min-h-screen bg-bg-main pb-24 animate-pulse">
      <div className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="w-6 h-6 rounded-[var(--radius-input)] bg-primary/10" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-primary/10" />
            <div className="h-6 w-32 rounded-[var(--radius-btn)] bg-primary/10" />
          </div>
          <div className="w-6 h-6 rounded-[var(--radius-input)] bg-primary/10" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <div className="text-center mb-12 space-y-3">
          <div className="h-10 w-16 rounded-[var(--radius-btn)] bg-primary/8 mx-auto" />
          <div className="h-8 w-2/3 rounded-[var(--radius-btn)] bg-primary/10 mx-auto" />
          <div className="h-3 w-40 rounded-full bg-primary/8 mx-auto" />
        </div>
        <div className="space-y-4">
          {[100, 85, 95, 70, 90, 60, 80, 75].map((w, i) => (
            <div key={i} className="h-4 rounded-full bg-primary/8" style={{ width: `${w}%` }} />
          ))}
          <div className="h-4 w-1/2 rounded-full bg-primary/8" />
        </div>
      </div>
    </div>
  );
}

// ─── CAPÍTULO INDIVIDUAL EN MODO SCROLL ──────────────────────────────────────
interface CapituloScrollItem {
  id: string;
  orden: number;
  titulo_capitulo: string;
  contenido: string;
  fecha_publicacion: string;
  libros?: { titulo?: string };
}

function CapituloScrollBlock({
  cap,
  isAdmin,
  isEditing,
  onStartEdit,
  onNavigate,
}: {
  cap: CapituloScrollItem;
  isAdmin: boolean;
  isEditing: boolean;
  onStartEdit: (cap: CapituloScrollItem) => void;
  onNavigate: (capId: string) => void;
}) {
  const { words } = useTextStats(cap.contenido ?? "");
  return (
    <article
      id={`cap-${cap.id}`}
      className="max-w-2xl mx-auto px-6 py-16 md:py-24 scroll-mt-20"
    >
      <header className="mb-12 text-center">
        <span className="text-primary/20 font-serif italic text-4xl block mb-2">§ {cap.orden}</span>
        <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tighter uppercase italic leading-none">
          {cap.titulo_capitulo}
        </h1>
        <div className="flex items-center justify-center gap-4 mt-4 text-[9px] font-black uppercase tracking-widest text-primary/25">
          <span className="flex items-center gap-1"><AlignLeft size={9} /> {words.toLocaleString()} palabras</span>
          <span className="flex items-center gap-1"><Clock size={9} /> ~{Math.max(1, Math.round(words / 200))} min</span>
          {isAdmin && (
            <button
              onClick={() => onStartEdit(cap)}
              className="flex items-center gap-1 text-primary/30 hover:text-primary transition-colors"
            >
              <Edit3 size={9} /> Editar
            </button>
          )}
        </div>
      </header>

      <div className="min-h-[20vh]">
        <ContenidoInteractivo texto={cap.contenido ?? ""} onNavigate={onNavigate} />
      </div>

      {/* Separador entre capítulos */}
      <div className="mt-20 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <span className="text-primary/20 font-serif italic text-2xl select-none">✦</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      </div>
    </article>
  );
}

// ─── MODAL DE EDICIÓN INLINE (para modo scroll) ───────────────────────────────
function EditCapModal({
  cap,
  listaCapitulos,
  onClose,
  onSaved,
}: {
  cap: CapituloScrollItem;
  listaCapitulos: CapituloLista[];
  onClose: () => void;
  onSaved: (id: string, nuevoContenido: string) => void;
}) {
  const [nuevoContenido, setNuevoContenido] = useState(cap.contenido ?? "");
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(cap.contenido ?? "");
  const { words: wordsEdit } = useTextStats(nuevoContenido);
  const { words: wordsPublicado } = useTextStats(cap.contenido ?? "");

  const handleNavigate = useCallback((capId: string) => {
    onClose();
    setTimeout(() => {
      document.getElementById(`cap-${capId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [onClose]);

  useEffect(() => {
    if (nuevoContenido === lastSavedContent.current) return;
    setSaveStatus("pending");
    saveLocalDraft(cap.id, nuevoContenido);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!navigator.onLine) { setSaveStatus("offline"); return; }
      setSaveStatus("saving");
      try {
        const { error: saveError } = await librosQueries.updateContenido(cap.id, nuevoContenido);
        if (saveError) throw saveError;
        lastSavedContent.current = nuevoContenido;
        clearLocalDraft(cap.id);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("offline");
      }
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevoContenido]);

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setSaveStatus("saving");
    try {
      const { error: saveError } = await librosQueries.updateContenido(cap.id, nuevoContenido);
      if (saveError) throw saveError;
      lastSavedContent.current = nuevoContenido;
      clearLocalDraft(cap.id);
      setSaveStatus("saved");
      onSaved(cap.id, nuevoContenido);
      onClose();
    } catch (err: any) {
      setSaveStatus("error");
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-bg-main flex flex-col"
    >
      <EditorToolbar
        textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
        value={nuevoContenido}
        onChange={setNuevoContenido}
        onSave={handleSave}
        onCancel={onClose}
        saving={saving}
        saveStatus={saveStatus}
        libroId={cap.libros?.titulo ?? ""}
        nextOrder={listaCapitulos.length + 1}
        listaCapitulos={listaCapitulos}
      />

      {/* Draft recovery banner */}
      {saveStatus === "pending" && loadLocalDraft(cap.id) && (
        <div className="max-w-2xl mx-auto w-full px-6 pt-4">
          <div className="rounded-[var(--radius-btn)] bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">⚠ Borrador local recuperado</p>
            <button onClick={() => { setNuevoContenido(cap.contenido ?? ""); clearLocalDraft(cap.id); setSaveStatus("saved"); }} className="text-[9px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-600 shrink-0">Descartar</button>
          </div>
        </div>
      )}

      {/* Header del cap dentro del editor */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-6 pb-2 text-center shrink-0">
        <span className="text-primary/20 font-serif italic text-2xl">§ {cap.orden}</span>
        <h2 className="text-xl font-black text-primary tracking-tighter uppercase italic">{cap.titulo_capitulo}</h2>
      </div>

      {/* Tabs editar / preview */}
      <div className="max-w-2xl mx-auto w-full px-6 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {([{ key: false, icon: Edit3, label: "Editar" }, { key: true, icon: Eye, label: "Preview" }] as const).map(({ key, icon: Icon, label }) => (
            <button key={String(key)} onClick={() => setPreviewMode(key as boolean)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] text-[10px] font-black uppercase tracking-widest transition-all", previewMode === key ? "bg-primary text-white" : "text-primary/50 hover:bg-primary/8")}>
              <Icon size={11} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-10">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {previewMode
              ? <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[60vh] p-8 bg-white-custom border border-primary/10 rounded-[var(--radius-card)] overflow-hidden"><ContenidoInteractivo texto={nuevoContenido} onNavigate={handleNavigate} /></motion.div>
              : <motion.textarea key="editor" ref={textareaRef as any} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} value={nuevoContenido} onChange={e => setNuevoContenido(e.target.value)} className="w-full min-h-[60vh] p-8 bg-white-custom border border-primary/10 rounded-[var(--radius-card)] font-serif text-lg leading-relaxed text-primary-dark focus:outline-none focus:border-primary/30 shadow-inner resize-none" autoFocus placeholder={"Escribe aquí…\n\n[[choice|Opción|ID_Capitulo]]"} />
            }
          </AnimatePresence>
          <div className="flex justify-end mt-3 px-2">
            {wordsEdit !== wordsPublicado && wordsEdit > 0 && (
              <span className={cn("text-[9px] font-black uppercase tracking-widest", wordsEdit > wordsPublicado ? "text-emerald-400" : "text-amber-400")}>
                {wordsEdit > wordsPublicado ? "+" : ""}{wordsEdit - wordsPublicado} palabras vs. guardado
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function Lector() {
  const params = useParams();
  const id = params?.id as string;
  const capId = params?.capId as string;
  const router = useRouter();

  const [capitulos, setCapitulos] = useState<CapituloScrollItem[]>([]);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [editingCap, setEditingCap] = useState<CapituloScrollItem | null>(null);
  const libroTitulo = capitulos[0]?.libros?.titulo;
  const hasScrolled = useRef(false);

  // Scroll al capítulo objetivo una vez que cargaron los datos
  // Prioriza el hash de la URL (ej: #cap-{id}) sobre el capId de la ruta
  useEffect(() => {
    if (loading || hasScrolled.current) return;
    hasScrolled.current = true;
    const hashCapId = typeof window !== "undefined"
      ? window.location.hash.replace("#cap-", "")
      : "";
    const targetId = hashCapId || capId;
    setTimeout(() => {
      document.getElementById(`cap-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }, [loading, capId]);

  // Si cambia el capId en la URL (navegación entre caps) hacer scroll sin recargar
  useEffect(() => {
    if (loading || !capId) return;
    document.getElementById(`cap-${capId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [capId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!capId || !id) return;
    Promise.all([
      supabase.auth.getSession(),
      librosQueries.getCapituloParaLectura(capId, id, true),
    ]).then(async ([sessionRes, queryRes]) => {
      const session = sessionRes.data.session;
      let admin = false;
      if (session) {
        const { data: perfil } = await supabase
          .from("perfiles")
          .select("rol")
          .eq("id", session.user.id)
          .single();
        admin = perfil?.rol === "admin";
      }
      setIsAdmin(admin);

      if (queryRes.error || !queryRes.data) {
        setError(queryRes.error || "No se pudo cargar el capítulo");
        return;
      }

      const lista = queryRes.data.listaCapitulos;
      setListaCapitulos(lista);

      // Cargar contenido de todos los capítulos publicados (o todos si admin)
      const hoy = new Date().toISOString().split("T")[0];
      const idsACargar = lista
        .filter(c => admin || c.fecha_publicacion <= hoy)
        .map(c => c.id);

      const { data: contenidos } = await supabase
        .from("capitulos")
        .select("id, orden, titulo_capitulo, contenido, fecha_publicacion, libros(titulo)")
        .in("id", idsACargar)
        .order("orden", { ascending: true });

      setCapitulos((contenidos as CapituloScrollItem[]) ?? []);
    }).catch((err) => {
      console.error("Error crítico en Lector:", err);
      setError("Error al abrir el pergamino");
    }).finally(() => setLoading(false));
  }, [capId, id]);

  const handleNavigate = useCallback((targetCapId: string) => {
    // Scroll al capítulo si ya está cargado, si no navegar
    const el = document.getElementById(`cap-${targetCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(`/wiki/libros/${id}/leer/${targetCapId}`, { scroll: false });
    } else {
      router.push(`/wiki/libros/${id}/leer/${targetCapId}`);
    }
  }, [id, router]);

  const handleChapterSelect = useCallback((newCapId: string) => {
    const el = document.getElementById(`cap-${newCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(`/wiki/libros/${id}/leer/${newCapId}`, { scroll: false });
    } else {
      router.push(`/wiki/libros/${id}/leer/${newCapId}`);
    }
  }, [id, router]);

  const handleSaved = useCallback((savedId: string, newContent: string) => {
    setCapitulos(prev => prev.map(c => c.id === savedId ? { ...c, contenido: newContent } : c));
  }, []);

  if (loading) return <LectorSkeleton />;
  if (error || capitulos.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">{error || "No hay capítulos disponibles"}</h2>
      <button onClick={() => router.push(`/wiki/libros/${id}`)} className="text-[10px] font-black uppercase border-b-2 border-primary pb-1">Volver al índice</button>
    </div>
  );

  const capActual = capitulos.find(c => c.id === capId) ?? capitulos[0];

  return (
    <div className="min-h-screen bg-bg-main text-primary-dark pb-24">
      <IndexPanel
        open={showIndex}
        onClose={() => setShowIndex(false)}
        lista={listaCapitulos}
        capIdActual={capId}
        isAdmin={isAdmin}
        libroTitulo={libroTitulo}
        onSelect={(id) => { handleChapterSelect(id); setShowIndex(false); }}
      />

      {/* Editor modal de pantalla completa */}
      <AnimatePresence>
        {editingCap && (
          <EditCapModal
            cap={editingCap}
            listaCapitulos={listaCapitulos}
            onClose={() => setEditingCap(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      {/* Navbar fija */}
      <nav className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => router.push(`/wiki/libros/${id}`)} className="text-primary/40 hover:text-primary transition-colors shrink-0">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center gap-1 min-w-0">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 leading-none truncate">{libroTitulo}</h2>
            {listaCapitulos.length > 1
              ? <ChapterSelector lista={listaCapitulos} capIdActual={capId} isAdmin={isAdmin} onSelect={handleChapterSelect} />
              : <p className="text-[11px] font-bold text-primary uppercase">Capítulo {capActual?.orden}</p>
            }
          </div>
          <button onClick={() => setShowIndex(true)} className="text-primary/40 hover:text-primary transition-colors shrink-0">
            <List size={24} />
          </button>
        </div>
      </nav>

      {/* Todos los capítulos en scroll continuo */}
      {capitulos.map((cap) => (
        <CapituloScrollBlock
          key={cap.id}
          cap={cap}
          isAdmin={isAdmin}
          isEditing={editingCap?.id === cap.id}
          onStartEdit={setEditingCap}
          onNavigate={handleNavigate}
        />
      ))}

      {/* Footer al final del scroll */}
      <footer className="max-w-2xl mx-auto px-6 pb-20 pt-4 flex flex-col items-center gap-6">
        <button
          onClick={() => router.push(`/wiki/libros/${id}`)}
          className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <List size={16} /> Volver al índice
        </button>
      </footer>
    </div>
  );
}