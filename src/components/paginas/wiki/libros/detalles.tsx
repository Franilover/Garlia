"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { Play, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";
// ── NUEVO: helpers de slug ───────────────────────────────────────────────────
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
  reino_id: string | null;
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

/** Igual que en leer.tsx: prioridad reino > narrador */
interface GrupoSegmento {
  reino:    Reino    | null;
  narrador: Narrador | null;
  capitulos: Capitulo[];
}

/* ── Helper: normaliza joins que Supabase puede devolver como array o null ── */
function normOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/* ── Construye grupos con la misma lógica que buildSegmentos en leer.tsx ── */
function buildGrupos(caps: Capitulo[]): GrupoSegmento[] {
  const grupos: GrupoSegmento[] = [];

  for (const cap of caps) {
    const reino    = cap.reino    ?? null;
    const narrador = cap.narrador ?? null;
    const key      = `${reino?.id ?? "null"}::${narrador?.id ?? "null"}`;

    const last    = grupos[grupos.length - 1];
    const lastKey = last
      ? `${last.reino?.id ?? "null"}::${last.narrador?.id ?? "null"}`
      : null;

    if (last && lastKey === key) {
      last.capitulos.push(cap);
    } else {
      grupos.push({ reino, narrador, capitulos: [cap] });
    }
  }

  return grupos;
}

/** Etiqueta del grupo: reino · narrador / solo reino / solo narrador */
function grupoLabel(g: GrupoSegmento): string {
  if (g.reino && g.narrador) return `${g.reino.nombre} · ${g.narrador.nombre}`;
  if (g.reino)    return g.reino.nombre;
  if (g.narrador) return g.narrador.nombre;
  return "";
}

/** Imagen de cabecera: imagen del reino tiene prioridad sobre avatar del narrador */
function grupoImg(g: GrupoSegmento): string | null | undefined {
  return g.reino?.imagen_reino ?? g.narrador?.img_url ?? null;
}

// ── Flip de portada que muestra protagonistas al hacer click ─────────────────
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
              const img = grupoImg(g);
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
  const params = useParams();
  // ── CAMBIO: el segmento de la URL ahora es un slug (o UUID para compatibilidad) ──
  const slugParam = params?.id as string;
  const router = useRouter();

  const [loading, setLoading]                 = useState(true);
  const [libro, setLibro]                     = useState<Libro | null>(null);
  // libroId es el UUID real de Supabase, resuelto a partir del slug
  const [libroId, setLibroId]                 = useState<string | null>(null);
  const [capitulos, setCapitulos]             = useState<Capitulo[]>([]);
  const [capituloProximo, setCapituloProximo] = useState<CapituloProximo | null | false>(null);
  const [notFound, setNotFound]               = useState(false);
  const [leidos, setLeidos]                   = useState<Set<string>>(new Set());

  // ── Cargar capítulos leídos desde localStorage ──
  useEffect(() => {
    if (!libroId) return;

    const leer = () => {
      try {
        const raw = localStorage.getItem(`leidos:${libroId}`);
        setLeidos(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      } catch { }
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
      try { localStorage.setItem(`leidos:${libroId}`, JSON.stringify([...next])); } catch { }
      return next;
    });
  };

  // ── NUEVO: resolver slug → UUID del libro ────────────────────────────────
  // Si el param ya es un UUID (links viejos), lo usamos directamente.
  // Si es un slug, buscamos todos los libros y comparamos slugs.
  useEffect(() => {
    if (!slugParam) return;
    setLoading(true);
    setNotFound(false);
    setLibro(null);
    setLibroId(null);

    const resolverLibro = async () => {
      // Caso 1: param es un UUID — compatibilidad con links anteriores
      if (esUUID(slugParam)) {
        const { data } = await supabase.from("libros").select("*").eq("id", slugParam).single();
        if (!data) { setNotFound(true); setLoading(false); return; }
        // Redirigir silenciosamente a la URL con slug para canonicalizar
        const slug = toSlug(data.titulo);
        if (slug) router.replace(`/wiki/libros/${slug}`);
        setLibro(data);
        setLibroId(data.id);
        return data.id as string;
      }

      // Caso 2: param es un slug — buscar comparando slugs generados
      const { data: todos } = await supabase.from("libros").select("id, titulo, sinopsis, portada_url, categoria");
      if (!todos) { setNotFound(true); setLoading(false); return; }

      const encontrado = todos.find(l => toSlug(l.titulo) === slugParam);
      if (!encontrado) { setNotFound(true); setLoading(false); return; }

      // Obtener el libro completo (con todos los campos)
      const { data: libroCompleto } = await supabase.from("libros").select("*").eq("id", encontrado.id).single();
      if (!libroCompleto) { setNotFound(true); setLoading(false); return; }

      setLibro(libroCompleto);
      setLibroId(libroCompleto.id);
      return libroCompleto.id as string;
    };

    resolverLibro().then(async (id) => {
      if (!id) return;

      const ahora = new Date().toISOString();

      const [capsRes, proximoRes] = await Promise.all([
        supabase
          .from("capitulos")
          .select(`
            *,
            narrador:personajes!narrador_id(id, nombre, img_url),
            reino:reinos!reino_id(id, nombre, imagen_reino)
          `)
          .eq("libro_id", id)
          .eq("visibilidad", "publico")
          .not("titulo_capitulo", "like", "[Ruta]%")
          .order("orden", { ascending: true }),
        supabase
          .from("capitulos")
          .select("titulo_capitulo, fecha_publicacion")
          .eq("libro_id", id)
          .eq("visibilidad", "programado")
          .gt("fecha_publicacion", ahora)
          .order("fecha_publicacion", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const capsNorm = ((capsRes.data as any[]) ?? []).map((c) => ({
        ...c,
        narrador: normOne(c.narrador),
        reino:    normOne(c.reino),
      })) as Capitulo[];

      setCapitulos(capsNorm);
      setCapituloProximo(proximoRes.data ?? false);
    }).finally(() => setLoading(false));

  }, [slugParam]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading text="Cargando libro…" />;
  if (notFound || !libro || !libroId) return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4">
      <p className="text-primary/30 font-black uppercase text-xs tracking-widest italic">Libro no encontrado</p>
      <BackBtn onClick={() => router.push("/wiki/libros")} />
    </div>
  );

  // ── Construir grupos (reino > narrador) ──
  const grupos = buildGrupos(capitulos);

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

  // ── Helper: ruta al lector usando el slug del libro ──────────────────────
  // Mantiene slug en la URL del lector también para consistencia SEO
  const rutaLector = (primerCapId: string, targetCapId?: string) =>
    `/wiki/libros/${slugParam}/leer/${primerCapId}${targetCapId ? `#cap-${targetCapId}` : ""}`;

  // ── Layout para categoría "Extra" ─────────────────────────────────────────
  if (esExtra) {
    return (
      <div className="min-h-screen bg-bg-main pb-20 relative">
        <BackBtn onClick={() => router.push("/wiki/libros")} />

        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[340px_1fr] gap-12 mt-4 items-start">
          <div
            className="rounded-[var(--radius-card)] overflow-hidden bg-white-custom md:sticky md:top-8"
            style={{ border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)", boxShadow: "var(--shadow-card)" }}
          >
            <SmartImage
              src={libro.portada_url || "/placeholder-cover.jpg"}
              alt={libro.titulo}
              className="w-full h-full"
            />
          </div>

          <main>
            <h1 className="text-4xl font-black text-primary italic tracking-tighter leading-[0.9] mb-10 uppercase text-center">
              {libro.titulo}
            </h1>

            {capitulos.length === 0 ? (
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
                      onClick={() => {
                        marcarLeido(cap.id);
                        // ── CAMBIO: usar slug en la ruta ──
                        router.push(rutaLector(capitulos[0]?.id ?? cap.id, cap.id));
                      }}
                      className={`w-full flex items-center justify-between p-5 transition-all text-left group rounded-btn shadow-card ${
                        esRuta ? "bg-blue-50/60" :
                        leido  ? "bg-primary/[0.03]" :
                        "bg-white-custom"
                      }`}
                      style={{
                        border: `var(--border-width) solid ${
                          esRuta ? "rgb(219 234 254)" :
                          leido  ? "color-mix(in srgb, var(--primary) 5%, transparent)" :
                          "color-mix(in srgb, var(--primary) 8%, transparent)"
                        }`,
                        boxShadow: leido ? "none" : undefined,
                        opacity:   leido ? 0.55 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                    >
                      <div className="flex flex-col gap-1">
                        {esRuta && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>
                        )}
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
          </main>
        </div>
      </div>
    );
  }

  // ── Layout normal ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/wiki/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        {/* ── Portada y sidebar ── */}
        <aside>
          <CoverFlipProtagonistas
            portada_url={libro.portada_url}
            titulo={libro.titulo}
            grupos={grupos}
            tieneAgrupacion={tieneAgrupacion}
          />

          <h1 className="text-3xl font-black text-primary italic tracking-tighter leading-[0.95] mt-5 uppercase text-center">
            {libro.titulo}
          </h1>

          {/* ── CTA principal: Comenzar / Continuar leyendo ── */}
          {capitulos.length > 0 && leidos.size < capitulos.length && (() => {
            const primerNoLeido = capitulos.find(c => !leidos.has(c.id));
            const targetCap     = primerNoLeido ?? capitulos[0];
            const continuar     = leidos.size > 0 && primerNoLeido;
            const primerCapId   = capitulos[0]?.id;
            return (
              <button
                // ── CAMBIO: usar slug en la ruta ──
                onClick={() => router.push(rutaLector(primerCapId, targetCap.id))}
                className="mt-5 w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-btn transition-all group"
                style={{
                  background: "var(--primary)",
                  border: "var(--border-width) solid var(--primary)",
                  color: "var(--btn-text, #fff)",
                  boxShadow: "0 4px 20px color-mix(in srgb, var(--primary) 25%, transparent)",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1";    e.currentTarget.style.transform = ""; }}
              >
                <Play size={12} fill="currentColor" />
                <span className="font-black uppercase text-[11px] tracking-widest">
                  {continuar ? `Continuar · Cap. ${targetCap.orden}` : "Comenzar a leer"}
                </span>
              </button>
            );
          })()}

          {/* ── Barra de progreso global ── */}
          {capitulos.length > 0 && leidos.size > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-primary/30 italic">Progreso</span>
                <span className="text-[8px] font-bold text-primary/30 uppercase tracking-wider">
                  {leidos.size}/{capitulos.length}
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-primary/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((leidos.size / capitulos.length) * 100)}%`,
                    background: "linear-gradient(to right, var(--primary), color-mix(in srgb, var(--accent, var(--primary)) 80%, var(--primary)))",
                  }}
                />
              </div>
            </div>
          )}

          {capituloProximo && (() => {
            const fechaPub  = new Date(capituloProximo.fecha_publicacion);
            const ahora     = new Date();
            const diffMs    = fechaPub.getTime() - ahora.getTime();
            const diffDias  = Math.ceil(diffMs / 86_400_000);
            const esMuyProx = diffDias <= 7 && diffDias > 0;
            return (
              <div
                className="mt-6 rounded-[var(--radius-card)] overflow-hidden"
                style={{
                  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                  background: esMuyProx
                    ? "linear-gradient(135deg, color-mix(in srgb, var(--accent,var(--primary)) 8%, var(--bg-main)), color-mix(in srgb, var(--primary) 4%, var(--bg-main)))"
                    : "color-mix(in srgb, var(--primary) 4%, var(--bg-main))",
                  boxShadow: esMuyProx ? "0 4px 24px color-mix(in srgb, var(--accent,var(--primary)) 12%, transparent)" : "none",
                }}
              >
                <div
                  className="flex items-center gap-2 px-5 py-2.5"
                  style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 8%, transparent)" }}
                >
                  <Calendar size={10} className="text-primary/40" />
                  <span className="text-[8px] font-black uppercase tracking-[0.22em] text-primary/30 italic">
                    Próximo capítulo
                  </span>
                  {esMuyProx && (
                    <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-[var(--accent,var(--primary))]/70 bg-[var(--accent,var(--primary))]/10 px-2 py-0.5 rounded-full">
                      ¡Pronto!
                    </span>
                  )}
                </div>
                <div className="px-5 py-4 flex flex-col gap-2">
                  <p className="text-primary font-black text-sm leading-snug tracking-tight">
                    {capituloProximo.titulo_capitulo}
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock size={9} className="text-primary/30" />
                    <span className="text-primary/40 font-bold text-[10px] uppercase tracking-wider italic">
                      {fechaPub.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  {diffDias > 0 && (
                    <div className="flex items-baseline gap-1 mt-1">
                      <span
                        className="font-black text-2xl tracking-tighter"
                        style={{ color: esMuyProx ? "var(--accent, var(--primary))" : "var(--primary)", opacity: esMuyProx ? 1 : 0.2 }}
                      >
                        {diffDias}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary/25">
                        día{diffDias !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <div className="space-y-4">
            {capitulos.length === 0 ? (
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
                            <img
                              src={img}
                              alt={label}
                              className="w-10 h-10 object-cover flex-shrink-0 shadow-md rounded-btn border border-primary/30"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 flex items-center justify-center text-sm font-black text-primary/60 flex-shrink-0 rounded-btn border border-primary/30 ${acento.bg}`}
                            >
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

                      <div className={`grid gap-2`}>
                        {grupo.capitulos.map((cap) => {
                          const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                          const leido  = leidos.has(cap.id);
                          return (
                            <button
                              key={cap.id}
                              onClick={() => {
                                marcarLeido(cap.id);
                                // ── CAMBIO: usar slug en la ruta ──
                                router.push(rutaLector(primerCapId, cap.id));
                              }}
                              className={`w-full flex items-center justify-between p-5 transition-all text-left group rounded-btn shadow-card ${
                                esRuta  ? "bg-blue-50/60"  :
                                leido   ? "bg-primary/[0.03]" :
                                acento.bg
                              }`}
                              style={{
                                border: `var(--border-width) solid ${
                                  esRuta ? "rgb(219 234 254)" :
                                  leido  ? "color-mix(in srgb, var(--primary) 5%, transparent)" :
                                  "color-mix(in srgb, var(--primary) 8%, transparent)"
                                }`,
                                boxShadow: leido ? "none" : undefined,
                                opacity:   leido ? 0.55 : 1,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                            >
                              <div className="flex flex-col gap-1">
                                {esRuta && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>
                                )}
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
                      onClick={() => {
                        marcarLeido(cap.id);
                        // ── CAMBIO: usar slug en la ruta ──
                        router.push(rutaLector(capitulos[0]?.id ?? cap.id, cap.id));
                      }}
                      className={`w-full flex items-center justify-between p-6 transition-all text-left group rounded-btn shadow-card ${
                        esRuta ? "bg-blue-50/60" :
                        leido  ? "bg-primary/[0.03]" :
                        "bg-white-custom"
                      }`}
                      style={{
                        border: `var(--border-width) solid ${
                          esRuta ? "rgb(219 234 254)" :
                          leido  ? "color-mix(in srgb, var(--primary) 5%, transparent)" :
                          "color-mix(in srgb, var(--primary) 8%, transparent)"
                        }`,
                        boxShadow: leido ? "none" : undefined,
                        opacity:   leido ? 0.55 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                    >
                      <div className="flex flex-col gap-1">
                        {esRuta && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>
                        )}
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