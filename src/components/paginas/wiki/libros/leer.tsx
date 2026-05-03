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

interface Segmento {
  reino:    ReinoInfo | null;
  narrador: NarradorInfo | null;
  capitulos: CapituloScrollItem[];
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function normOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function buildSegmentos(caps: (CapituloScrollItem & { _reino?: ReinoInfo | null; _narrador?: NarradorInfo | null })[]): Segmento[] {
  const segs: Segmento[] = [];
  for (const cap of caps) {
    const reino    = cap._reino    ?? null;
    const narrador = cap._narrador ?? null;
    const key      = `${reino?.id ?? "null"}::${narrador?.id ?? "null"}`;
    const last     = segs[segs.length - 1];
    const lastKey  = last ? `${last.reino?.id ?? "null"}::${last.narrador?.id ?? "null"}` : null;
    if (last && lastKey === key) last.capitulos.push(cap);
    else segs.push({ reino, narrador, capitulos: [cap] });
  }
  return segs;
}

function segLabel(seg: Segmento): string {
  if (seg.reino && seg.narrador) return `${seg.reino.nombre} · ${seg.narrador.nombre}`;
  if (seg.reino)    return seg.reino.nombre;
  if (seg.narrador) return seg.narrador.nombre;
  return "";
}

function segImgUrl(seg: Segmento): string | null | undefined {
  return seg.reino?.imagen_reino ?? seg.narrador?.img_url ?? null;
}

/* ─────────────────────────────────────────────
   localStorage helpers — misma clave que detalles.tsx
   ───────────────────────────────────────────── */
function cargarLeidos(libroId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`leidos:${libroId}`);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { }
  return new Set();
}

function guardarLeido(libroId: string, capId: string): void {
  try {
    const set = cargarLeidos(libroId);
    set.add(capId);
    localStorage.setItem(`leidos:${libroId}`, JSON.stringify([...set]));
  } catch { }
}

/* ─────────────────────────────────────────────
   Barra de progreso
   ───────────────────────────────────────────── */
function SegmentoProgressBar({ capIds }: { capIds: string[] }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (capIds.length === 0) return;
    const container = document.getElementById("lector-scroll-container");
    if (!container) return;

    const calc = () => {
      const first = document.getElementById(`cap-${capIds[0]}`);
      const last  = document.getElementById(`cap-${capIds[capIds.length - 1]}`);
      if (!first || !last) return;
      const top     = first.offsetTop;
      const bottom  = last.offsetTop + last.offsetHeight;
      const total   = bottom - top;
      const scrolled = container.scrollTop + container.clientHeight - top;
      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)));
    };
    calc();
    container.addEventListener("scroll", calc, { passive: true });
    container.addEventListener("resize", calc, { passive: true });
    return () => {
      container.removeEventListener("scroll", calc);
      container.removeEventListener("resize", calc);
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
   Tarjeta de transición — con temas dinámicos
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

  const labelActual = segLabel(actual)   || "Capítulos";
  const labelSig    = segLabel(siguiente) || "Capítulos";
  const imgActual   = segImgUrl(actual);
  const imgSig      = segImgUrl(siguiente);
  const tieneReinoYNarrador = siguiente.reino && siguiente.narrador;

  /* Avatar respeta border-radius del tema */
  const Avatar = ({ label, img, dim }: { label: string; img?: string | null; dim?: boolean }) => (
    img ? (
      <img
        src={img} alt={label}
        className={`w-9 h-9 object-cover flex-shrink-0 ${dim ? "grayscale opacity-50" : "shadow-sm"}`}
        style={{
          borderRadius: "var(--radius-btn)",
          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${dim ? "10" : "20"}%, transparent)`,
        }}
      />
    ) : (
      <div
        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center text-xs font-black ${dim ? "text-primary/25" : "text-primary/60"}`}
        style={{
          borderRadius: "var(--radius-btn)",
          border: `var(--border-width) solid color-mix(in srgb, var(--primary) ${dim ? "10" : "20"}%, transparent)`,
          background: `color-mix(in srgb, var(--primary) ${dim ? "5" : "8"}%, transparent)`,
        }}
      >
        {label.charAt(0)}
      </div>
    )
  );

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

            {/* Tarjeta principal */}
            <div
              style={{
                borderRadius: "var(--radius-card)",
                border: `var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)`,
                background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 4%, var(--white-custom)), color-mix(in srgb, var(--accent) 3%, var(--white-custom)))",
                overflow: "hidden",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {/* Dos columnas: actual → siguiente */}
              <div className="flex items-stretch" style={{ borderBottom: `var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)` }}>

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

                {/* Separador vertical */}
                <div
                  className="flex items-center px-3"
                  style={{ borderLeft: `var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)` }}
                >
                  <ChevronRight size={14} className="text-primary/15" />
                </div>

                {/* Siguiente */}
                <div className="flex-1 p-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 mb-3 italic">Continúa con</p>
                  <div className="flex items-center gap-3">
                    <Avatar label={labelSig} img={imgSig} />
                    <div>
                      <p className="text-primary font-black text-xs uppercase tracking-wide">
                        {siguiente.reino?.nombre ?? siguiente.narrador?.nombre}
                      </p>
                      {tieneReinoYNarrador && (
                        <p className="text-primary/40 font-bold text-[9px] uppercase tracking-widest italic mt-0.5">
                          {siguiente.narrador!.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón continuar */}
              <div className="px-6 pb-6 pt-4">
                <button
                  onClick={onIr}
                  className="w-full flex items-center justify-between p-4 transition-all group"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    border: `var(--border-width) solid color-mix(in srgb, var(--primary) 18%, transparent)`,
                    background: `color-mix(in srgb, var(--primary) 5%, transparent)`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "var(--primary)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.color = "var(--btn-text)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `color-mix(in srgb, var(--primary) 5%, transparent)`;
                    e.currentTarget.style.borderColor = `color-mix(in srgb, var(--primary) 18%, transparent)`;
                    e.currentTarget.style.color = "";
                  }}
                >
                  <span className="font-black text-[11px] uppercase tracking-widest text-primary group-hover:text-[var(--btn-text)] transition-colors">
                    Continuar → {labelSig}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {imgSig && (
                      <img
                        src={imgSig} alt={labelSig}
                        className="w-5 h-5 object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        style={{ borderRadius: "var(--radius-btn)" }}
                      />
                    )}
                    <ChevronRight size={14} className="text-primary/50 group-hover:translate-x-0.5 transition-all" />
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
   Hook: observa qué capítulos son visibles
   y los marca como leídos en localStorage.

   - Threshold 0.15 para el ÚLTIMO cap del segmento:
     el usuario llega al final y ve la tarjeta de
     transición antes de que el bloque sea 40% visible.
   - Threshold 0.4 para el resto: evita marcar
     caps por scroll rápido de paso.
   - Se estabiliza la lista de IDs con useRef para
     no re-montar el observer en cada render.
   ───────────────────────────────────────────── */
function useScrollLeidos(libroId: string, capIds: string[]) {
  useEffect(() => {
    if (!libroId || capIds.length === 0) return;

    const lastId = capIds[capIds.length - 1];
    let obsNormal: IntersectionObserver | null = null;
    let obsUltimo: IntersectionObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const montar = () => {
      /* Si aún no están TODOS los elementos en el DOM, reintentamos.
         Antes solo chequeaba el primero — si el cap-2 tardaba en
         pintarse quedaba sin observar silenciosamente. */
      const faltantes = capIds.filter(cid => !document.getElementById(`cap-${cid}`));
      if (faltantes.length > 0) {
        timer = setTimeout(montar, 120);
        return;
      }

      obsNormal = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting)
              guardarLeido(libroId, entry.target.id.replace("cap-", ""));
        },
        { threshold: 0.4 }
      );

      obsUltimo = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting)
              guardarLeido(libroId, entry.target.id.replace("cap-", ""));
        },
        { threshold: 0.15 }
      );

      for (const capId of capIds) {
        const el = document.getElementById(`cap-${capId}`);
        if (!el) continue;
        if (capId === lastId) obsUltimo.observe(el);
        else obsNormal.observe(el);
      }
    };

    /* Pequeño delay para dejar que React pinte los bloques */
    timer = setTimeout(montar, 80);

    return () => {
      if (timer) clearTimeout(timer);
      obsNormal?.disconnect();
      obsUltimo?.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libroId, capIds.join(",")]);
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

  /* ── IDs de los caps visibles en el segmento activo ── */
  const usaSegmentos    = segmentos.length > 1;
  const segActualObj    = usaSegmentos ? segmentos[segActivo]     ?? null : null;
  const segSiguiente    = usaSegmentos ? segmentos[segActivo + 1] ?? null : null;
  const capsParaMostrar = usaSegmentos ? (segActualObj?.capitulos ?? []) : capitulos;
  const navLabel        = segActualObj ? segLabel(segActualObj) : null;
  const navImg          = segActualObj ? segImgUrl(segActualObj) : null;

  /* ── Marcar como leídos los caps que el usuario scrollea ── */
  useScrollLeidos(id, capsParaMostrar.map(c => c.id));

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

  /* ── Helpers Dexie ── */
  const getDexieTable = async () => {
    try {
      const { db } = await import("@/lib/api/client/db");
      if (!db || !(db as any).capitulos) return null;
      return (db as any).capitulos;
    } catch { return null; }
  };

  /* Guarda en Dexie sin pisar contenido si ya existe */
  const cachearEnDexie = async (rows: any[]) => {
    const table = await getDexieTable();
    if (!table || rows.length === 0) return;
    try {
      const ids      = rows.map(r => r.id);
      const existing = await table.bulkGet(ids) as (any | undefined)[];
      const merged   = rows.map((row, i) => {
        const prev    = existing[i];
        const contenido = row.contenido ?? prev?.contenido ?? "";
        return { ...prev, ...row, contenido, status: "synced" };
      });
      await table.bulkPut(merged);
    } catch (e) { console.warn("[Dexie] Error cacheando caps:", e); }
  };

  /* Lee todos los caps del libro desde Dexie (solo los que tienen contenido) */
  const leerDesdeCache = async (): Promise<any[] | null> => {
    const table = await getDexieTable();
    if (!table) return null;
    try {
      const todos    = (await table.toArray()) as any[];
      const delLibro = todos.filter((c: any) => !c.deleted && c.libro_id === id && c.contenido);
      return delLibro.length > 0 ? delLibro : null;
    } catch { return null; }
  };

  /* ── Carga de datos ── */
  useEffect(() => {
    if (!capId || !id) return;
    const hoy = new Date().toISOString();

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

    librosQueries.getCapituloParaLectura(capId, id, true)
      .then(async (queryRes) => {
        if (queryRes.error || !queryRes.data) {
          setError(queryRes.error || "No se pudo cargar el capítulo");
          return;
        }
        const listaRaw = queryRes.data.listaCapitulos;

        // Cachear lista de navegación completa (sin contenido) para offline
        cachearEnDexie(listaRaw.map(c => ({ ...c, libro_id: id })));

        // Fetch de TODO el contenido del libro en un solo query
        // Incluye "programado" con fecha ya pasada (igual que getCapituloParaLectura)
        const { data: contenidos } = await supabase
          .from("capitulos")
          .select(`
            id, orden, titulo_capitulo, contenido, fecha_publicacion, personajes_ids,
            libros(titulo),
            narrador:personajes!narrador_id(id, nombre, img_url),
            reino:reinos!reino_id(id, nombre, imagen_reino)
          `)
          .in("id", listaRaw.map(c => c.id))
          .or(`visibilidad.eq.publico,and(visibilidad.eq.programado,fecha_publicacion.lte.${hoy.split("T")[0]})`)
          .not("titulo_capitulo", "like", "[Ruta]%")
          .order("orden", { ascending: true });

        const rawList = (contenidos as unknown as CapRaw[]) ?? [];

        const capsValidas = rawList.map(c => ({
          id:                c.id,
          orden:             c.orden,
          titulo_capitulo:   c.titulo_capitulo,
          contenido:         c.contenido,
          fecha_publicacion: c.fecha_publicacion,
          personajes_ids:    c.personajes_ids,
          libro_id:          id,
          libros:            normOne(c.libros) ?? undefined,
          _narrador:         normOne(c.narrador),
          _reino:            normOne(c.reino),
        }));

        // Cachear TODO el contenido del libro en Dexie (sin pisar contenido previo)
        cachearEnDexie(capsValidas);

        const idsValidos    = new Set(capsValidas.map(c => c.id));
        const listaFiltrada = listaRaw.filter(c => idsValidos.has(c.id));

        setListaCapitulos(listaFiltrada);
        setCapitulos(capsValidas as unknown as CapituloScrollItem[]);

        const segs = buildSegmentos(capsValidas as any);
        setSegmentos(segs);

        const si = segs.findIndex(s => s.capitulos.some(c => c.id === capId));
        setSegActivo(si !== -1 ? si : 0);
      })
      .catch(async (err) => {
        console.error("Error crítico en Lector:", err);
        // Fallback: leer contenido completo del libro desde Dexie
        const cached = await leerDesdeCache();
        if (cached && cached.length > 0) {
          const capsValidas = cached.map((c: any) => ({
            id: c.id, orden: c.orden, titulo_capitulo: c.titulo_capitulo,
            contenido: c.contenido, fecha_publicacion: c.fecha_publicacion,
            personajes_ids: c.personajes_ids, libro_id: id,
            libros: c.libros, _narrador: c._narrador, _reino: c._reino,
          }));
          const segs = buildSegmentos(capsValidas as any);
          const lista = capsValidas.map(c => ({
            id: c.id, orden: c.orden,
            titulo_capitulo: c.titulo_capitulo,
            fecha_publicacion: c.fecha_publicacion,
          }));
          setListaCapitulos(lista);
          setCapitulos(capsValidas as unknown as CapituloScrollItem[]);
          setSegmentos(segs);
          const si = segs.findIndex(s => s.capitulos.some(c => c.id === capId));
          setSegActivo(si !== -1 ? si : 0);
        } else {
          setError("Error al abrir el pergamino");
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

    /* ✅ Fix: guardar todos los caps del segmento actual como leídos
       antes de navegar. El router.push desmonta los observers y el
       cap-2 (u otros caps intermedios) podían quedar sin registrarse. */
    const segActual = segmentos[si];
    if (segActual) {
      for (const cap of segActual.capitulos) {
        guardarLeido(id, cap.id);
      }
    }

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

  return (
    <div id="lector-scroll-container" className="h-screen overflow-y-auto bg-bg-main text-primary-dark pb-24">

      {/* Barra de progreso */}
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
      <nav
        className="sticky top-0 z-50 backdrop-blur-md px-6 py-3"
        style={{
          background: "color-mix(in srgb, var(--bg-main) 80%, transparent)",
          borderBottom: `var(--border-width) solid color-mix(in srgb, var(--primary) 6%, transparent)`,
        }}
      >
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
                <img
                  src={navImg} alt={navLabel}
                  className="w-5 h-5 object-cover"
                  style={{
                    borderRadius: "var(--radius-btn)",
                    border: `var(--border-width) solid color-mix(in srgb, var(--primary) 20%, transparent)`,
                  }}
                />
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