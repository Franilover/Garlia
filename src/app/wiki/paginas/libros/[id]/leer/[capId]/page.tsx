"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import {
  ChevronLeft, ChevronRight, List, Save, Edit3, X,
  BookOpen, Clock, AlignLeft, Maximize2, Minimize2,
  ChevronDown, Check, Eye, Type, Feather, Globe, Image, Quote
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

type SecretType = "autor" | "lore" | "imagen" | "cita";

interface Secret {
  word: string;
  type: SecretType;
  content: string;
}

// ─── PARSER DE SECRETOS ───────────────────────────────────────────────────────
// Sintaxis: [[palabra visible|tipo|contenido del secreto]]
// Tipos válidos: autor | lore | imagen | cita
// Ej: [[espada|lore|Fue forjada en las minas de Keth, hace tres siglos.]]
// Ej: [[susurró|autor|Reescribí esta línea 12 veces.]]
// Ej: [[imagen|imagen|https://url.jpg]]
// Ej: [[silencio|cita|"Hablar es mentir dos veces." — Éter, cap. 3]]

function parseContenido(
  texto: string
): Array<{ type: "text"; value: string } | { type: "secret"; secret: Secret }> {
  const regex = /\[\[([^\]|]+)\|([^\]|]+)\|([^\]]+)\]\]/g;
  const partes: Array<{ type: "text"; value: string } | { type: "secret"; secret: Secret }> = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      partes.push({ type: "text", value: texto.slice(lastIndex, match.index) });
    }
    partes.push({
      type: "secret",
      secret: {
        word: match[1],
        type: match[2].trim() as SecretType,
        content: match[3],
      },
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < texto.length) {
    partes.push({ type: "text", value: texto.slice(lastIndex) });
  }

  return partes;
}

// ─── CONFIG POR TIPO DE SECRETO ──────────────────────────────────────────────

const SECRET_CONFIG: Record<
  SecretType,
  {
    label: string;
    icon: React.ElementType;
    accent: string;
    bg: string;
    glowColor: string;
    underlineColor: string;
    badge: string;
  }
> = {
  autor: {
    label: "Nota del autor",
    icon: Feather,
    accent: "#B08850",
    bg: "from-amber-50 to-orange-50",
    glowColor: "rgba(176,136,80,0.18)",
    underlineColor: "#B08850",
    badge: "bg-amber-100 text-amber-700",
  },
  lore: {
    label: "Lore del universo",
    icon: Globe,
    accent: "#4E7B6E",
    bg: "from-emerald-50 to-teal-50",
    glowColor: "rgba(78,123,110,0.18)",
    underlineColor: "#4E7B6E",
    badge: "bg-emerald-100 text-emerald-700",
  },
  imagen: {
    label: "Ilustración",
    icon: Image,
    accent: "#7B5EA7",
    bg: "from-purple-50 to-fuchsia-50",
    glowColor: "rgba(123,94,167,0.18)",
    underlineColor: "#9B7BAA",
    badge: "bg-purple-100 text-purple-700",
  },
  cita: {
    label: "Cita",
    icon: Quote,
    accent: "#4A6580",
    bg: "from-sky-50 to-blue-50",
    glowColor: "rgba(74,101,128,0.18)",
    underlineColor: "#4A6580",
    badge: "bg-sky-100 text-sky-700",
  },
};

// ─── PALABRA INTERACTIVA ──────────────────────────────────────────────────────

function SecretWord({ secret, onClick }: { secret: Secret; onClick: (s: Secret) => void }) {
  const cfg = SECRET_CONFIG[secret.type] ?? SECRET_CONFIG.lore;
  const [hovered, setHovered] = useState(false);

  return (
    <span className="relative inline">
      <button
        onClick={() => onClick(secret)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative inline font-serif cursor-pointer transition-all duration-200"
        style={{ color: hovered ? cfg.accent : "inherit" }}
      >
        <span
          style={{
            backgroundImage: `linear-gradient(${cfg.underlineColor}, ${cfg.underlineColor})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: hovered ? "100% 2px" : "100% 1px",
            backgroundPosition: "0 100%",
            paddingBottom: "1px",
            transition: "background-size 0.2s ease, color 0.2s ease",
            opacity: hovered ? 1 : 0.85,
          }}
        >
          {secret.word}
        </span>
        {/* Punto brillante indicador */}
        <motion.span
          animate={hovered ? { opacity: 1, scale: 1 } : { opacity: 0.4, scale: 0.7 }}
          transition={{ duration: 0.15 }}
          className="absolute -top-1.5 -right-1.5 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: cfg.accent }}
        />
      </button>
    </span>
  );
}

// ─── MODAL DE SECRETO ─────────────────────────────────────────────────────────

function SecretModal({ secret, onClose }: { secret: Secret | null; onClose: () => void }) {
  const cfg = secret ? (SECRET_CONFIG[secret.type] ?? SECRET_CONFIG.lore) : SECRET_CONFIG.lore;
  const IconComp = cfg.icon;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {secret && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-[#1A1218]/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl"
              style={{
                boxShadow: `0 32px 80px ${cfg.glowColor}, 0 8px 24px rgba(0,0,0,0.10)`,
              }}
            >
              {/* Cabecera con color del tipo */}
              <div className={`bg-gradient-to-br ${cfg.bg} px-7 pt-7 pb-5 relative overflow-hidden`}>
                {/* Textura de puntos decorativa */}
                <div
                  className="absolute inset-0 opacity-[0.045]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${cfg.accent} 1px, transparent 0)`,
                    backgroundSize: "18px 18px",
                  }}
                />
                {/* Ícono grande decorativo de fondo */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.07]">
                  <IconComp size={96} style={{ color: cfg.accent }} />
                </div>

                <div className="flex items-start justify-between mb-5 relative">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.badge}`}
                  >
                    <IconComp size={10} />
                    {cfg.label}
                  </span>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-black/6 hover:bg-black/12 flex items-center justify-center transition-all text-[#2C262E]/40 shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>

                <p
                  className="relative text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-40"
                  style={{ color: cfg.accent }}
                >
                  Secreto de
                </p>
                <h3
                  className="relative text-2xl font-black italic tracking-tighter leading-tight"
                  style={{ color: cfg.accent }}
                >
                  «{secret.word}»
                </h3>
              </div>

              {/* Cuerpo del secreto */}
              <div className="bg-white px-7 py-6">
                {secret.type === "imagen" ? (
                  secret.content.startsWith("http") ? (
                    <div className="rounded-xl overflow-hidden border border-[#6B5E70]/10">
                      <img
                        src={secret.content}
                        alt={secret.word}
                        className="w-full object-cover max-h-64"
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            `<p class="p-6 text-sm font-serif italic text-[#6B5E70]/40 text-center">No se pudo cargar la imagen.</p>`;
                        }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#6B5E70]/5 p-6 flex items-center justify-center min-h-28">
                      <p className="text-sm font-serif italic text-[#6B5E70]/50 text-center">
                        {secret.content}
                      </p>
                    </div>
                  )
                ) : secret.type === "cita" ? (
                  <blockquote className="pl-5 border-l-2 border-[#4A6580]/25">
                    <p className="font-serif text-lg italic leading-relaxed text-[#2C262E]/80">
                      {secret.content}
                    </p>
                  </blockquote>
                ) : (
                  <p className="font-serif text-base leading-relaxed text-[#2C262E]/80">
                    {secret.content}
                  </p>
                )}

                <button
                  onClick={onClose}
                  className="mt-5 w-full py-2.5 rounded-xl border border-[#6B5E70]/10 text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/35 hover:bg-[#6B5E70]/5 hover:text-[#6B5E70]/55 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── RENDERIZADOR INTERACTIVO ─────────────────────────────────────────────────

function ContenidoInteractivo({
  texto,
  onSecretClick,
}: {
  texto: string;
  onSecretClick: (s: Secret) => void;
}) {
  const partes = parseContenido(texto);

  return (
    <div className="text-lg md:text-xl leading-[2.2] text-[#2C262E]/90 font-serif whitespace-pre-line first-letter:text-7xl first-letter:font-black first-letter:text-[#6B5E70] first-letter:mr-4 first-letter:float-left first-letter:mt-3">
      {partes.map((parte, i) =>
        parte.type === "text" ? (
          <React.Fragment key={i}>{parte.value}</React.Fragment>
        ) : (
          <SecretWord key={i} secret={parte.secret} onClick={onSecretClick} />
        )
      )}
    </div>
  );
}

// ─── LEYENDA DE SECRETOS ─────────────────────────────────────────────────────

function SecretLegend({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="text-center text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/25 mt-6 flex items-center justify-center gap-1.5"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#B08850]/40 inline-block" />
      {count} {count === 1 ? "secreto oculto" : "secretos ocultos"} en este capítulo
    </motion.p>
  );
}

// ─── AYUDA DE SINTAXIS ────────────────────────────────────────────────────────

function SyntaxHelper({ onInsert }: { onInsert: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ejemplos: { label: string; snippet: string; type: SecretType }[] = [
    { label: "Nota del autor", type: "autor", snippet: "[[palabra|autor|Tu nota aquí]]" },
    { label: "Lore", type: "lore", snippet: "[[palabra|lore|Dato del universo]]" },
    { label: "Imagen", type: "imagen", snippet: "[[descripción|imagen|https://url-imagen.jpg]]" },
    { label: "Cita", type: "cita", snippet: '[[palabra|cita|"Frase célebre." — Personaje]]' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#6B5E70]/50 hover:bg-[#6B5E70]/8 hover:text-[#6B5E70] transition-all border border-dashed border-[#6B5E70]/20"
      >
        ✦ Secretos
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-80 bg-white border border-[#6B5E70]/10 rounded-2xl shadow-2xl shadow-[#6B5E70]/10 z-50 overflow-hidden"
          >
            <div className="px-4 pt-4 pb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#6B5E70]/30 mb-3">
                Sintaxis: [[texto|tipo|contenido]]
              </p>
              {ejemplos.map((ej) => {
                const cfg = SECRET_CONFIG[ej.type];
                return (
                  <button
                    key={ej.label}
                    onClick={() => { onInsert(ej.snippet); setOpen(false); }}
                    className="w-full text-left p-3 rounded-xl hover:bg-[#6B5E70]/5 transition-all mb-1 group"
                  >
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {ej.label}
                    </span>
                    <code className="block mt-1.5 text-[10px] text-[#6B5E70]/40 group-hover:text-[#6B5E70]/60 font-mono break-all">
                      {ej.snippet}
                    </code>
                  </button>
                );
              })}
            </div>
            <p className="px-4 pb-4 text-[9px] text-[#6B5E70]/25 leading-relaxed">
              Hacé click en un ejemplo para insertarlo en el cursor.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── HOOK: estadísticas ───────────────────────────────────────────────────────

function useTextStats(text: string) {
  const textoLimpio = text.replace(/\[\[([^\]|]+)\|[^\]|]+\|[^\]]+\]\]/g, "$1");
  const words = textoLimpio.trim() ? textoLimpio.trim().split(/\s+/).length : 0;
  const chars = textoLimpio.length;
  const readMin = Math.max(1, Math.round(words / 200));
  const secrets = (text.match(/\[\[[^\]]+\|[^\]]+\|[^\]]+\]\]/g) || []).length;
  return { words, chars, readMin, secrets };
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const capActual = lista.find((c) => c.id === capIdActual);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
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
              {lista.map((cap) => {
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
  const { words, readMin, secrets } = useTextStats(value);
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

  const BarContent = ({ isFocus = false }) => (
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
        {secrets > 0 && (
          <span className="text-[#B08850]/50">✦ {secrets} secreto{secrets !== 1 ? "s" : ""}</span>
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
                onChange={(e) => onChange(e.target.value)}
                autoFocus
                className="w-full max-w-2xl bg-transparent font-serif text-xl leading-[2.2] text-[#2C262E] focus:outline-none resize-none"
                placeholder={"Escribe aquí…\n\nUsá [[palabra|tipo|secreto]] para añadir secretos interactivos.\nTipos: autor · lore · imagen · cita"}
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
  const [secretoActivo, setSecretoActivo] = useState<Secret | null>(null);
  const isInitialMount = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { words: wordsPublicado, secrets: secretsPublicado } = useTextStats(capitulo?.contenido ?? "");
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
  const indiceActual = listaCapitulos.findIndex((c) => c.id === capId);
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

      {/* MODAL DE SECRETO */}
      <SecretModal secret={secretoActivo} onClose={() => setSecretoActivo(null)} />

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
                className="text-[#6B5E70]/40 hover:text-[#6B5E70] transition-colors p-1" title="Editar">
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
              {/* Toggle Editar / Preview */}
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
                    <ContenidoInteractivo texto={nuevoContenido} onSecretClick={setSecretoActivo} />
                  </motion.div>
                ) : (
                  <motion.textarea key="editor" ref={textareaRef as any}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    value={nuevoContenido}
                    onChange={(e) => setNuevoContenido(e.target.value)}
                    className="w-full min-h-[60vh] p-8 bg-white border border-[#6B5E70]/10 rounded-[2.5rem] font-serif text-lg leading-relaxed text-[#2C262E] focus:outline-none focus:border-[#6B5E70]/30 shadow-inner resize-none"
                    autoFocus
                    placeholder={"Escribe aquí…\n\nUsá [[palabra|tipo|contenido]] para secretos interactivos.\nTipos: autor · lore · imagen · cita"}
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
            <>
              <ContenidoInteractivo texto={capitulo.contenido} onSecretClick={setSecretoActivo} />
              <SecretLegend count={secretsPublicado} />
            </>
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