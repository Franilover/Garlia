"use client";
import { MotionDiv } from "@/components/ui/Motion";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { AlertCircle, User, List, Music, Play, Pause, SkipBack } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Btn, Loading } from "@/components/ui";
import {
  LinkSection,
  getLetra,
  type Seccion,
} from "@/components/paginas/wiki/canciones/CancionComponents";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Cancion {
  id: string;
  titulo: string;
  personaje?: string;
  estado: string;
  portada_url?: string;
  visible: boolean;
  duracion_segundos?: number | null;
  links?: { titulo: string; url: string }[];
}

// ─── Helpers karaoke ──────────────────────────────────────────────────────────

type KaraokeTimings = Record<string, Record<number, number>>;

function fmtTime(s: number): string {
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${ss.toString().padStart(2, "0")}.${ms}`;
}

function useKaraokeVisor(secciones: Seccion[], duracion?: number | null) {
  const timings = useMemo<KaraokeTimings>(() => {
    const result: KaraokeTimings = {};
    for (const sec of secciones) {
      const t = sec.timings_es as Record<string, number> | null | undefined;
      if (t && Object.keys(t).length > 0) {
        result[sec.id] = Object.fromEntries(
          Object.entries(t).map(([k, v]) => [Number(k), v])
        );
      }
    }
    return result;
  }, [secciones]);

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(0);
  const baseRef     = useRef<number>(0);

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
  }, [playing, duracion]); // eslint-disable-line

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

  const getLineaActiva = (lineas: { seccionId: string; lineaIdx: number }[]): number => {
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

// ─── KaraokeInline ────────────────────────────────────────────────────────────

function KaraokeInline({ secciones, duracion }: { secciones: Seccion[]; duracion?: number | null }) {
  const karaoke   = useKaraokeVisor(secciones, duracion);
  const sliderMax = duracion ?? 600;
  const activaRef = useRef<HTMLDivElement>(null);

  const lineas = useMemo(() => {
    const arr: { seccionId: string; lineaIdx: number }[] = [];
    for (const sec of secciones) {
      const texto = getLetra(sec, "es");
      if (!texto.trim()) continue;
      texto.split("\n").forEach((_, idx) => arr.push({ seccionId: sec.id, lineaIdx: idx }));
    }
    return arr;
  }, [secciones]);

  const lineaActiva = karaoke.getLineaActiva(lineas);

  useEffect(() => {
    if (activaRef.current) {
      activaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [lineaActiva]);

  return (
    <div className="space-y-4">
      {/* ── Controles ── */}
      <div className="flex items-center gap-3 p-4 bg-white-custom border border-primary/10 rounded-[var(--radius-card)]">
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

      {/* ── Letra karaoke ── */}
      <div className="bg-white-custom border border-primary/5 rounded-[var(--radius-card)] p-8 md:p-12 space-y-10">
        {secciones.map(sec => {
          const texto = getLetra(sec, "es");
          if (!texto.trim()) return null;
          const lineasSec = texto.split("\n");

          return (
            <div key={sec.id}>
              {/* Nombre sección */}
              <div className="flex items-center gap-4 mb-6 opacity-30">
                <div className="h-px flex-1 bg-primary" />
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-primary italic">
                  {sec.nombre_seccion}
                </span>
                <div className="h-px flex-1 bg-primary" />
              </div>

              {/* Líneas */}
              <div className="space-y-0.5">
                {lineasSec.map((linea, lineaIdx) => {
                  const tiempo    = karaoke.getTiempo(sec.id, lineaIdx);
                  const globalIdx = lineas.findIndex(
                    l => l.seccionId === sec.id && l.lineaIdx === lineaIdx
                  );
                  const isActiva = globalIdx === lineaActiva;
                  const isPasada = globalIdx < lineaActiva;

                  if (!linea.trim()) return <div key={lineaIdx} className="h-3" />;

                  return (
                    <div
                      key={lineaIdx}
                      ref={isActiva ? activaRef : undefined}
                      onClick={() => { if (tiempo !== null) karaoke.seekTo(tiempo); }}
                      className={`relative flex items-baseline gap-3 py-1 px-3 rounded-xl transition-all duration-200 ${
                        isActiva
                          ? "bg-primary/8"
                          : tiempo !== null
                            ? "cursor-pointer hover:bg-primary/4"
                            : ""
                      }`}
                    >
                      {isActiva && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                      )}

                      {/* Timestamp (solo si hay timings) */}
                      {karaoke.hasTimings && (
                        <span className={`shrink-0 font-mono text-[9px] font-black tracking-widest select-none w-[46px] transition-all ${
                          tiempo !== null
                            ? isActiva ? "text-primary" : isPasada ? "text-primary/20" : "text-primary/30"
                            : "text-transparent"
                        }`}>
                          {tiempo !== null ? fmtTime(tiempo) : "─"}
                        </span>
                      )}

                      {/* Texto */}
                      <span className={`text-xl md:text-2xl font-serif italic leading-relaxed transition-all duration-300 ${
                        isActiva ? "text-primary font-bold"
                        : isPasada ? "text-primary/25"
                        : "text-primary/60"
                      }`}>
                        {linea}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CancionDetallesPage() {
  const params = useParams();
  const router = useRouter();
  const id     = Array.isArray(params?.id) ? params.id[0] : params?.id as string;

  const [cancion,     setCancion]     = useState<Cancion | null>(null);
  const [secciones,   setSecciones]   = useState<Seccion[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [errorAcceso, setErrorAcceso] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("canciones").select("*").eq("id", id).eq("visible", true).single(),
      supabase
        .from("secciones_cancion")
        .select("id, nombre_seccion, letra_es, letra_en, letra_jp, letra_romaji, orden, timings_es, timings_en, timings_jp, timings_romaji")
        .eq("cancion_id", id)
        .order("orden", { ascending: true }),
    ]).then(([{ data: c, error: ec }, { data: s, error: es }]) => {
      if (ec || !c) { setErrorAcceso(true); return; }
      if (es) throw es;
      setCancion(c as Cancion);
      setSecciones((s || []) as Seccion[]);
    }).catch(() => setErrorAcceso(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading text="Cargando..." />;
  if (errorAcceso) return (
    <div className="h-screen flex items-center justify-center bg-bg-main flex-col gap-4 text-center px-6">
      <AlertCircle className="text-red-400" size={48} />
      <p className="text-primary uppercase text-[10px] tracking-widest italic font-black">Canción no encontrada</p>
      <Btn onClick={() => router.push("/wiki/canciones")} className="mt-4 rounded-full">Volver</Btn>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <br />
      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-16 mt-4">

        {/* ── Sidebar ── */}
        <aside className="space-y-6">
          <MotionDiv
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10"
          >
            <SmartImage
              src={cancion?.portada_url || "/placeholder-cover.jpg"}
              alt={cancion?.titulo ?? ""}
              className="w-full h-full object-cover"
            />
          </MotionDiv>

          {cancion?.estado && (
            <MotionDiv
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-[var(--radius-card)] border text-center bg-primary/5 border-primary/10"
            >
              <h4 className="font-black uppercase text-[9px] tracking-[0.2em] text-primary">{cancion.estado}</h4>
            </MotionDiv>
          )}

          {cancion?.personaje && (
            <MotionDiv
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10"
            >
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <User size={12} /> Personaje
              </h4>
              <p className="text-primary font-bold text-sm italic">{cancion.personaje}</p>
            </MotionDiv>
          )}

          <LinkSection links={cancion?.links} />
        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
            <h1 className="text-6xl font-black text-primary italic tracking-tighter leading-[0.85] mb-6 uppercase">
              {cancion?.titulo}
            </h1>
            <div className="h-1.5 w-24 bg-primary/10 rounded-full" />
          </MotionDiv>

          <div className="flex items-center mb-8 border-b border-primary/10 pb-4">
            <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
              <List size={16} /> Letra
            </h3>
          </div>

          {secciones.length > 0 ? (
            <KaraokeInline secciones={secciones} duracion={cancion?.duracion_segundos} />
          ) : (
            <MotionDiv
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 bg-primary/5 rounded-[var(--radius-card)] border border-dashed border-primary/10"
            >
              <Music size={48} className="mx-auto text-primary/20 mb-4" />
              <p className="text-primary/40 font-bold uppercase text-sm tracking-widest italic">Letra en proceso…</p>
            </MotionDiv>
          )}
        </main>
      </div>
    </div>
  );
}