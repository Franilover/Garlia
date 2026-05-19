"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { FileText, Copy, ExternalLink, Link2, Play, Pause, SkipBack, Timer, X } from "lucide-react";
import { AnimatePresence } from "framer-motion";

export interface Seccion {
  id: string;
  nombre_seccion: string;
  letra_es?: string;
  letra_en?: string;
  letra_jp?: string;
  letra_romaji?: string;
  orden: number;
  timings_es?:     Record<string, number> | null;
  timings_en?:     Record<string, number> | null;
  timings_jp?:     Record<string, number> | null;
  timings_romaji?: Record<string, number> | null;
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

type KaraokeTimings = Record<string, Record<number, number>>;

type LineaConTiempo = {
  seccionId: string;
  lineaIdx:  number;
  texto:     string;
};

function buildLineas(secciones: Seccion[], idioma: IdiomaId): LineaConTiempo[] {
  const lineas: LineaConTiempo[] = [];
  for (const sec of secciones) {
    const texto = getLetra(sec, idioma);
    if (!texto.trim()) continue;
    texto.split("\n").forEach((linea, idx) => {
      lineas.push({ seccionId: sec.id, lineaIdx: idx, texto: linea });
    });
  }
  return lineas;
}

function fmtTime(s: number): string {
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${ss.toString().padStart(2, "0")}.${ms}`;
}

function useKaraokeVisor(secciones: Seccion[], idioma: IdiomaId, duracion?: number | null) {
  
  const timings = useMemo<KaraokeTimings>(() => {
    const col = `timings_${idioma}` as keyof Seccion;
    const result: KaraokeTimings = {};
    for (const sec of secciones) {
      const t = sec[col] as Record<string, number> | null | undefined;
      if (t && Object.keys(t).length > 0) {
        result[sec.id] = Object.fromEntries(
          Object.entries(t).map(([k, v]) => [Number(k), v])
        );
      }
    }
    return result;
  }, [secciones, idioma]);

  const [elapsed,  setElapsed]  = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const baseRef     = useRef<number>(0);

  
  useEffect(() => {
    setElapsed(0);
    setPlaying(false);
    baseRef.current = 0;
  }, [idioma]);

  useEffect(() => {
    if (playing) {
      startRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const next = baseRef.current + (Date.now() - startRef.current) / 1000;
        if (duracion && next >= duracion) {
          setElapsed(duracion);
          baseRef.current = duracion;
          setPlaying(false);
          return;
        }
        setElapsed(next);
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      baseRef.current = elapsed;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, duracion]); 

  const toggle = () => setPlaying(p => !p);
  const reset  = () => { setPlaying(false); baseRef.current = 0; setElapsed(0); };
  const seekTo = (s: number) => {
    const clamped = duracion ? Math.min(s, duracion) : s;
    baseRef.current = clamped;
    startRef.current = Date.now();
    setElapsed(clamped);
  };

  const getTiempo = (seccionId: string, lineaIdx: number): number | null =>
    timings[seccionId]?.[lineaIdx] ?? null;

  const getLineaActiva = (lineas: LineaConTiempo[]): number => {
    let activa = -1;
    for (let i = 0; i < lineas.length; i++) {
      const t = getTiempo(lineas[i].seccionId, lineas[i].lineaIdx);
      if (t !== null && t <= elapsed) activa = i;
    }
    return activa;
  };

  const hasTimings = Object.keys(timings).length > 0;

  return { elapsed, playing, toggle, reset, seekTo, getTiempo, getLineaActiva, hasTimings };
}

export const ModalVisorLetras = ({
  isOpen,
  onClose,
  secciones,
  cancionTitulo,
  duracion,
}: {
  isOpen: boolean;
  onClose: () => void;
  secciones: Seccion[];
  cancionTitulo: string;
  duracion?: number | null;
}) => {
  const [idioma,      setIdioma]      = useState<IdiomaId>("es");
  const [modoKaraoke, setModoKaraoke] = useState(true);
  const [zoom,        setZoom]        = useState(0.7);
  const activaRef = useRef<HTMLDivElement>(null);

  const karaoke  = useKaraokeVisor(secciones, idioma, duracion);
  const sliderMax = duracion ?? 600;
  const lineas    = useMemo(() => buildLineas(secciones, idioma), [secciones, idioma]);
  const lineaActiva = karaoke.getLineaActiva(lineas);

  
  useEffect(() => {
    if (modoKaraoke && activaRef.current) {
      activaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [lineaActiva, modoKaraoke]);

  
  const handleCopy = () => {
    const texto = secciones
      .map(s => { const l = getLetra(s, idioma); return l ? `${s.nombre_seccion}\n\n${l}` : ""; })
      .filter(Boolean).join("\n\n---\n\n");
    navigator.clipboard.writeText(texto);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-md" onClick={onClose} />

      <div className="bg-bg-main w-full max-w-4xl h-[100dvh] md:h-[92vh] md:rounded-[var(--radius-card)] shadow-2xl relative z-10 border border-primary/10 flex flex-col overflow-hidden">

        {}
        <div className="px-4 py-2.5 bg-white-custom border-b border-primary/10 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-primary font-black uppercase text-[10px] tracking-[0.2em] italic truncate flex-1 min-w-0">
              {cancionTitulo}
            </span>

            {}
            <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
              {IDIOMAS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setIdioma(id); karaoke.reset(); }}
                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                    idioma === id ? "bg-primary text-bg-main shadow" : "text-primary/40 hover:text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {}
            <div className="flex gap-0.5 p-0.5 bg-primary/5 rounded-lg border border-primary/10">
              <button
                onClick={() => setModoKaraoke(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                  modoKaraoke ? "bg-primary text-bg-main shadow" : "text-primary/40 hover:text-primary"
                }`}
              >
                <Timer size={10} /> Karaoke
              </button>
              <button
                onClick={() => setModoKaraoke(false)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                  !modoKaraoke ? "bg-primary text-bg-main shadow" : "text-primary/40 hover:text-primary"
                }`}
              >
                <FileText size={10} /> Letra
              </button>
            </div>

            {}
            {!modoKaraoke && (
              <div className="flex items-center gap-0.5">
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold text-sm">-</button>
                <span className="text-[9px] font-black text-primary/50 w-8 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(1.6, z + 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold text-sm">+</button>
              </div>
            )}

            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all" title="Copiar letra">
              <Copy size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/30 hover:text-primary transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {}
        {modoKaraoke && (
          <div className="flex-shrink-0 border-b border-primary/10 bg-white-custom/80 backdrop-blur-sm">
            <div className="px-4 py-2 flex items-center gap-2">
              <button
                onClick={karaoke.toggle}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-bg-main hover:opacity-90 active:scale-95 transition-all shrink-0"
              >
                {karaoke.playing ? <Pause size={15} /> : <Play size={15} />}
              </button>

              <button
                onClick={karaoke.reset}
                className="p-2 rounded-xl border border-primary/15 text-primary/40 hover:text-primary hover:border-primary/30 transition-all shrink-0"
                title="Reiniciar"
              >
                <SkipBack size={13} />
              </button>

              <span className="font-mono text-xs font-black text-primary tracking-widest shrink-0 min-w-[60px]">
                {fmtTime(karaoke.elapsed)}
              </span>

              <div className="flex-1 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={sliderMax}
                  step={0.1}
                  value={Math.min(karaoke.elapsed, sliderMax)}
                  onChange={e => karaoke.seekTo(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--primary)" }}
                />
              </div>
            </div>

            {!karaoke.hasTimings && (
              <div className="px-4 pb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/25 italic">
                  Sin tiempos sincronizados · usa el modo Letra para leer
                </p>
              </div>
            )}
          </div>
        )}

        {}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-bg-main">

          {}
          {modoKaraoke ? (
            <div className="max-w-2xl mx-auto py-8 px-4 md:px-8">
              {secciones.map(sec => {
                const texto = getLetra(sec, idioma);
                if (!texto.trim()) return null;
                const lineasSec = texto.split("\n");
                return (
                  <div key={sec.id} className="mb-8">
                    <div className="flex items-center gap-3 mb-3 opacity-25">
                      <div className="h-px flex-1 bg-primary" />
                      <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary">{sec.nombre_seccion}</span>
                      <div className="h-px flex-1 bg-primary" />
                    </div>

                    {lineasSec.map((linea, lineaIdx) => {
                      const tiempo     = karaoke.getTiempo(sec.id, lineaIdx);
                      const globalIdx  = lineas.findIndex(l => l.seccionId === sec.id && l.lineaIdx === lineaIdx);
                      const isActiva   = globalIdx === lineaActiva;
                      const isPasada   = globalIdx < lineaActiva;

                      if (!linea.trim()) return <div key={lineaIdx} className="h-2" />;

                      return (
                        <div
                          key={lineaIdx}
                          ref={isActiva ? activaRef : undefined}
                          
                          onClick={() => { if (tiempo !== null) karaoke.seekTo(tiempo); }}
                          className={`relative flex items-center gap-2 py-1 px-2 rounded-lg transition-all duration-200 ${
                            isActiva ? "bg-primary/8" : tiempo !== null ? "cursor-pointer hover:bg-primary/5" : ""
                          }`}
                        >
                          {isActiva && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                          )}

                          {}
                          <span className="shrink-0 min-w-[52px] font-mono text-[10px] font-black tracking-widest transition-all rounded px-1 py-0.5 select-none">
                            {tiempo !== null ? (
                              <span className={
                                isActiva  ? "text-primary"    :
                                isPasada  ? "text-primary/20" :
                                            "text-primary/35"
                              }>
                                {fmtTime(tiempo)}
                              </span>
                            ) : (
                              <span className="text-transparent">──:──</span>
                            )}
                          </span>

                          <span className={`text-lg md:text-xl font-serif leading-relaxed transition-all duration-200 flex-1 min-w-0 ${
                            isActiva  ? "text-primary font-bold scale-[1.02] origin-left" :
                            isPasada  ? "text-primary/25"  :
                                        "text-primary/55"
                          }`}>
                            {linea}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="h-32" />
            </div>

          ) : (
            
            <div className="w-full overflow-x-hidden">
              <div
                className="origin-top transition-all duration-300 pb-16"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  paddingTop:   "2rem",
                  paddingLeft:  "1.5rem",
                  paddingRight: "1.5rem",
                  minHeight: `${100 / zoom}%`,
                }}
              >
                {secciones.map(sec => {
                  const texto = getLetra(sec, idioma);
                  return texto ? (
                    <div key={sec.id} className="mb-16 last:mb-0 max-w-2xl mx-auto text-center">
                      <div className="mb-8 flex items-center justify-center gap-6 opacity-20">
                        <div className="h-px w-12 bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] italic text-primary">{sec.nombre_seccion}</span>
                        <div className="h-px w-12 bg-primary" />
                      </div>
                      <p className="text-foreground text-2xl md:text-4xl font-medium italic font-serif leading-[1.7] whitespace-pre-wrap break-words">
                        {texto}
                      </p>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-primary/40 backdrop-blur-md" />
          <MotionDiv
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
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold">-</button>
                    <span className="text-[9px] font-black text-primary/50 min-w-[38px] text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="w-6 h-6 flex items-center justify-center bg-primary/5 rounded text-primary hover:bg-primary/10 font-bold">+</button>
                  </div>
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
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
};

export const LinkSection = ({ links }: { links?: { titulo: string; url: string }[] }) => {
  if (!links?.length) return null;
  return (
    <MotionDiv
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
    </MotionDiv>
  );
};