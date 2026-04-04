"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import {
  AlertCircle, FileText, Copy, ExternalLink, Link2,
  User, List, Music, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartImage } from "@/components/display/SmartImage";
import { Btn, BtnIcon, Loading, BackBtn } from "@/components/ui";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Seccion {
  id: string;
  nombre_seccion: string;
  letra_es?: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
}
interface Cancion {
  id: string;
  titulo: string;
  personaje?: string;
  estado: string;
  portada_url?: string;
  visible: boolean;
  links?: { titulo: string; url: string }[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const IDIOMAS = [
  { id: "es",     label: "ES", nombre: "Español"  },
  { id: "en",     label: "EN", nombre: "Inglés"   },
  { id: "jp",     label: "JP", nombre: "Japonés"  },
  { id: "romaji", label: "RO", nombre: "Reading"  },
] as const;
type IdiomaId = typeof IDIOMAS[number]["id"];

const getLetra = (sec: Seccion, lang: IdiomaId): string =>
  (lang === "es"     ? sec.letra_es
 : lang === "en"     ? sec.letra_en
 : lang === "jp"     ? sec.letra_jp
 : lang === "romaji" ? sec.letra_romaji
 : "") || "";

// ─── Modal de lectura ─────────────────────────────────────────────────────────
const FullLyricsModal = ({
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


// ─── Sección de links (solo lectura) ─────────────────────────────────────────
const LinkSection = ({ links }: { links?: { titulo: string; url: string }[] }) => {
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

// ─── Página principal ──────────────────────────────────────────────────────────
export default function CancionDetallesPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

  const [cancion,         setCancion]         = useState<Cancion | null>(null);
  const [secciones,       setSecciones]       = useState<Seccion[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [errorAcceso,     setErrorAcceso]     = useState(false);
  const [idiomasActivos,  setIdiomasActivos]  = useState<IdiomaId[]>(["es"]);
  const [showLectura,     setShowLectura]     = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("canciones").select("*").eq("id", id).eq("visible", true).single(),
      supabase.from("secciones_cancion").select("*").eq("cancion_id", id).order("orden", { ascending: true }),
    ]).then(([{ data: c, error: ec }, { data: s, error: es }]) => {
      if (ec || !c) { setErrorAcceso(true); return; }
      if (es) throw es;
      setCancion(c as Cancion);
      setSecciones((s || []) as Seccion[]);
    }).catch(() => setErrorAcceso(true))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleIdioma = useCallback((idm: IdiomaId) => {
    setIdiomasActivos(prev => {
      if (prev.includes(idm)) return prev.length === 1 ? prev : prev.filter(i => i !== idm);
      if (prev.length >= 2)   return [prev[prev.length - 1], idm];
      return [...prev, idm];
    });
  }, []);

  if (loading) return <Loading text="Afinando instrumentos…" />;
  if (errorAcceso) return (
    <div className="h-screen flex items-center justify-center bg-bg-main flex-col gap-4 text-center px-6">
      <AlertCircle className="text-red-400" size={48} />
      <p className="text-primary uppercase text-[10px] tracking-widest italic font-black">Canción no encontrada</p>
      <Btn onClick={() => router.push("/wiki/canciones")} className="mt-4 rounded-full">Volver</Btn>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <FullLyricsModal
        isOpen={showLectura}
        onClose={() => setShowLectura(false)}
        secciones={secciones}
        idiomaActivo={idiomasActivos}
      />

      <BackBtn onClick={() => router.push("/wiki/canciones")} label="Volver al Cancionero" />

      <div className={`mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4 transition-all duration-500 ${idiomasActivos.length > 1 ? "max-w-7xl" : "max-w-5xl"}`}>

        {/* ── Sidebar ── */}
        <aside className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10"
          >
            <SmartImage src={cancion?.portada_url || "/placeholder-cover.jpg"} alt={cancion?.titulo ?? ""} className="w-full h-full object-cover" />
          </motion.div>

          {cancion?.estado && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-[var(--radius-card)] border text-center bg-primary/5 border-primary/10"
            >
              <h4 className="font-black uppercase text-[9px] tracking-[0.2em] text-primary">{cancion.estado}</h4>
            </motion.div>
          )}

          {cancion?.personaje && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10"
            >
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <User size={12} /> Personaje
              </h4>
              <p className="text-primary font-bold text-sm italic">{cancion.personaje}</p>
            </motion.div>
          )}

          <LinkSection links={cancion?.links} />
        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-primary italic tracking-tighter leading-[0.85] mb-6 uppercase">
              {cancion?.titulo}
            </h1>
            <div className="h-1.5 w-24 bg-primary/10 rounded-full" />
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                <List size={16} /> Letra
              </h3>
              {secciones.length > 0 && (
                <Btn variant="ghost" size="sm" icon={<FileText size={12} />} onClick={() => setShowLectura(true)}>
                  Lectura
                </Btn>
              )}
            </div>

            <div className="space-y-12">
              {secciones.map((sec, index) => (
                <motion.div
                  key={sec.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className={`bg-white-custom border border-primary/5 rounded-[var(--radius-card)] transition-all hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 ${idiomasActivos.length > 1 ? "p-8 md:p-12" : "p-10"}`}>
                    <div className="mb-8">
                      <span className="bg-primary/10 text-primary/60 px-4 py-1.5 rounded-full font-black text-[9px] tracking-widest uppercase italic">
                        {sec.nombre_seccion}
                      </span>
                    </div>
                    <div className={`grid gap-x-12 gap-y-8 ${idiomasActivos.length > 1 ? "md:grid-cols-2 divide-x-2 divide-primary/5" : "grid-cols-1"}`}>
                      {idiomasActivos.map((lang, i) => {
                        const texto = getLetra(sec, lang);
                        return (
                          <div key={lang} className={i > 0 ? "md:pl-12" : ""}>
                            {idiomasActivos.length > 1 && (
                              <span className="text-[7px] font-black text-primary/20 uppercase tracking-[0.3em] block mb-4 italic">
                                {IDIOMAS.find(x => x.id === lang)?.nombre}
                              </span>
                            )}
                            <div className={`text-primary leading-[1.8] font-medium whitespace-pre-wrap italic font-serif opacity-90 ${idiomasActivos.length > 1 ? "text-lg md:text-xl" : "text-xl md:text-2xl"}`}>
                              {texto || "---"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {secciones.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-24 bg-primary/5 rounded-[var(--radius-card)] border border-dashed border-primary/10"
              >
                <Music size={48} className="mx-auto text-primary/20 mb-4" />
                <p className="text-primary/40 font-bold uppercase text-sm tracking-widest italic">Letra en proceso…</p>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}