"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { Play, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";

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

/* ── Construye grupos con la misma lógica que buildSegmentos en leer.tsx ──
   Clave = "reinoId::narradorId". Capítulos consecutivos con la misma clave
   se fusionan en un grupo. Si el libro no usa reinos en ningún capítulo,
   la clave degrada a solo narrador_id, replicando el comportamiento original. */
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
      style={{
        aspectRatio: "3/4",
        position: "relative",
        cursor: hasProtagonistas ? "pointer" : "default",
        perspective: "1200px",
      }}
      onClick={() => hasProtagonistas && setFlipped(f => !f)}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          borderRadius: "var(--radius-card)",
          border,
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Frente: portada */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: "var(--radius-card)",
            overflow: "hidden",
          }}
        >
          <SmartImage
            src={portada_url || "/placeholder-cover.jpg"}
            alt={titulo}
            className="w-full h-full"
          />
          {hasProtagonistas && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 30%, transparent), transparent)",
              }}
            />
          )}
        </div>

        {/* Reverso: protagonistas */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "var(--bg-main)",
            padding: "20px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderRadius: "var(--radius-card)",
            overflowY: "auto",
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
                    <img
                      src={img}
                      alt={label}
                      style={{ width: 36, height: 36, objectFit: "cover", flexShrink: 0, borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 900, color: "var(--primary)", opacity: 0.5,
                        borderRadius: "var(--radius-btn)", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                        background: `color-mix(in srgb, var(--primary) ${i % 2 === 0 ? 5 : 8}%, transparent)`,
                      }}
                    >
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
  const id = params?.id as string;
  const router = useRouter();

  const [loading, setLoading]                 = useState(true);
  const [libro, setLibro]                     = useState<Libro | null>(null);
  const [capitulos, setCapitulos]             = useState<Capitulo[]>([]);
  const [capituloProximo, setCapituloProximo] = useState<CapituloProximo | null | false>(null);
  const [notFound, setNotFound]               = useState(false);
  const [leidos, setLeidos]                   = useState<Set<string>>(new Set());

  // ── Cargar capítulos leídos desde localStorage ──
  // Se re-lee al montar Y cada vez que la página vuelve a ser visible
  // (el usuario regresa del lector donde el observer pudo haber guardado más)
  useEffect(() => {
    if (!id) return;

    const leer = () => {
      try {
        const raw = localStorage.getItem(`leidos:${id}`);
        setLeidos(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      } catch { }
    };

    leer(); // carga inicial

    const onVisible = () => { if (document.visibilityState === "visible") leer(); };
    document.addEventListener("visibilitychange", onVisible);
    /* También al recibir foco en caso de que el lector
       abra en la misma pestaña y Next.js no desmonte */
    window.addEventListener("focus", leer);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", leer);
    };
  }, [id]);

  const marcarLeido = (capId: string) => {
    setLeidos(prev => {
      const next = new Set(prev);
      next.add(capId);
      try { localStorage.setItem(`leidos:${id}`, JSON.stringify([...next])); } catch { }
      return next;
    });
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    const ahora = new Date().toISOString();

    Promise.all([
      supabase.from("libros").select("*").eq("id", id).single(),
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
    ]).then(([libroRes, capsRes, proximoRes]) => {
      if (!libroRes.data) { setNotFound(true); return; }
      setLibro(libroRes.data);

      // Normalizar joins que Supabase puede devolver como array o null
      const capsNorm = ((capsRes.data as any[]) ?? []).map((c) => ({
        ...c,
        narrador: normOne(c.narrador),
        reino:    normOne(c.reino),
      })) as Capitulo[];

      setCapitulos(capsNorm);
      setCapituloProximo(proximoRes.data ?? false);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading text="Cargando libro…" />;
  if (notFound || !libro) return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4">
      <p className="text-primary/30 font-black uppercase text-xs tracking-widest italic">Libro no encontrado</p>
      <BackBtn onClick={() => router.push("/wiki/libros")} />
    </div>
  );

  // ── Construir grupos (reino > narrador) ──
  const grupos = buildGrupos(capitulos);

  // ¿Algún capítulo usa reino o narrador?
  const tieneReinos    = grupos.some(g => g.reino    !== null);
  const tieneNarradores = grupos.some(g => g.narrador !== null);
  const tieneAgrupacion = tieneReinos || tieneNarradores;

  // Colores de acento por grupo (igual que antes)
  const acentos = [
    { bg: "bg-primary/5",             border: "border-primary/30",           dot: "bg-primary/40" },
    { bg: "bg-[var(--accent)]/5",     border: "border-[var(--accent)]/20",   dot: "bg-[var(--accent)]/50" },
    { bg: "bg-primary/8",             border: "border-primary/20",           dot: "bg-primary/60" },
    { bg: "bg-[var(--accent)]/8",     border: "border-[var(--accent)]/25",   dot: "bg-[var(--accent)]/70" },
  ];

  const esExtra = libro.categoria?.toLowerCase() === "extra";

  // ── Layout para categoría "Extra": imagen grande + título centrado + capítulos planos ──
  if (esExtra) {
    return (
      <div className="min-h-screen bg-bg-main pb-20 relative">
        <BackBtn onClick={() => router.push("/wiki/libros")} />

        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[340px_1fr] gap-12 mt-4 items-start">
          {/* Imagen grande pegada al top */}
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

          {/* Título centrado + capítulos planos */}
          <main>
            <h1 className="text-4xl font-black text-primary italic tracking-tighter leading-[0.9] mb-10 uppercase text-center">
              {libro.titulo}
            </h1>

            {leidos.size > 0 && (
              <div className="flex justify-end mb-4">
                <span className="flex items-center gap-1.5 text-primary/40 font-bold text-[9px] uppercase tracking-widest italic">
                  <CheckCircle2 size={11} className="text-primary/30" />
                  {leidos.size}/{capitulos.length} leídos
                </span>
              </div>
            )}

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
                        router.push(`/wiki/libros/${id}/leer/${capitulos[0]?.id ?? cap.id}#cap-${cap.id}`);
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

  // ── Layout normal ──
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

          {capituloProximo && (
            <div className="card-main mt-8 p-6">
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <Calendar size={12} /> Próximo Capítulo
              </h4>
              <p className="text-primary font-bold text-sm leading-snug mb-1">{capituloProximo.titulo_capitulo}</p>
              <p className="text-primary/50 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 italic">
                <Clock size={10} />
                {new Date(capituloProximo.fecha_publicacion).toLocaleDateString("es-ES", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
          )}

        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <div className="mb-12">
            <h1 className="text-5xl font-black text-primary italic tracking-tighter leading-[0.9] mb-6 uppercase text-center">
              {libro.titulo}
            </h1>
          </div>

          {/* ── Índice agrupado ── */}
          <div className="space-y-4">
            {leidos.size > 0 && (
              <div className="flex justify-end mb-4">
                <span className="flex items-center gap-1.5 text-primary/40 font-bold text-[9px] uppercase tracking-widest italic">
                  <CheckCircle2 size={11} className="text-primary/30" />
                  {leidos.size}/{capitulos.length} leídos
                </span>
              </div>
            )}

            {capitulos.length === 0 ? (
              <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
                Aún no hay capítulos publicados
              </p>
            ) : tieneAgrupacion ? (
              /* ── Vista agrupada por reino (o narrador como fallback) ── */
              <div className="flex flex-col gap-10">
                {grupos.map((grupo, gi) => {
                  const acento   = acentos[gi % acentos.length];
                  const label    = grupoLabel(grupo);
                  const img      = grupoImg(grupo);
                  const primerCapId = grupo.capitulos[0]?.id;

                  return (
                    <div key={gi}>
                      {/* Cabecera del grupo */}
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
                            {/* Si hay reino Y narrador, mostrar narrador debajo */}
                            {grupo.reino && grupo.narrador && (
                              <p className="text-primary/40 font-bold text-[10px] uppercase tracking-wide italic">
                                {grupo.narrador.nombre}
                              </p>
                            )}
                          </div>
                          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 12%, transparent), transparent)" }} />
                        </div>
                      )}

                      {/* Lista de capítulos del grupo */}
                      <div className={`grid gap-2`}>
                        {grupo.capitulos.map((cap) => {
                          const esRuta  = cap.titulo_capitulo?.startsWith("[Ruta]");
                          const leido   = leidos.has(cap.id);
                          return (
                            <button
                              key={cap.id}
                              onClick={() => {
                                marcarLeido(cap.id);
                                router.push(`/wiki/libros/${id}/leer/${primerCapId}#cap-${cap.id}`);
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
              /* ── Vista plana (sin reinos ni narradores) ── */
              <div className="grid gap-3">
                {capitulos.map((cap) => {
                  const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                  const leido  = leidos.has(cap.id);
                  return (
                    <button
                      key={cap.id}
                      onClick={() => {
                        marcarLeido(cap.id);
                        router.push(`/wiki/libros/${id}/leer/${capitulos[0]?.id ?? cap.id}#cap-${cap.id}`);
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