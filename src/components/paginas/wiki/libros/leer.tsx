"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import {
  ChevronLeft, List, X,
  BookOpen, Clock, AlignLeft,
  ChevronDown, Check,
  Folder, FolderOpen, ChevronRight as ChevronR,
  Music2, Sword, MousePointerClick, Loader2
} from "lucide-react";
import { DropWord } from "@/components/ui/DropWord";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { librosQueries, Capitulo } from "@/lib/api/queries/wiki/libros";
import { Btn, BtnIcon, Loading } from "@/components/ui";

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
                  <BtnIcon onClick={() => setOpen(false)}><X size={13} /></BtnIcon>
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






// ─── PANEL DE ÍNDICE (DRAWER LATERAL) ───────────────────────────────────────
function IndexPanel({ open, onClose, lista, capIdActual, libroTitulo, onSelect }: {
  open: boolean; onClose: () => void; lista: CapituloLista[]; capIdActual: string;
  libroTitulo?: string; onSelect: (id: string) => void;
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
              <BtnIcon variant="ghost" onClick={onClose} className="border-none text-primary/40"><X size={15} /></BtnIcon>
            </div>
            <div className="flex-1 overflow-y-auto py-3 px-3">
              {lista.filter(cap => cap.fecha_publicacion <= hoy).map((cap) => {
                const esActual = cap.id === capIdActual;
                const esFuturo = false;
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
                    {esActual ? <span className="w-1.5 h-1.5 rounded-full bg-white-custom/60 shrink-0" /> : <ChevronR size={13} className="text-primary/20 shrink-0" />}
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

function ChapterSelector({ lista, capIdActual, onSelect }: { lista: CapituloLista[]; capIdActual: string; onSelect: (id: string) => void }) {
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
                const publicado = cap.fecha_publicacion <= hoy;
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

// ─── MODAL GUI: USAR ÍTEM ────────────────────────────────────────────────────

// ─── MODAL GUI: CHOICE (botón de decisión inline) ────────────────────────────

// ─── MODAL GUI: SECCIÓN ──────────────────────────────────────────────────────

// ─── TOOLBAR DROPDOWN HELPER ─────────────────────────────────────────────────



// ─── EDITOR TOOLBAR ──────────────────────────────────────────────────────────
// ─── SKELETON DE CARGA ───────────────────────────────────────────────────────

// ─── CAPÍTULO INDIVIDUAL EN MODO SCROLL ──────────────────────────────────────
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
        <div className="space-y-4">
          {[100, 85, 95, 70, 90, 60, 80, 75].map((w, i) => (
            <div key={i} className="h-4 rounded-full bg-primary/8" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}


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
  onNavigate,
}: {
  cap: CapituloScrollItem;
  onNavigate: (capId: string) => void;
}) {
  const words = (cap.contenido ?? "").trim() ? (cap.contenido ?? "").trim().split(/\s+/).length : 0;
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

        </div>
      </header>

      <div className="min-h-[20vh]">
        <ContenidoInteractivo texto={cap.contenido ?? ""} onNavigate={onNavigate} />
      </div>

      {/* Separador entre capítulos */}
      <div className="mt-20 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <span className="text-primary/20 font-serif italic text-2xl select-none">⚝</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
      </div>
    </article>
  );
}

// ─── MODAL DE EDICIÓN INLINE (para modo scroll) ───────────────────────────────

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
  const [showIndex, setShowIndex] = useState(false);
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
    librosQueries.getCapituloParaLectura(capId, id, true)
    .then(async (queryRes) => {
      if (queryRes.error || !queryRes.data) {
        setError(queryRes.error || "No se pudo cargar el capítulo");
        return;
      }

      const lista = queryRes.data.listaCapitulos;
      setListaCapitulos(lista);

      const hoy = new Date().toISOString().split("T")[0];
      const idsACargar = lista
        .filter(c => c.fecha_publicacion <= hoy)
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

  if (loading) return <LectorSkeleton />;
  if (error || capitulos.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">{error || "No hay capítulos disponibles"}</h2>
      <Btn variant="outline" size="sm" onClick={() => router.push(`/wiki/libros/${id}`)}>Volver al índice</Btn>
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
        libroTitulo={libroTitulo}
        onSelect={(id) => { handleChapterSelect(id); setShowIndex(false); }}
      />

      {/* Navbar fija */}
      <nav className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push(`/wiki/libros/${id}`)} className="text-primary/40 hover:text-primary transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setShowIndex(true)} className="text-primary/40 hover:text-primary transition-colors">
            <List size={20} />
          </button>
        </div>
      </nav>

      {/* Todos los capítulos en scroll continuo */}
      {capitulos.map((cap) => (
        <CapituloScrollBlock
          key={cap.id}
          cap={cap}
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