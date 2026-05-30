"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { Play, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";
import { toSlug, esUUID } from "@/lib/utils/slugify";

interface Narrador {
  id: string;
  nombre: string;
  img_url?: string;
}

interface Reino {
  id: string;
  nombre: string;
  imagen_reino?: string | null;
}

interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string | null;
  libro_id: string;
  narrador_id: string | null;
  reinos_ids?: string[] | null;
  narrador?: Narrador | null;
  reino?: Reino | null;
}

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  categoria: string | null;
}

interface CapituloProximo {
  titulo_capitulo: string;
  fecha_publicacion: string;
}

interface GrupoSegmento {
  reino:    Reino    | null;
  narrador: Narrador | null;
  capitulos: Capitulo[];
}

function normOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// ─── Caché de módulo para caps (sobrevive navegación SPA) ────────────────────
const CAPS_TTL_MS = 5 * 60 * 1_000;
const _capsCache: Record<string, { data: Capitulo[]; ts: number }> = {};

function capsCacheados(libroId: string): Capitulo[] | null {
  const c = _capsCache[libroId];
  return c && Date.now() - c.ts < CAPS_TTL_MS ? c.data : null;
}

function buildGrupos(caps: Capitulo[]): GrupoSegmento[] {
  const grupos: GrupoSegmento[] = [];
  for (const cap of caps) {
    const reino    = cap.reino    ?? null;
    const narrador = cap.narrador ?? null;
    const key      = `${reino?.id ?? "null"}::${narrador?.id ?? "null"}`;
    const last     = grupos[grupos.length - 1];
    const lastKey  = last ? `${last.reino?.id ?? "null"}::${last.narrador?.id ?? "null"}` : null;
    if (last && lastKey === key) last.capitulos.push(cap);
    else grupos.push({ reino, narrador, capitulos: [cap] });
  }
  return grupos;
}

function grupoLabel(g: GrupoSegmento): string {
  if (g.reino && g.narrador) return `${g.reino.nombre} · ${g.narrador.nombre}`;
  if (g.reino)    return g.reino.nombre;
  if (g.narrador) return g.narrador.nombre;
  return "";
}

function grupoImg(g: GrupoSegmento): string | null | undefined {
  return g.reino?.imagen_reino ?? g.narrador?.img_url ?? null;
}

// ─── Resolver slug → libro usando Dexie primero ──────────────────────────────
async function resolverLibroPorSlug(slugParam: string): Promise<Libro | null> {
  // 1. Intentar desde Dexie (0 RTT)
  try {
    if (db?.libros) {
      const todos = await db.libros.toArray() as any[];
      if (todos.length > 0) {
        const encontrado = todos.find((l: any) =>
          toSlug(l.titulo ?? "") === slugParam && l.visibilidad === "publico"
        );
        if (encontrado) return encontrado as Libro;
      }
    }
  } catch {}

  // 2. Fallback a Supabase — UNA sola query con los campos necesarios
  const { data } = await supabase
    .from("libros")
    .select("id, titulo, sinopsis, portada_url, categoria")
    .eq("visibilidad", "publico");
  if (!data) return null;

  // Guardar en Dexie para la próxima visita
  try { await db?.libros?.bulkPut(data as any[]); } catch {}

  return (data.find((l: any) => toSlug(l.titulo ?? "") === slugParam) ?? null) as Libro | null;
}

// ─── Flip portada ─────────────────────────────────────────────────────────────
function CoverFlipProtagonistas({
  portada_url,
  titulo,
  grupos,
  tieneAgrupacion,
}: {
  portada_url?: string;
  titulo: string;
  grupos: GrupoSegmento[];
  tieneAgrupacion: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const protagonistas = grupos.filter(g => g.reino || g.narrador);
  const hasProtagonistas = tieneAgrupacion && protagonistas.length > 0;
  const border = "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)";

  return (
    <div
      style={{ aspectRatio: "3/4", position: "relative", cursor: hasProtagonistas ? "pointer" : "default", perspective: "1200px" }}
      onClick={() => hasProtagonistas && setFlipped(f => !f)}
    >
      <div
        style={{
          width: "100%", height: "100%", position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          borderRadius: "var(--radius-card)", border, boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Frente: portada */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <SmartImage src={portada_url || "/placeholder-cover.jpg"} alt={titulo} className="w-full h-full" />
          {hasProtagonistas && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 30%, transparent), transparent)" }} />
          )}
        </div>

        {/* Reverso: protagonistas */}
        <div
          style={{
            position: "absolute", inset: 0,
            backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "var(--bg-main)", padding: "20px 18px",
            display: "flex", flexDirection: "column", gap: 12,
            borderRadius: "var(--radius-card)", overflowY: "auto",
          }}
        >
          <p style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.3, margin: 0 }}>
            Protagonistas
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {protagonistas.map((g, i) => {
              const label = grupoLabel(g);
              const img   = grupoImg(g);
              if (!label) return null;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {img ? (
                    <img src={img} alt={label} style={{ width: 36, height: 36, objectFit: "cover", flexShrink: 0, borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "var(--primary)", opacity: 0.5, borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)", background: `color-mix(in srgb, var(--primary) ${i % 2 === 0 ? 5 : 8}%, transparent)` }}>
                      {label.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--primary)", margin: 0 }}>
                      {g.reino?.nombre ?? g.narrador?.nombre}
                    </p>
                    {g.reino && g.narrador && (
                      <p style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0, fontStyle: "italic" }}>
                        {g.narrador.nombre}
                      </p>
                    )}
                    <p style={{ fontSize: 9, color: "var(--primary)", opacity: 0.35, margin: 0, fontStyle: "italic" }}>
                      {g.capitulos.length} cap{g.capitulos.length !== 1 ? "ítulos" : "ítulo"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 7.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.2 }}>
              Toca para volver
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LibroDetalle() {
  const params   = useParams();
  const slugParam = params?.id as string;
  const router   = useRouter();

  const [loading,          setLoading]          = useState(true);
  const [loadingCaps,      setLoadingCaps]      = useState(true);
  const [libro,            setLibro]            = useState<Libro | null>(null);
  const [libroId,          setLibroId]          = useState<string | null>(null);
  const [capitulos,        setCapitulos]        = useState<Capitulo[]>([]);
  const [capituloProximo,  setCapituloProximo]  = useState<CapituloProximo | null | false>(null);
  const [notFound,         setNotFound]         = useState(false);
  const [leidos,           setLeidos]           = useState<Set<string>>(new Set());

  // ── Capítulos leídos ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!libroId) return;
    const leer = () => {
      try {
        const raw = localStorage.getItem(`leidos:${libroId}`);
        setLeidos(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      } catch {}
    };
    leer();
    const onVisible = () => { if (document.visibilityState === "visible") leer(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", leer);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", leer);
    };
  }, [libroId]);

  const marcarLeido = (capId: string) => {
    if (!libroId) return;
    setLeidos(prev => {
      const next = new Set(prev);
      next.add(capId);
      try { localStorage.setItem(`leidos:${libroId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // ── Carga principal ───────────────────────────────────────────────────────────
  // Estrategia de tres capas para libro + caps:
  //   1. Libro: Dexie → mostrar portada/sinopsis sin spinner
  //   2. Caps:  caché de módulo → Dexie → Supabase (fuente de verdad)
  //   3. Caps se guardan en Dexie para la próxima visita (offline-ready)
  useEffect(() => {
    if (!slugParam) return;
    let mounted = true;

    setLoading(true);
    setLoadingCaps(true);
    setNotFound(false);
    setLibro(null);
    setLibroId(null);
    setCapitulos([]);
    setCapituloProximo(null);

    const cargar = async () => {
      let libroData: Libro | null = null;

      // ── Caso 1: UUID directo (links viejos) ──────────────────────────────
      if (esUUID(slugParam)) {
        try {
          libroData = ((await db?.libros?.get(slugParam)) as any) ?? null;
        } catch {}

        if (!libroData) {
          const { data } = await supabase
            .from("libros")
            .select("id, titulo, sinopsis, portada_url, categoria")
            .eq("id", slugParam)
            .eq("visibilidad", "publico")
            .single();
          libroData = data as Libro | null;
          if (libroData) { try { await db?.libros?.put(libroData as any); } catch {} }
        }

        if (!libroData) {
          if (mounted) { setNotFound(true); setLoading(false); setLoadingCaps(false); }
          return;
        }
        const slug = toSlug(libroData.titulo);
        if (slug) router.replace(`/garlia/libros/${slug}`);

      // ── Caso 2: slug normal ──────────────────────────────────────────────
      } else {
        libroData = await resolverLibroPorSlug(slugParam);
        if (!libroData) {
          if (mounted) { setNotFound(true); setLoading(false); setLoadingCaps(false); }
          return;
        }
      }

      if (!mounted) return;

      // Libro resuelto: mostrar portada/sinopsis ya, sin esperar caps
      setLibro(libroData);
      setLibroId(libroData.id);
      setLoading(false); // ← quita el spinner principal aquí, no al final

      // ── Caps: caché de módulo (0ms) ───────────────────────────────────────
      const cached = capsCacheados(libroData.id);
      if (cached) {
        setCapitulos(cached);
        setLoadingCaps(false);
        // Próximo siempre se refresca (es tiempo-sensitivo)
        supabase
          .from("capitulos")
          .select("titulo_capitulo, fecha_publicacion")
          .eq("libro_id", libroData.id)
          .eq("visibilidad", "programado")
          .gt("fecha_publicacion", new Date().toISOString())
          .order("fecha_publicacion", { ascending: true })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => { if (mounted) setCapituloProximo(data ?? false); });
        return;
      }

      // ── Caps: Dexie (sin red, ~5ms) ───────────────────────────────────────
      try {
        const dexieCaps = (await db?.capitulos
          ?.where("libro_id")
          .equals(libroData.id)
          .filter((c: any) => c.visibilidad === "publico")
          .sortBy("orden")) as Capitulo[] | undefined;
        if (dexieCaps?.length && mounted) {
          setCapitulos(dexieCaps);
          setLoadingCaps(false); // ya hay algo útil que mostrar
        }
      } catch {}

      // ── Caps: Supabase (fuente de verdad) ─────────────────────────────────
      try {
        const ahora = new Date().toISOString();
        const [capsRes, proximoRes] = await Promise.all([
          supabase
            .from("capitulos")
            // FIX: select específico en vez de * — evita traer `contenido` (puede ser MBs)
            .select(`
              id, titulo_capitulo, orden, fecha_publicacion, libro_id, narrador_id, reinos_ids,
              narrador:personajes!narrador_id(id, nombre, img_url),
              reino:reinos!reino_id(id, nombre, imagen_reino)
            `)
            .eq("libro_id", libroData.id)
            .eq("visibilidad", "publico")
            .not("titulo_capitulo", "like", "[Ruta]%")
            .order("orden", { ascending: true }),
          supabase
            .from("capitulos")
            .select("titulo_capitulo, fecha_publicacion")
            .eq("libro_id", libroData.id)
            .eq("visibilidad", "programado")
            .gt("fecha_publicacion", ahora)
            .order("fecha_publicacion", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        if (capsRes.data) {
          const capsNorm = (capsRes.data as any[]).map((c) => ({
            ...c,
            narrador: normOne(c.narrador),
            reino:    normOne(c.reino),
          })) as Capitulo[];

          // Actualizar caché de módulo
          _capsCache[libroData.id] = { data: capsNorm, ts: Date.now() };
          setCapitulos(capsNorm);

          // Guardar caps en Dexie para la próxima visita
          try { await db?.capitulos?.bulkPut(capsNorm as any[]); } catch {}
        }

        setCapituloProximo(proximoRes.data ?? false);
      } catch {}

      if (mounted) setLoadingCaps(false);
    };

    cargar().catch(() => {
      if (mounted) { setLoading(false); setLoadingCaps(false); }
    });

    return () => { mounted = false; };
  }, [slugParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spinner solo mientras no tenemos el libro — los caps tienen su propio estado
  if (loading) return <Loading text="Cargando libro…" />;
  if (notFound || !libro || !libroId) return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4">
      <p className="text-primary/30 font-black uppercase text-xs tracking-widest italic">Libro no encontrado</p>
      <BackBtn onClick={() => router.push("/garlia/libros")} />
    </div>
  );

  const grupos          = buildGrupos(capitulos);
  const tieneReinos     = grupos.some(g => g.reino    !== null);
  const tieneNarradores = grupos.some(g => g.narrador !== null);
  const tieneAgrupacion = tieneReinos || tieneNarradores;

  const acentos = [
    { bg: "bg-primary/5",             border: "border-primary/30",           dot: "bg-primary/40" },
    { bg: "bg-[var(--accent)]/5",     border: "border-[var(--accent)]/20",   dot: "bg-[var(--accent)]/50" },
    { bg: "bg-primary/8",             border: "border-primary/20",           dot: "bg-primary/60" },
    { bg: "bg-[var(--accent)]/8",     border: "border-[var(--accent)]/25",   dot: "bg-[var(--accent)]/70" },
  ];

  const esExtra = libro.categoria?.toLowerCase() === "extra";

  const rutaLector = (primerCapId: string, targetCapId?: string) =>
    `/garlia/libros/${slugParam}/leer/${primerCapId}${targetCapId ? `#cap-${targetCapId}` : ""}`;

  if (esExtra) {
    return (
      <div className="min-h-screen bg-bg-main pb-20 relative">
        <BackBtn onClick={() => router.push("/garlia/libros")} />
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[340px_1fr] gap-12 mt-4 items-start">
          <div
            className="rounded-[var(--radius-card)] overflow-hidden bg-white-custom md:sticky md:top-8"
            style={{ border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)", boxShadow: "var(--shadow-card)" }}
          >
            <SmartImage src={libro.portada_url || "/placeholder-cover.jpg"} alt={libro.titulo} className="w-full h-full" />
          </div>
          <main>
            <h1 className="text-4xl font-black text-primary italic tracking-tighter leading-[0.9] mb-10 uppercase text-center">
              {libro.titulo}
            </h1>
            {loadingCaps && capitulos.length === 0 ? (
              <p className="text-center text-primary/25 font-bold text-[10px] uppercase tracking-widest py-12 italic animate-pulse">
                Cargando capítulos…
              </p>
            ) : capitulos.length === 0 ? (
              <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
                Aún no hay capítulos publicados
              </p>
            ) : (
              <div className="grid gap-3">
                {capitulos.map((cap) => {
                  const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                  const leido  = leidos.has(cap.id);
                  return (
                    <button
                      key={cap.id}
                      onClick={() => { marcarLeido(cap.id); router.push(rutaLector(capitulos[0]?.id ?? cap.id, cap.id)); }}
                      className={`w-full flex items-center justify-between p-6 transition-all text-left group rounded-btn shadow-card ${esRuta ? "bg-blue-50/60" : leido ? "bg-primary/[0.03]" : "bg-white-custom"}`}
                      style={{
                        border: `var(--border-width) solid ${esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}`,
                        boxShadow: leido ? "none" : undefined, opacity: leido ? 0.55 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                    >
                      <div className="flex flex-col gap-1">
                        {esRuta && <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>}
                        <span className={`font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform ${leido ? "text-primary/40 line-through decoration-primary/20" : "text-primary"}`}>
                          {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                        </span>
                        {cap.fecha_publicacion && (
                          <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                            Publicado: {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                      {leido ? <CheckCircle2 size={14} className="text-primary/25 flex-shrink-0" /> : <Play size={14} fill="currentColor" className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/garlia/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-12 mt-4 items-start">

        {/* ── Sidebar ── */}
        <aside className="md:sticky md:top-8 flex flex-col gap-6">
          <CoverFlipProtagonistas
            portada_url={libro.portada_url}
            titulo={libro.titulo}
            grupos={grupos}
            tieneAgrupacion={tieneAgrupacion}
          />

          <div className="flex flex-col gap-3">
            <p className="text-primary/40 text-[11px] italic leading-relaxed font-medium">
              {libro.sinopsis}
            </p>

            {capituloProximo && (
              <div className="flex items-start gap-2 mt-1 p-3 rounded-[var(--radius-btn)] bg-primary/3 border border-primary/8">
                <Clock size={10} className="text-primary/30 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/30">Próximamente</span>
                  <span className="text-[10px] font-bold text-primary/50 italic">{capituloProximo.titulo_capitulo}</span>
                  <span className="text-[8px] font-bold text-primary/25 uppercase tracking-wide">
                    {new Date(capituloProximo.fecha_publicacion).toLocaleDateString("es-ES")}
                  </span>
                </div>
              </div>
            )}

            {capitulos.length > 0 && (
              <button
                onClick={() => { marcarLeido(capitulos[0].id); router.push(rutaLector(capitulos[0].id)); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-btn)] bg-primary text-[var(--btn-text)] font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-opacity"
              >
                <Play size={10} fill="currentColor" />
                {leidos.size > 0 ? "Continuar leyendo" : "Empezar a leer"}
              </button>
            )}
          </div>
        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <div className="space-y-4">
            {loadingCaps && capitulos.length === 0 ? (
              <p className="text-center text-primary/25 font-bold text-[10px] uppercase tracking-widest py-12 italic animate-pulse">
                Cargando capítulos…
              </p>
            ) : capitulos.length === 0 ? (
              <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
                Aún no hay capítulos publicados
              </p>
            ) : tieneAgrupacion ? (
              <div className="flex flex-col gap-10">
                {grupos.map((grupo, gi) => {
                  const acento      = acentos[gi % acentos.length];
                  const label       = grupoLabel(grupo);
                  const img         = grupoImg(grupo);
                  const primerCapId = grupo.capitulos[0]?.id;

                  return (
                    <div key={gi}>
                      {label && (
                        <div className="flex items-center gap-4 mb-4">
                          {img ? (
                            <img src={img} alt={label} className="w-10 h-10 object-cover flex-shrink-0 shadow-md rounded-btn border border-primary/30" />
                          ) : (
                            <div className={`w-10 h-10 flex items-center justify-center text-sm font-black text-primary/60 flex-shrink-0 rounded-btn border border-primary/30 ${acento.bg}`}>
                              {label.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-primary font-black uppercase text-base tracking-tight">
                              {grupo.reino?.nombre ?? grupo.narrador?.nombre}
                            </p>
                            {grupo.reino && grupo.narrador && (
                              <p className="text-primary/40 font-bold text-[10px] uppercase tracking-wide italic">
                                {grupo.narrador.nombre}
                              </p>
                            )}
                          </div>
                          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 12%, transparent), transparent)" }} />
                        </div>
                      )}

                      <div className="grid gap-2">
                        {grupo.capitulos.map((cap) => {
                          const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                          const leido  = leidos.has(cap.id);
                          return (
                            <button
                              key={cap.id}
                              onClick={() => { marcarLeido(cap.id); router.push(rutaLector(primerCapId, cap.id)); }}
                              className={`w-full flex items-center justify-between p-5 transition-all text-left group rounded-btn shadow-card ${esRuta ? "bg-blue-50/60" : leido ? "bg-primary/[0.03]" : acento.bg}`}
                              style={{
                                border: `var(--border-width) solid ${esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}`,
                                boxShadow: leido ? "none" : undefined, opacity: leido ? 0.55 : 1,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                            >
                              <div className="flex flex-col gap-1">
                                {esRuta && <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>}
                                <span className={`font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform ${leido ? "text-primary/40 line-through decoration-primary/20" : "text-primary"}`}>
                                  {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                                </span>
                                {cap.fecha_publicacion && (
                                  <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                                    Publicado: {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                                  </span>
                                )}
                              </div>
                              {leido
                                ? <CheckCircle2 size={14} className="text-primary/25 flex-shrink-0" />
                                : <Play size={14} fill="currentColor" className="text-primary/40 group-hover:text-primary transition-colors flex-shrink-0" />
                              }
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-3">
                {capitulos.map((cap) => {
                  const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                  const leido  = leidos.has(cap.id);
                  return (
                    <button
                      key={cap.id}
                      onClick={() => { marcarLeido(cap.id); router.push(rutaLector(capitulos[0]?.id ?? cap.id, cap.id)); }}
                      className={`w-full flex items-center justify-between p-6 transition-all text-left group rounded-btn shadow-card ${esRuta ? "bg-blue-50/60" : leido ? "bg-primary/[0.03]" : "bg-white-custom"}`}
                      style={{
                        border: `var(--border-width) solid ${esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}`,
                        boxShadow: leido ? "none" : undefined, opacity: leido ? 0.55 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                    >
                      <div className="flex flex-col gap-1">
                        {esRuta && <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>}
                        <span className={`font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform ${leido ? "text-primary/40 line-through decoration-primary/20" : "text-primary"}`}>
                          {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                        </span>
                        {cap.fecha_publicacion && (
                          <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                            Publicado: {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                      {leido
                        ? <CheckCircle2 size={14} className="text-primary/25 flex-shrink-0" />
                        : <Play size={14} fill="currentColor" className="text-primary flex-shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}