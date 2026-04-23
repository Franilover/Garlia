"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { ChevronLeft, List, ChevronRight } from "lucide-react";
import { Btn } from "@/components/ui";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { motion, AnimatePresence } from "framer-motion";

import { CapituloLista, CapituloScrollItem } from "./leer/type";
import { LectorSkeleton }      from "./leer/ui/LectorSkeleton";
import { IndexPanel }          from "./leer/ui/IndexPanel";
import { CapituloScrollBlock } from "./leer/CapituloScrollBlock";
import { Vignette }            from "./leer/ui/LectorOrnamentos";

/* ─────────────────────────────────────────────
   Tipos
   ───────────────────────────────────────────── */
interface NarradorInfo {
  id: string;
  nombre: string;
  img_url?: string | null;
}

interface ReinoInfo {
  id: string;
  nombre: string;
  imagen_reino?: string | null;
}

/** Un segmento es una secuencia continua de caps con la misma
 *  combinación (reino_id | null, narrador_id | null).
 *  La prioridad de agrupación es: reino > narrador.
 */
interface Segmento {
  reino:    ReinoInfo | null;
  narrador: NarradorInfo | null;
  capitulos: CapituloScrollItem[];
}

/* ─────────────────────────────────────────────
   Helpers para normalizar joins de Supabase
   ───────────────────────────────────────────── */
function normOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/* ─────────────────────────────────────────────
   Construir segmentos en orden de aparición.
   Clave = "reinoId::narradorId" (o "null")
   Capítulos consecutivos con la misma clave
   se fusionan en un segmento.
   ───────────────────────────────────────────── */
function buildSegmentos(caps: (CapituloScrollItem & { _reino?: ReinoInfo | null; _narrador?: NarradorInfo | null })[]): Segmento[] {
  const segs: Segmento[] = [];

  for (const cap of caps) {
    const reino    = cap._reino    ?? null;
    const narrador = cap._narrador ?? null;
    const key      = `${reino?.id ?? "null"}::${narrador?.id ?? "null"}`;

    const last = segs[segs.length - 1];
    const lastKey = last
      ? `${last.reino?.id ?? "null"}::${last.narrador?.id ?? "null"}`
      : null;

    if (last && lastKey === key) {
      last.capitulos.push(cap);
    } else {
      segs.push({ reino, narrador, capitulos: [cap] });
    }
  }

  return segs;
}

/* ─────────────────────────────────────────────
   Label del segmento para la navbar y transición
   ───────────────────────────────────────────── */
function segLabel(seg: Segmento): string {
  if (seg.reino && seg.narrador) return `${seg.reino.nombre} · ${seg.narrador.nombre}`;
  if (seg.reino)    return seg.reino.nombre;
  if (seg.narrador) return seg.narrador.nombre;
  return "";
}

function segImgUrl(seg: Segmento): string | null | undefined {
  // Prioridad: imagen del reino → avatar del narrador
  return seg.reino?.imagen_reino ?? seg.narrador?.img_url ?? null;
}

/* ─────────────────────────────────────────────
   Barra de progreso acotada al segmento actual
   ───────────────────────────────────────────── */
function SegmentoProgressBar({ capIds }: { capIds: string[] }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (capIds.length === 0) return;
    const calc = () => {
      const first = document.getElementById(`cap-${capIds[0]}`);
      const last  = document.getElementById(`cap-${capIds[capIds.length - 1]}`);
      if (!first || !last) return;
      const top     = first.getBoundingClientRect().top + window.scrollY;
      const bottom  = last.getBoundingClientRect().bottom + window.scrollY;
      const total   = bottom - top;
      const scrolled = window.scrollY + window.innerHeight - top;
      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)));
    };
    calc();
    window.addEventListener("scroll", calc, { passive: true });
    window.addEventListener("resize", calc, { passive: true });
    return () => {
      window.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [capIds]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-primary/5">
      <motion.div
        className="h-full origin-left"
        style={{ background: "linear-gradient(to right, var(--accent), var(--primary))" }}
        animate={{ scaleX: progress / 100 }}
        transition={{ duration: 0.12, ease: "linear" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Tarjeta de transición entre segmentos
   ───────────────────────────────────────────── */
function SegmentoTransicion({
  actual,
  siguiente,
  onIr,
}: {
  actual: Segmento;
  siguiente: Segmento;
  onIr: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.25 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const labelActual  = segLabel(actual)   || "Capítulos";
  const labelSig     = segLabel(siguiente) || "Capítulos";
  const imgActual    = segImgUrl(actual);
  const imgSig       = segImgUrl(siguiente);

  const Avatar = ({ label, img, dim }: { label: string; img?: string | null; dim?: boolean }) => (
    img ? (
      <img src={img} alt={label}
        className={`w-9 h-9 rounded-full object-cover border flex-shrink-0 ${dim ? "border-primary/10 grayscale opacity-50" : "border-primary/20 shadow-sm"}`} />
    ) : (
      <div className={`w-9 h-9 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-black ${dim ? "border-primary/10 bg-primary/5 text-primary/25" : "border-primary/20 bg-primary/8 text-primary/60"}`}>
        {label.charAt(0)}
      </div>
    )
  );

  /* Mostrar chip extra si el siguiente tiene reino Y narrador */
  const tieneReinoYNarrador = siguiente.reino && siguiente.narrador;

  return (
    <div ref={ref} className="max-w-2xl mx-auto px-6 py-20">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Ornamento */}
            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
              <span className="font-serif text-base italic" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>✦</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
            </div>

            <div className="rounded-2xl border border-primary/10 overflow-hidden"
              style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 4%, transparent), color-mix(in srgb, var(--accent) 3%, transparent))" }}
            >
              <div className="flex items-stretch divide-x divide-primary/8">
                {/* Actual (terminado) */}
                <div className="flex-1 p-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 mb-3 italic">Fin de</p>
                  <div className="flex items-center gap-3">
                    <Avatar label={labelActual} img={imgActual} dim />
                    <p className="text-primary/40 font-black text-xs uppercase tracking-wide line-through decoration-primary/20">
                      {labelActual}
                    </p>
                  </div>
                </div>

                <div className="flex items-center px-3">
                  <ChevronRight size={14} className="text-primary/15" />
                </div>

                {/* Siguiente */}
                <div className="flex-1 p-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 mb-3 italic">Continúa con</p>
                  <div className="flex items-center gap-3">
                    <Avatar label={labelSig} img={imgSig} />
                    <div>
                      <p className="text-primary font-black text-xs uppercase tracking-wide">{siguiente.reino?.nombre ?? siguiente.narrador?.nombre}</p>
                      {tieneReinoYNarrador && (
                        <p className="text-primary/40 font-bold text-[9px] uppercase tracking-widest italic mt-0.5">
                          {siguiente.narrador!.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={onIr}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/15 bg-primary/5 hover:bg-primary hover:text-white hover:border-primary transition-all group"
                >
                  <span className="font-black text-[11px] uppercase tracking-widest text-primary group-hover:text-white transition-colors">
                    Continuar → {labelSig}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {imgSig && (
                      <img src={imgSig} alt={labelSig}
                        className="w-5 h-5 rounded-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                    <ChevronRight size={14} className="text-primary/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Componente principal del lector
   ───────────────────────────────────────────── */
export default function Lector() {
  const params = useParams();
  const id    = params?.id    as string;
  const capId = params?.capId as string;
  const router = useRouter();

  const [capitulos,      setCapitulos]      = useState<CapituloScrollItem[]>([]);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [segmentos,      setSegmentos]      = useState<Segmento[]>([]);
  const [segActivo,      setSegActivo]      = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [showIndex,      setShowIndex]      = useState(false);

  const libroTitulo = capitulos[0]?.libros?.titulo;
  const hasScrolled = useRef(false);

  /* ── Scroll inicial ── */
  useEffect(() => {
    if (loading || hasScrolled.current) return;
    hasScrolled.current = true;
    const hashCapId = typeof window !== "undefined" ? window.location.hash.replace("#cap-", "") : "";
    const targetId  = hashCapId || capId;
    setTimeout(() => {
      document.getElementById(`cap-${targetId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }, [loading, capId]);

  useEffect(() => {
    if (loading || !capId) return;
    document.getElementById(`cap-${capId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [capId]); // eslint-disable-line

  /* ── Carga de datos ── */
  useEffect(() => {
    if (!capId || !id) return;
    librosQueries.getCapituloParaLectura(capId, id, true)
      .then(async (queryRes) => {
        if (queryRes.error || !queryRes.data) {
          setError(queryRes.error || "No se pudo cargar el capítulo");
          return;
        }
        const listaRaw = queryRes.data.listaCapitulos;

        type CapRaw = {
          id: string;
          orden: number;
          titulo_capitulo: string;
          contenido: string;
          fecha_publicacion: string;
          personajes_ids: string[];
          libros:   { titulo: string }   | { titulo: string }[]   | null;
          narrador: NarradorInfo         | NarradorInfo[]         | null;
          reino:    ReinoInfo            | ReinoInfo[]            | null;
        };

        const { data: contenidos } = await supabase
          .from("capitulos")
          .select(`
            id, orden, titulo_capitulo, contenido, fecha_publicacion, personajes_ids,
            libros(titulo),
            narrador:personajes!narrador_id(id, nombre, img_url),
            reino:reinos!reino_id(id, nombre, imagen_reino)
          `)
          .in("id", listaRaw.map(c => c.id))
          .eq("visibilidad", "publico")
          .not("titulo_capitulo", "like", "[Ruta]%")
          .order("orden", { ascending: true });

        const rawList = (contenidos as unknown as CapRaw[]) ?? [];

        const capsValidas = rawList.map(c => ({
          id:               c.id,
          orden:            c.orden,
          titulo_capitulo:  c.titulo_capitulo,
          contenido:        c.contenido,
          fecha_publicacion: c.fecha_publicacion,
          personajes_ids:   c.personajes_ids,
          libros:           normOne(c.libros) ?? undefined,
          _narrador:        normOne(c.narrador),
          _reino:           normOne(c.reino),
        }));

        const idsValidos    = new Set(capsValidas.map(c => c.id));
        const listaFiltrada = listaRaw.filter(c => idsValidos.has(c.id));

        setListaCapitulos(listaFiltrada);
        setCapitulos(capsValidas as unknown as CapituloScrollItem[]);

        /* Construir segmentos */
        const segs = buildSegmentos(capsValidas as any);
        setSegmentos(segs);

        /* ¿En qué segmento cae el capId actual? */
        const si = segs.findIndex(s => s.capitulos.some(c => c.id === capId));
        setSegActivo(si !== -1 ? si : 0);
      })
      .catch((err) => { console.error("Error crítico en Lector:", err); setError("Error al abrir el pergamino"); })
      .finally(() => setLoading(false));
  }, [capId, id]);

  const handleNavigate = useCallback((targetCapId: string) => {
    const el = document.getElementById(`cap-${targetCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(`/wiki/libros/${id}/leer/${targetCapId}`, { scroll: false });
    } else {
      router.push(`/wiki/libros/${id}/leer/${targetCapId}`);
    }
  }, [id, router]);

  const handleChapterSelect = useCallback((newCapId: string) => {
    const si = segmentos.findIndex(s => s.capitulos.some(c => c.id === newCapId));
    /* Si el cap es de otro segmento → nueva URL */
    if (si !== -1 && si !== segActivo) {
      router.push(`/wiki/libros/${id}/leer/${newCapId}`);
      return;
    }
    const el = document.getElementById(`cap-${newCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(`/wiki/libros/${id}/leer/${newCapId}`, { scroll: false });
    } else {
      router.push(`/wiki/libros/${id}/leer/${newCapId}`);
    }
  }, [id, router, segmentos, segActivo]);

  const irAlSiguienteSegmento = useCallback((si: number) => {
    const sig = segmentos[si + 1];
    if (!sig?.capitulos[0]) return;
    router.push(`/wiki/libros/${id}/leer/${sig.capitulos[0].id}`);
  }, [segmentos, id, router]);

  if (loading) return <LectorSkeleton />;
  if (error || capitulos.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">
        {error || "No hay capítulos disponibles"}
      </h2>
      <Btn variant="outline" size="sm" onClick={() => router.push(`/wiki/libros/${id}`)}>
        Volver al índice
      </Btn>
    </div>
  );

  const usaSegmentos   = segmentos.length > 1;
  const segActualObj   = usaSegmentos ? segmentos[segActivo]     ?? null : null;
  const segSiguiente   = usaSegmentos ? segmentos[segActivo + 1] ?? null : null;
  const capsParaMostrar = usaSegmentos ? (segActualObj?.capitulos ?? []) : capitulos;
  const navLabel        = segActualObj ? segLabel(segActualObj) : null;
  const navImg          = segActualObj ? segImgUrl(segActualObj) : null;

  return (
    <div className="min-h-screen bg-bg-main text-primary-dark pb-24">

      {/* Barra de progreso — se reinicia con key al cambiar de segmento */}
      <SegmentoProgressBar key={`prog-${segActivo}`} capIds={capsParaMostrar.map(c => c.id)} />

      <Vignette />

      <IndexPanel
        open={showIndex}
        onClose={() => setShowIndex(false)}
        lista={listaCapitulos}
        capIdActual={capId}
        libroTitulo={libroTitulo}
        onSelect={(newId) => { handleChapterSelect(newId); setShowIndex(false); }}
      />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/wiki/libros/${id}`)}
            className="text-primary/40 hover:text-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Indicador del segmento activo */}
          {navLabel ? (
            <div className="flex items-center gap-2">
              {navImg && (
                <img src={navImg} alt={navLabel}
                  className="w-5 h-5 rounded-full object-cover border border-primary/20" />
              )}
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 italic">
                {navLabel}
              </span>
              {segmentos.length > 1 && (
                <span className="text-[8px] font-black text-primary/20 uppercase tracking-widest">
                  · {segActivo + 1}/{segmentos.length}
                </span>
              )}
            </div>
          ) : <span />}

          <button
            onClick={() => setShowIndex(true)}
            className="text-primary/40 hover:text-primary transition-colors"
          >
            <List size={20} />
          </button>
        </div>
      </nav>

      {/* ── Capítulos del segmento activo ── */}
      {capsParaMostrar.map((cap) => (
        <CapituloScrollBlock key={cap.id} cap={cap} onNavigate={handleNavigate} />
      ))}

      {/* ── Transición al siguiente segmento o fin del libro ── */}
      {segSiguiente ? (
        <SegmentoTransicion
          actual={segActualObj!}
          siguiente={segSiguiente}
          onIr={() => irAlSiguienteSegmento(segActivo)}
        />
      ) : (
        <footer className="max-w-2xl mx-auto px-6 pb-20 pt-4 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 w-full max-w-xs">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }} />
            <span className="font-serif text-base" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>— Fin —</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }} />
          </div>
          <button
            onClick={() => router.push(`/wiki/libros/${id}`)}
            className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <List size={16} /> Volver al índice
          </button>
        </footer>
      )}
    </div>
  );
}