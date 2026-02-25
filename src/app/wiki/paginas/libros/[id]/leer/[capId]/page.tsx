"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import {
  ChevronLeft, ChevronRight, List, Save, Edit3, X,
  BookOpen, Clock, AlignLeft, Maximize2, Minimize2,
  ChevronDown, Check, Eye, Type, Image, Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { librosQueries, Capitulo } from "@/lib/api/queries/wiki/libros";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface CapituloLista {
  id: string;
  orden: number;
  fecha_publicacion: string;
  titulo_capitulo?: string;
}

// Tipos de bloques especiales:
// [[cita|Texto de la cita. — Fuente]]           → bloque visual decorativo
// [[img|https://url.jpg|Caption opcional]]       → imagen full-width inline
// [[float|palabra visible|https://url.jpg|Caption]] → palabra clickeable que muestra imagen flotante

type BlockType = "cita" | "img" | "float";

interface CitaBlock  { kind: "cita";  content: string }
interface ImgBlock   { kind: "img";   url: string; caption?: string }
interface FloatBlock { kind: "float"; word: string; url: string; caption?: string }

type SpecialBlock = CitaBlock | ImgBlock | FloatBlock;

type Segment =
  | { type: "text"; value: string }
  | { type: "special"; block: SpecialBlock };

// ─── PARSER ──────────────────────────────────────────────────────────────────
// [[cita|contenido]]
// [[img|url|caption]]
// [[float|palabra|url|caption]]

function parseContenido(texto: string): Segment[] {
  const regex = /\[\[(\w+)\|([^\]]+)\]\]/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: texto.slice(lastIndex, match.index) });
    }

    const [, kind, rest] = match;
    const parts = rest.split("|").map(p => p.trim());

    if (kind === "cita") {
      segments.push({ type: "special", block: { kind: "cita", content: parts[0] } });
    } else if (kind === "img") {
      segments.push({ type: "special", block: { kind: "img", url: parts[0], caption: parts[1] } });
    } else if (kind === "float") {
      segments.push({ type: "special", block: { kind: "float", word: parts[0], url: parts[1], caption: parts[2] } });
    } else {
      // desconocido, lo tratamos como texto
      segments.push({ type: "text", value: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < texto.length) {
    segments.push({ type: "text", value: texto.slice(lastIndex) });
  }

  return segments;
}

// ─── CITA VISUAL ─────────────────────────────────────────────────────────────

function CitaVisual({ content }: { content: string }) {
  // Separa texto de fuente si hay " — "
  const dashIdx = content.lastIndexOf(" — ");
  const texto = dashIdx !== -1 ? content.slice(0, dashIdx) : content;
  const fuente = dashIdx !== -1 ? content.slice(dashIdx + 3) : null;

  return (
    <div className="my-10 mx-0 relative">
      {/* Línea lateral decorativa */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
        style={{
          background: "linear-gradient(to bottom, #C4A882, #6B5E70, #C4A882)",
        }}
      />
      {/* Ornamento superior */}
      <div className="absolute -top-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-[#C4A882]" />
      <div className="absolute -bottom-3 left-[-1px] w-[5px] h-[5px] rounded-full bg-[#6B5E70]" />

      <div className="pl-7 py-2 bg-gradient-to-r from-[#F7F3EE] to-transparent rounded-r-2xl">
        {/* Comilla decorativa */}
        <span
          className="block font-serif text-5xl leading-none mb-2 select-none"
          style={{ color: "#C4A882", opacity: 0.5, fontStyle: "italic" }}
          aria-hidden
        >
          "
        </span>
        <p className="font-serif text-lg md:text-xl italic leading-[1.9] text-[#2C262E]/75">
          {texto}
        </p>
        {fuente && (
          <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-[#6B5E70]/40 not-italic">
            — {fuente}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── IMAGEN INLINE ───────────────────────────────────────────────────────────

function ImgInline({ url, caption }: { url: string; caption?: string }) {
  return (
    <figure className="my-12 -mx-6 md:-mx-12">
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-xl shadow-[#2C262E]/10">
        <img
          src={url}
          alt={caption ?? ""}
          className="w-full object-cover"
          style={{ maxHeight: "520px" }}
        />
        {/* Gradiente sutil inferior */}
        {caption && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1A1218]/60 to-transparent" />
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[#6B5E70]/35">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ─── IMAGEN FLOTANTE (WORD) ──────────────────────────────────────────────────

function FloatWord({
  word, url, caption,
}: {
  word: string;
  url: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Posiciona el float centrado sobre/cerca de la palabra
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY,
      });
    }
    setOpen(v => !v);
  };

  // Cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        className="relative inline font-serif cursor-pointer group"
      >
        <span
          className="relative transition-colors duration-200"
          style={{
            backgroundImage: `linear-gradient(#9B7BAA, #9B7BAA)`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 1px",
            backgroundPosition: "0 100%",
            paddingBottom: "1px",
          }}
        >
          {word}
        </span>
        {/* Punto indicador */}
        <span className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-[#9B7BAA]/60 group-hover:bg-[#9B7BAA] transition-colors" />
      </button>

      {/* Imagen flotante anclada al lugar en la página */}
      <AnimatePresence>
        {open && pos && (
          <>
            {/* Overlay traslúcido para cerrar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[55]"
              style={{ background: "transparent" }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 8 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }}
              className="fixed z-[56] pointer-events-auto"
              style={{
                // Posiciona la imagen centrada horizontalmente sobre la palabra,
                // ligeramente por encima de ella
                left: Math.min(Math.max(pos.x - 160, 12), window.innerWidth - 332),
                top: Math.max(pos.y - 280 - window.scrollY, 12),
                width: 320,
              }}
            >
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  boxShadow: "0 24px 64px rgba(44,38,46,0.22), 0 4px 16px rgba(44,38,46,0.12)",
                }}
              >
                {/* Imagen */}
                <div className="relative">
                  <img
                    src={url}
                    alt={caption ?? word}
                    className="w-full object-cover"
                    style={{ maxHeight: 260 }}
                  />
                  {/* Botón cerrar sobre la imagen */}
                  <button
                    onClick={() => setOpen(false)}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#1A1218]/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-[#1A1218]/70 transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Caption */}
                {caption && (
                  <div className="bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 text-center">
                      {caption}
                    </p>
                  </div>
                )}
              </div>

              {/* Flecha apuntando hacia la palabra */}
              <div
                className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderTop: caption ? "8px solid white" : "8px solid #2C262E",
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── RENDERIZADOR DE CONTENIDO ────────────────────────────────────────────────

function ContenidoInteractivo({ texto }: { texto: string }) {
  const segments = parseContenido(texto);

  // Dividimos los segments en "líneas" para poder aplicar first-letter solo al primero
  // y mantener el whitespace-pre-line
  return (
    <div className="text-lg md:text-xl leading-[2.2] text-[#2C262E]/90 font-serif">
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          const isFirst = i === 0;
          return (
            <span
              key={i}
              className={cn(
                "whitespace-pre-line",
                isFirst &&
                  "first-letter:text-7xl first-letter:font-black first-letter:text-[#6B5E70] first-letter:mr-4 first-letter:float-left first-letter:mt-3"
              )}
            >
              {seg.value}
            </span>
          );
        }

        const { block } = seg;

        if (block.kind === "cita") {
          return <CitaVisual key={i} content={block.content} />;
        }
        if (block.kind === "img") {
          return <ImgInline key={i} url={block.url} caption={block.caption} />;
        }
        if (block.kind === "float") {
          return (
            <FloatWord key={i} word={block.word} url={block.url} caption={block.caption} />
          );
        }
        return null;
      })}
    </div>
  );
}

// ─── HOOK: estadísticas ───────────────────────────────────────────────────────

function useTextStats(text: string) {
  const textoLimpio = text
    .replace(/\[\[cita\|[^\]]+\]\]/g, "")
    .replace(/\[\[img\|[^\]]+\]\]/g, "")
    .replace(/\[\[float\|([^|]+)\|[^\]]+\]\]/g, "$1");
  const words = textoLimpio.trim() ? textoLimpio.trim().split(/\s+/).length : 0;
  const readMin = Math.max(1, Math.round(words / 200));
  const citas   = (text.match(/\[\[cita\|/g) || []).length;
  const imgs    = (text.match(/\[\[img\|/g) || []).length;
  const floats  = (text.match(/\[\[float\|/g) || []).length;
  return { words, readMin, citas, imgs, floats };
}

// ─── AYUDA DE SINTAXIS ────────────────────────────────────────────────────────

function SyntaxHelper({ onInsert }: { onInsert: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const bloques = [
    {
      label: "Cita visual",
      icon: Quote,
      badge: "bg-amber-100 text-amber-700",
      snippet: "[[cita|El texto de la cita va aquí. — Fuente o personaje]]",
      desc: "Bloque decorativo con línea lateral. No es clickeable.",
    },
    {
      label: "Imagen inline",
      icon: Image,
      badge: "bg-emerald-100 text-emerald-700",
      snippet: "[[img|https://url-de-imagen.jpg|Caption opcional]]",
      desc: "Imagen full-width que aparece en el flujo del texto.",
    },
    {
      label: "Imagen flotante",
      icon: Image,
      badge: "bg-purple-100 text-purple-700",
      snippet: "[[float|nombre del personaje|https://url-imagen.jpg|Caption opcional]]",
      desc: "Palabra subrayada. Al tocarla, aparece la imagen flotando encima.",
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 hover:bg-[#6B5E70]/8 hover:text-[#6B5E70] transition-all border border-dashed border-[#6B5E70]/20"
      >
        ✦ Insertar
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-96 bg-white border border-[#6B5E70]/10 rounded-2xl shadow-2xl shadow-[#6B5E70]/10 z-50 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-1">
              {bloques.map((b) => {
                const Icon = b.icon;
                return (
                  <button
                    key={b.label}
                    onClick={() => { onInsert(b.snippet); setOpen(false); }}
                    className="w-full text-left p-3 rounded-xl hover:bg-[#6B5E70]/5 transition-all mb-1 group"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${b.badge}`}>
                        <Icon size={9} /> {b.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#6B5E70]/40 mb-1.5">{b.desc}</p>
                    <code className="text-[10px] text-[#6B5E70]/40 group-hover:text-[#6B5E70]/60 font-mono break-all block">
                      {b.snippet}
                    </code>
                  </button>
                );
              })}
            </div>
            <p className="px-4 pb-4 text-[9px] text-[#6B5E70]/25">
              Clic en un bloque para insertarlo en la posición del cursor.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SELECTOR DE CAPÍTULOS ───────────────────────────────────────────────────

function ChapterSelector({
  lista, capIdActual, isAdmin, onSelect,
}: {
  lista: CapituloLista[];
  capIdActual: string;
  isAdmin: boolean;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoy = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const capActual = lista.find(c => c.id === capIdActual);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#6B5E70]/15 bg-[#6B5E70]/5 hover:bg-[#6B5E70]/10 transition-all text-[#6B5E70] text-[10px] font-black uppercase tracking-widest"
      >
        <BookOpen size={13} />
        Cap. {capActual?.orden ?? "—"}
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-64 bg-white border border-[#6B5E70]/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="max-h-72 overflow-y-auto">
              {lista.map(cap => {
                const publicado = isAdmin || cap.fecha_publicacion <= hoy;
                const esActual = cap.id === capIdActual;
                return (
                  <button
                    key={cap.id}
                    disabled={!publicado}
                    onClick={() => { onSelect(cap.id); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-all",
                      esActual ? "bg-[#6B5E70]/8 text-[#6B5E70]"
                        : publicado ? "hover:bg-[#6B5E70]/5 text-[#2C262E]/80"
                          : "opacity-30 cursor-not-allowed text-[#2C262E]/40"
                    )}
                  >
                    <span className="text-[10px] font-black text-[#6B5E70]/40 w-6 shrink-0">{cap.orden}</span>
                    <span className="text-xs font-semibold truncate flex-1">
                      {cap.titulo_capitulo ?? `Capítulo ${cap.orden}`}
                    </span>
                    {esActual && <Check size={12} className="text-[#6B5E70] shrink-0" />}
                    {!publicado && (
                      <span className="text-[9px] text-[#6B5E70]/30 shrink-0">
                        {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                    )}
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

// ─── BARRA DE HERRAMIENTAS ────────────────────────────────────────────────────

function EditorToolbar({
  textareaRef, value, onChange, onSave, onCancel, saving,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { words, readMin, citas, imgs, floats } = useTextStats(value);
  const [focusMode, setFocusMode] = useState(false);

  const insertAtCursor = useCallback((snippet: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const next = value.slice(0, s) + snippet + value.slice(e);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + snippet.length, s + snippet.length); }, 0);
  }, [textareaRef, value, onChange]);

  const insertAround = (before: string, after = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
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
        {tools.map((t, i) => (
          <button key={i} title={t.title} onClick={t.action}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-[#6B5E70]/60 hover:text-[#6B5E70] hover:bg-[#6B5E70]/8 transition-all font-mono">
            {t.label}
          </button>
        ))}
      </div>

      <SyntaxHelper onInsert={insertAtCursor} />

      {!isFocus && (
        <button onClick={() => setFocusMode(true)} title="Modo foco"
          className="p-1.5 rounded-lg text-[#6B5E70]/50 hover:text-[#6B5E70] hover:bg-[#6B5E70]/8 transition-all">
          <Maximize2 size={14} />
        </button>
      )}

      <div className="ml-auto flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30">
        <span className="flex items-center gap-1"><Type size={10} /> {words.toLocaleString()}</span>
        <span className="flex items-center gap-1"><Clock size={10} /> ~{readMin}min</span>
        {(citas + imgs + floats) > 0 && (
          <span className="text-[#9B7BAA]/60">
            {citas > 0 && `${citas} cita${citas !== 1 ? "s" : ""}`}
            {imgs > 0 && ` · ${imgs} img`}
            {floats > 0 && ` · ${floats} float`}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pl-3 border-l border-[#6B5E70]/10">
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-50 transition-all flex items-center gap-1">
          <X size={12} /> Cancelar
        </button>
        <button onClick={onSave} disabled={saving}
          className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase bg-[#6B5E70] text-white hover:bg-[#5a4e5f] transition-all flex items-center gap-1.5 disabled:opacity-50">
          <Save size={12} /> {saving ? "..." : "Guardar"}
        </button>
        {isFocus && (
          <button onClick={() => setFocusMode(false)}
            className="p-2 rounded-xl text-[#6B5E70]/50 hover:text-[#6B5E70] hover:bg-[#6B5E70]/8 transition-all">
            <Minimize2 size={14} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-[65px] z-40 bg-white/90 backdrop-blur-md border-b border-[#6B5E70]/8">
        <BarContent isFocus={false} />
      </div>

      <AnimatePresence>
        {focusMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#FAF8FA] z-50 flex flex-col">
            <div className="bg-white/80 backdrop-blur-md border-b border-[#6B5E70]/8">
              <BarContent isFocus={true} />
            </div>
            <div className="flex-1 overflow-auto flex justify-center py-12 px-6">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                autoFocus
                className="w-full max-w-2xl bg-transparent font-serif text-xl leading-[2.2] text-[#2C262E] focus:outline-none resize-none"
                placeholder={"Escribe aquí…\n\nBloques disponibles:\n[[cita|Texto. — Fuente]]\n[[img|https://url.jpg|Caption]]\n[[float|palabra|https://url.jpg|Caption]]"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

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
        const [sessionRes, queryRes] = await Promise.all([
          supabase.auth.getSession(),
          librosQueries.getCapituloParaLectura(capId, id, true),
        ]);
        setIsAdmin(!!sessionRes.data.session);
        if (queryRes.error || !queryRes.data) {
          setError(queryRes.error || "No se pudo cargar el capítulo");
        } else {
          setCapitulo(queryRes.data.capitulo);
          setListaCapitulos(queryRes.data.listaCapitulos);
          setNuevoContenido(queryRes.data.capitulo.contenido || "");
        }
      } catch (err) {
        console.error("Error crítico en Lector:", err);
        setError("Error al abrir el pergamino");
      } finally {
        setLoading(false);
        isInitialMount.current = false;
      }
    };
    fetchDatos();
  }, [capId, id]);

  const handleSave = async () => {
    if (!capitulo || !capId) return;
    const contenidoPrevio = capitulo.contenido;
    setCapitulo({ ...capitulo, contenido: nuevoContenido });
    setEditMode(false);
    setSaving(true);
    try {
      const { error: saveError } = await librosQueries.updateContenido(capId, nuevoContenido);
      if (saveError) throw saveError;
    } catch (err: any) {
      setCapitulo({ ...capitulo, contenido: contenidoPrevio });
      setNuevoContenido(contenidoPrevio);
      setEditMode(true);
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setNuevoContenido(capitulo?.contenido ?? "");
    setPreviewMode(false);
  };

  const handleChapterSelect = useCallback(
    (newCapId: string) => router.push(`/wiki/paginas/libros/${id}/leer/${newCapId}`),
    [id, router]
  );

  const hoy = new Date().toISOString().split("T")[0];
  const indiceActual = listaCapitulos.findIndex(c => c.id === capId);
  const anteriorCap = listaCapitulos.slice(0, indiceActual).reverse().find(c => isAdmin || c.fecha_publicacion <= hoy);
  const siguienteCap = listaCapitulos.slice(indiceActual + 1).find(c => isAdmin || c.fecha_publicacion <= hoy);

  if (loading && !capitulo) return (
    <div className="h-screen flex items-center justify-center bg-[#FDFCFD]">
      <div className="animate-pulse text-[#6B5E70] font-black uppercase text-[10px] tracking-[0.3em]">
        Abriendo pergamino...
      </div>
    </div>
  );

  if (error || !capitulo) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFCFD] text-[#6B5E70] p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">
        {error || "Capítulo no encontrado"}
      </h2>
      <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)}
        className="text-[10px] font-black uppercase border-b-2 border-[#6B5E70] pb-1">
        Volver al índice
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFD] text-[#2C262E] pb-24">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#FDFCFD]/80 backdrop-blur-md border-b border-[#6B5E70]/5 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)}
            className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors shrink-0">
            <ChevronLeft size={24} />
          </button>

          <div className="flex flex-col items-center gap-1 min-w-0">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B5E70]/40 leading-none truncate">
              {capitulo.libros?.titulo}
            </h2>
            {listaCapitulos.length > 1 ? (
              <ChapterSelector
                lista={listaCapitulos} capIdActual={capId}
                isAdmin={isAdmin} onSelect={handleChapterSelect}
              />
            ) : (
              <p className="text-[11px] font-bold text-[#6B5E70] uppercase">
                Capítulo {capitulo.orden}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && !editMode && (
              <button onClick={() => setEditMode(true)}
                className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors p-1">
                <Edit3 size={20} />
              </button>
            )}
            <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)}
              className="text-[#6B5E70]/40 hover:text-[#6B5E70]">
              <List size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* TOOLBAR EDITOR */}
      {isAdmin && editMode && (
        <EditorToolbar
          textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
          value={nuevoContenido}
          onChange={setNuevoContenido}
          onSave={handleSave}
          onCancel={handleCancelEdit}
          saving={saving}
        />
      )}

      {/* ARTÍCULO */}
      <article className="max-w-2xl mx-auto px-6 py-12 md:py-20">
        <header className="mb-12 text-center">
          <span className="text-[#6B5E70]/20 font-serif italic text-4xl block mb-2">
            § {capitulo.orden}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-[#6B5E70] tracking-tighter uppercase italic leading-none">
            {capitulo.titulo_capitulo}
          </h1>
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
                {[
                  { key: false, icon: Edit3, label: "Editar" },
                  { key: true, icon: Eye, label: "Preview" },
                ].map(({ key, icon: Icon, label }) => (
                  <button key={String(key)} onClick={() => setPreviewMode(key as boolean)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      previewMode === key ? "bg-[#6B5E70] text-white" : "text-[#6B5E70]/50 hover:bg-[#6B5E70]/8"
                    )}>
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {previewMode ? (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="min-h-[60vh] p-8 bg-white border border-[#6B5E70]/10 rounded-[2.5rem] overflow-hidden">
                    <ContenidoInteractivo texto={nuevoContenido} />
                  </motion.div>
                ) : (
                  <motion.textarea key="editor" ref={textareaRef as any}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    value={nuevoContenido}
                    onChange={e => setNuevoContenido(e.target.value)}
                    className="w-full min-h-[60vh] p-8 bg-white border border-[#6B5E70]/10 rounded-[2.5rem] font-serif text-lg leading-relaxed text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 shadow-inner resize-none"
                    autoFocus
                    placeholder={"Escribe aquí…\n\nBloques disponibles:\n[[cita|Texto de la cita. — Fuente]]\n[[img|https://url.jpg|Caption opcional]]\n[[float|nombre del personaje|https://url.jpg|Caption opcional]]"}
                  />
                )}
              </AnimatePresence>

              <div className="flex justify-end mt-3 px-2">
                {wordsEdit !== wordsPublicado && wordsEdit > 0 && (
                  <span className={cn("text-[9px] font-black uppercase tracking-widest",
                    wordsEdit > wordsPublicado ? "text-emerald-400" : "text-amber-400")}>
                    {wordsEdit > wordsPublicado ? "+" : ""}{wordsEdit - wordsPublicado} palabras vs. guardado
                  </span>
                )}
              </div>
            </div>
          ) : (
            <ContenidoInteractivo texto={capitulo.contenido} />
          )}
        </div>

        {/* NAVEGACIÓN INFERIOR */}
        {!editMode && (
          <footer className="mt-20 pt-10 border-t border-[#6B5E70]/10 flex flex-col items-center gap-8">
            <button onClick={() => router.push(`/wiki/paginas/libros/${id}`)}
              className="flex items-center gap-2 text-[#6B5E70]/40 hover:text-[#6B5E70] font-black text-[10px] uppercase tracking-widest transition-all">
              <List size={16} /> Volver al Índice
            </button>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <button
                onClick={() => anteriorCap && router.push(`/wiki/paginas/libros/${id}/leer/${anteriorCap.id}`)}
                disabled={!anteriorCap}
                className={cn(
                  "p-5 rounded-2xl border font-black uppercase text-[10px] flex items-center justify-center gap-2 transition-all",
                  !anteriorCap ? "opacity-20 cursor-not-allowed"
                    : "border-[#6B5E70]/10 text-[#6B5E70]/60 hover:bg-[#6B5E70]/5 active:scale-95"
                )}>
                <ChevronLeft size={14} /> Anterior
              </button>

              <button
                onClick={() => siguienteCap
                  ? router.push(`/wiki/paginas/libros/${id}/leer/${siguienteCap.id}`)
                  : router.push(`/wiki/paginas/libros/${id}`)
                }
                className="p-5 rounded-2xl bg-[#6B5E70] text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg hover:shadow-[#6B5E70]/30 active:scale-95 transition-all">
                {siguienteCap ? "Siguiente" : "Finalizar"} <ChevronRight size={14} />
              </button>
            </div>

            {!isAdmin && !siguienteCap && listaCapitulos[indiceActual + 1] && (
              <p className="text-[#6B5E70]/40 font-bold text-[10px] uppercase tracking-widest italic text-center">
                Próximo capítulo el{" "}
                {new Date(listaCapitulos[indiceActual + 1].fecha_publicacion).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
              </p>
            )}
          </footer>
        )}
      </article>
    </div>
  );
}