"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { ChevronLeft, List, BookOpen, ChevronRight } from "lucide-react";
import { Btn } from "@/components/ui";
import { librosQueries } from "@/lib/api/queries/wiki/libros";
import { motion, AnimatePresence } from "framer-motion";

import { CapituloLista, CapituloScrollItem } from "./leer/type";
import { LectorSkeleton }      from "./leer/ui/LectorSkeleton";
import { IndexPanel }          from "./leer/ui/IndexPanel";
import { CapituloScrollBlock } from "./leer/CapituloScrollBlock";
import { ReadingProgressBar, Vignette } from "./leer/ui/LectorOrnamentos";

/* ─── Tipos de narrador ─── */
interface NarradorInfo {
  id: string;
  nombre: string;
  img_url?: string | null;
}

interface GrupoNarrador {
  narrador: NarradorInfo | null;
  capitulos: CapituloScrollItem[];
}

/* ─── Separador visual entre grupos de narradores ─── */
function NarradorTransicion({
  grupoActual,
  grupoSiguiente,
  onIr,
}: {
  grupoActual: GrupoNarrador;
  grupoSiguiente: GrupoNarrador;
  onIr: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const nombreActual   = grupoActual.narrador?.nombre   ?? "Narrador";
  const nombreSig      = grupoSiguiente.narrador?.nombre ?? "Narrador";
  const imgActual      = grupoActual.narrador?.img_url;
  const imgSig         = grupoSiguiente.narrador?.img_url;

  return (
    <div ref={ref} className="max-w-2xl mx-auto px-6 py-20">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Línea ornamental */}
            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
              <span className="font-serif text-sm italic" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>✦</span>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 25%, transparent))" }} />
            </div>

            {/* Tarjeta de transición */}
            <div className="rounded-2xl border border-primary/10 overflow-hidden"
              style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 4%, transparent), color-mix(in srgb, var(--accent) 3%, transparent))" }}
            >
              {/* Narrador actual → siguiente */}
              <div className="flex items-stretch">
                {/* Lado izquierdo: narrador actual */}
                <div className="flex-1 p-6 border-r border-primary/8">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 mb-3 italic">Capítulos de</p>
                  <div className="flex items-center gap-3">
                    {imgActual ? (
                      <img src={imgActual} alt={nombreActual} className="w-9 h-9 rounded-full object-cover border border-primary/15 flex-shrink-0 grayscale opacity-60" />
                    ) : (
                      <div className="w-9 h-9 rounded-full border border-primary/15 bg-primary/5 flex items-center justify-center text-xs font-black text-primary/30 flex-shrink-0">
                        {nombreActual.charAt(0)}
                      </div>
                    )}
                    <p className="text-primary/50 font-black text-xs uppercase tracking-wide line-through decoration-primary/25">{nombreActual}</p>
                  </div>
                </div>

                {/* Divisor central */}
                <div className="flex items-center px-4">
                  <ChevronRight size={16} className="text-primary/20" />
                </div>

                {/* Lado derecho: narrador siguiente */}
                <div className="flex-1 p-6">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/25 mb-3 italic">Continúa con</p>
                  <div className="flex items-center gap-3">
                    {imgSig ? (
                      <img src={imgSig} alt={nombreSig} className="w-9 h-9 rounded-full object-cover border border-primary/20 flex-shrink-0 shadow-sm" />
                    ) : (
                      <div className="w-9 h-9 rounded-full border border-primary/20 bg-primary/8 flex items-center justify-center text-xs font-black text-primary/60 flex-shrink-0">
                        {nombreSig.charAt(0)}
                      </div>
                    )}
                    <p className="text-primary font-black text-xs uppercase tracking-wide">{nombreSig}</p>
                  </div>
                </div>
              </div>

              {/* Botón de acción */}
              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={onIr}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/15 bg-primary/5 hover:bg-primary hover:text-white hover:border-primary transition-all group"
                >
                  <span className="font-black text-[11px] uppercase tracking-widest text-primary group-hover:text-white transition-colors">
                    Leer capítulos de {nombreSig}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {imgSig ? (
                      <img src={imgSig} alt={nombreSig} className="w-5 h-5 rounded-full object-cover border border-white/20 group-hover:border-white/30 transition-all" />
                    ) : null}
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

/* ─── Componente principal del lector ─── */
export default function Lector() {
  const params = useParams();
  const id    = params?.id    as string;
  const capId = params?.capId as string;
  const router = useRouter();

  const [capitulos,      setCapitulos]      = useState<CapituloScrollItem[]>([]);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [grupos,         setGrupos]         = useState<GrupoNarrador[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [showIndex,      setShowIndex]      = useState(false);
  const [grupoActivo,    setGrupoActivo]    = useState(0); // qué grupo está leyendo

  const libroTitulo = capitulos[0]?.libros?.titulo;
  const hasScrolled = useRef(false);

  /* ── Scroll inicial al capítulo objetivo ── */
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
  }, [capId]);

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

        /* Supabase devuelve las FK como array o null en el tipo inferido,
           por eso usamos un tipo raw intermedio y normalizamos. */
        type CapRaw = {
          id: string;
          orden: number;
          titulo_capitulo: string;
          contenido: string;
          fecha_publicacion: string;
          personajes_ids: string[];
          libros: { titulo: string } | { titulo: string }[] | null;
          narrador: NarradorInfo | NarradorInfo[] | null;
        };

        const { data: contenidos } = await supabase
          .from("capitulos")
          .select(`
            id, orden, titulo_capitulo, contenido, fecha_publicacion, personajes_ids,
            libros(titulo),
            narrador:personajes!narrador_id(id, nombre, img_url)
          `)
          .in("id", listaRaw.map(c => c.id))
          .eq("visibilidad", "publico")
          .not("titulo_capitulo", "like", "[Ruta]%")
          .order("orden", { ascending: true });

        // Normalizar: Supabase puede devolver el join como array o como objeto
        const normalizeNarrador = (n: NarradorInfo | NarradorInfo[] | null): NarradorInfo | null => {
          if (!n) return null;
          return Array.isArray(n) ? (n[0] ?? null) : n;
        };
        const normalizeLibros = (l: { titulo: string } | { titulo: string }[] | null) => {
          if (!l) return undefined;
          return Array.isArray(l) ? (l[0] ?? undefined) : l;
        };

        const rawList = (contenidos as unknown as CapRaw[]) ?? [];
        const capsValidas: (CapituloScrollItem & { narrador?: NarradorInfo | null })[] = rawList.map(c => ({
          id: c.id,
          orden: c.orden,
          titulo_capitulo: c.titulo_capitulo,
          contenido: c.contenido,
          fecha_publicacion: c.fecha_publicacion,
          personajes_ids: c.personajes_ids,
          libros: normalizeLibros(c.libros),
          narrador: normalizeNarrador(c.narrador),
        }));

        const idsValidos  = new Set(capsValidas.map(c => c.id));
        const listaFiltrada = listaRaw.filter(c => idsValidos.has(c.id));

        setListaCapitulos(listaFiltrada);
        setCapitulos(capsValidas);

        /* ── Armar grupos por narrador (orden de aparición) ── */
        const gruposResult: GrupoNarrador[] = [];
        const visto = new Map<string | null, number>();

        for (const cap of capsValidas) {
          const nArr = cap.narrador ?? null;
          const key  = nArr?.id ?? null;

          if (visto.has(key)) {
            gruposResult[visto.get(key)!].capitulos.push(cap);
          } else {
            visto.set(key, gruposResult.length);
            gruposResult.push({ narrador: nArr ?? null, capitulos: [cap] });
          }
        }

        setGrupos(gruposResult);

        /* ── Detectar grupo inicial según capId ── */
        const capIdxEnGrupo = gruposResult.findIndex(g => g.capitulos.some(c => c.id === capId));
        if (capIdxEnGrupo !== -1) setGrupoActivo(capIdxEnGrupo);
      })
      .catch((err) => { console.error("Error crítico en Lector:", err); setError("Error al abrir el pergamino"); })
      .finally(() => setLoading(false));
  }, [capId, id]);

  const handleNavigate = useCallback((targetCapId: string) => {
    const el = document.getElementById(`cap-${targetCapId}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); router.replace(`/wiki/libros/${id}/leer/${targetCapId}`, { scroll: false }); }
    else { router.push(`/wiki/libros/${id}/leer/${targetCapId}`); }
  }, [id, router]);

  const handleChapterSelect = useCallback((newCapId: string) => {
    // Actualizar grupo activo según el capítulo seleccionado
    const gi = grupos.findIndex(g => g.capitulos.some(c => c.id === newCapId));
    if (gi !== -1) setGrupoActivo(gi);

    const el = document.getElementById(`cap-${newCapId}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); router.replace(`/wiki/libros/${id}/leer/${newCapId}`, { scroll: false }); }
    else { router.push(`/wiki/libros/${id}/leer/${newCapId}`); }
  }, [id, router, grupos]);

  const irAlSiguienteGrupo = useCallback((gi: number) => {
    const siguienteGrupo = grupos[gi + 1];
    if (!siguienteGrupo) return;
    const primerCap = siguienteGrupo.capitulos[0];
    if (!primerCap) return;
    setGrupoActivo(gi + 1);
    handleNavigate(primerCap.id);
  }, [grupos, handleNavigate]);

  if (loading) return <LectorSkeleton />;
  if (error || capitulos.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">{error || "No hay capítulos disponibles"}</h2>
      <Btn variant="outline" size="sm" onClick={() => router.push(`/wiki/libros/${id}`)}>Volver al índice</Btn>
    </div>
  );

  const tieneGrupos = grupos.length > 1 && grupos.some(g => g.narrador !== null);

  return (
    <div className="min-h-screen bg-bg-main text-primary-dark pb-24">
      <ReadingProgressBar />
      <Vignette />

      <IndexPanel
        open={showIndex}
        onClose={() => setShowIndex(false)}
        lista={listaCapitulos}
        capIdActual={capId}
        libroTitulo={libroTitulo}
        onSelect={(newId) => { handleChapterSelect(newId); setShowIndex(false); }}
      />

      {/* ── Barra de navegación ── */}
      <nav className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-md border-b border-primary/5 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/wiki/libros/${id}`)}
            className="text-primary/40 hover:text-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Indicador de narrador activo */}
          {tieneGrupos && grupos[grupoActivo]?.narrador && (
            <div className="flex items-center gap-2">
              {grupos[grupoActivo].narrador!.img_url ? (
                <img
                  src={grupos[grupoActivo].narrador!.img_url!}
                  alt={grupos[grupoActivo].narrador!.nombre}
                  className="w-5 h-5 rounded-full object-cover border border-primary/20"
                />
              ) : null}
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/35 italic">
                {grupos[grupoActivo].narrador!.nombre}
              </span>
              {grupos.length > 1 && (
                <span className="text-[8px] font-black text-primary/20 uppercase tracking-widest">
                  · {grupoActivo + 1}/{grupos.length}
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setShowIndex(true)}
            className="text-primary/40 hover:text-primary transition-colors"
          >
            <List size={20} />
          </button>
        </div>
      </nav>

      {/* ── Renderizado por grupos ── */}
      {tieneGrupos ? (
        grupos.map((grupo, gi) => (
          <React.Fragment key={gi}>
            {/* Cabecera de sección del narrador (solo si hay más de un grupo) */}
            {grupos.length > 1 && gi > 0 && (
              <div id={`narrador-${gi}`} className="max-w-2xl mx-auto px-6 pt-6 pb-0">
                {/* La tarjeta de transición entre narradores se renderea ANTES de los capítulos del siguiente */}
              </div>
            )}

            {/* Capítulos del grupo */}
            {grupo.capitulos.map((cap) => (
              <CapituloScrollBlock key={cap.id} cap={cap} onNavigate={handleNavigate} />
            ))}

            {/* Separador / botón al siguiente narrador */}
            {gi < grupos.length - 1 && (
              <NarradorTransicion
                grupoActual={grupo}
                grupoSiguiente={grupos[gi + 1]}
                onIr={() => irAlSiguienteGrupo(gi)}
              />
            )}
          </React.Fragment>
        ))
      ) : (
        /* Vista plana sin grupos */
        capitulos.map((cap) => (
          <CapituloScrollBlock key={cap.id} cap={cap} onNavigate={handleNavigate} />
        ))
      )}

      {/* ── Footer ── */}
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
    </div>
  );
}