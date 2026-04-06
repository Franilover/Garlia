"use client";
import React, { useState } from "react";
import { FileText, Copy, ExternalLink, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Btn } from "@/components/ui";

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export interface Seccion {
  id: string;
  nombre_seccion: string;
  letra_es?: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
}

export const IDIOMAS = [
  { id: "es",     label: "ES", nombre: "Español"  },
  { id: "en",     label: "EN", nombre: "Inglés"   },
  { id: "jp",     label: "JP", nombre: "Japonés"  },
  { id: "romaji", label: "RO", nombre: "Reading"  },
] as const;

export type IdiomaId = typeof IDIOMAS[number]["id"];

export const getLetra = (sec: Seccion, lang: IdiomaId): string =>
  (lang === "es"     ? sec.letra_es
 : lang === "en"     ? sec.letra_en
 : lang === "jp"     ? sec.letra_jp
 : lang === "romaji" ? sec.letra_romaji
 : "") || "";

// ─── FullLyricsModal ──────────────────────────────────────────────────────────

export const FullLyricsModal = ({
  isOpen, onClose, secciones, idiomaActivo,
}: {
  isOpen: boolean;
  onClose: () => void;
  secciones: Seccion[];
  idiomaActivo: IdiomaId[];
}) => {
  const [zoom, setZoom] = useState(0.6);
  const lang = idiomaActivo[0];

  const handleCopy = () => {
    const texto = secciones
      .map(s => { const l = getLetra(s, lang); return l ? `${s.nombre_seccion}\n\n${l}` : ""; })
      .filter(Boolean).join("\n\n---\n\n");
    navigator.clipboard.writeText(texto);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-bg-main w-full max-w-5xl h-full md:h-[90vh] md:rounded-[var(--radius-card)] shadow-2xl relative z-10 border border-primary/10 flex flex-col"
          >
            <div className="px-6 py-2.5 bg-white-custom border-b border-primary/10 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText size={13} className="text-primary/50" />
                  <span className="text-primary font-black uppercase text-[10px] tracking-[0.2em] italic">Lectura</span>
                  <span className="text-primary/30 text-[9px] font-bold uppercase tracking-widest">
                    · {IDIOMAS.find(i => i.id === lang)?.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold">-</button>
                    <span className="text-[9px] font-black text-primary/50 min-w-[38px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold">+</button>
                  </div>
                  <Btn variant="ghost" size="sm" icon={<Copy size={12} />} onClick={handleCopy}>Copiar</Btn>
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">✕</button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-bg-main">
              <div
                className="w-full h-fit p-8 md:p-20 origin-top transition-all duration-300"
                style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%`, marginLeft: `${(100 - 100 / zoom) / 2}%` }}
              >
                {secciones.map(sec => {
                  const texto = getLetra(sec, lang);
                  return texto ? (
                    <div key={sec.id} className="mb-20 last:mb-0 max-w-5xl mx-auto text-center">
                      <div className="mb-10 flex items-center justify-center gap-8 opacity-20">
                        <div className="h-px flex-1 max-w-[100px] bg-primary" />
                        <span className="text-sm font-black uppercase tracking-[0.5em] italic text-primary">{sec.nombre_seccion}</span>
                        <div className="h-px flex-1 max-w-[100px] bg-primary" />
                      </div>
                      <p className="text-[var(--foreground)] text-3xl md:text-5xl font-medium italic font-serif leading-[1.5] whitespace-pre-wrap">{texto}</p>
                    </div>
                  ) : null;
                })}
                <div className="h-40" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ─── LanguageToggler ──────────────────────────────────────────────────────────

export const LanguageToggler = ({
  idiomasActivos, onToggle,
}: {
  idiomasActivos: IdiomaId[];
  onToggle: (id: IdiomaId) => void;
}) => (
  <div className="p-6 bg-primary rounded-[var(--radius-card)] shadow-xl shadow-primary/20">
    <h4
      className="font-black uppercase text-[8px] tracking-[0.2em] mb-4 text-center italic"
      style={{ color: "color-mix(in srgb, var(--btn-text) 40%, transparent)" }}
    >
      Vista Comparativa
    </h4>
    <div className="grid grid-cols-2 gap-2">
      {IDIOMAS.map(l => (
        <motion.button
          key={l.id}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => onToggle(l.id)}
          className={`py-2 rounded-[var(--radius-btn)] font-black text-[9px] uppercase border transition-all ${
            idiomasActivos.includes(l.id)
              ? "bg-white-custom border-white-custom"
              : "bg-transparent"
          }`}
          style={
            idiomasActivos.includes(l.id)
              ? { color: "var(--primary)" }
              : { color: "color-mix(in srgb, var(--btn-text) 50%, transparent)", borderColor: "color-mix(in srgb, var(--btn-text) 15%, transparent)" }
          }
        >
          {l.label}
        </motion.button>
      ))}
    </div>
    <p className="text-[7px] text-center mt-3 font-bold uppercase tracking-widest"
      style={{ color: "color-mix(in srgb, var(--btn-text) 25%, transparent)" }}>
      Máx. 2 idiomas
    </p>
  </div>
);

// ─── LinkSection ─────────────────────────────────────────────────────────────

export const LinkSection = ({ links }: { links?: { titulo: string; url: string }[] }) => {
  if (!links?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10"
    >
      <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] flex items-center gap-2 italic mb-4">
        <Link2 size={12} /> Enlaces
      </h4>
      <div className="space-y-2">
        {links.map((link, i) => (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:text-[var(--accent)] transition-colors text-xs font-bold truncate">
            <ExternalLink size={10} className="shrink-0" />
            <span className="truncate">{link.titulo}</span>
          </a>
        ))}
      </div>
    </motion.div>
  );
};