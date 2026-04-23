"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { Play, ListOrdered, Calendar, Clock, BookOpen, CheckCircle2 } from "lucide-react";
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
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(`leidos:${id}`);
      if (raw) setLeidos(new Set(JSON.parse(raw) as string[]));
    } catch { /* localStorage bloqueado o datos corruptos */ }
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
    { bg: "bg-primary/5",             border: "border-primary/15",           dot: "bg-primary/40" },
    { bg: "bg-[var(--accent)]/5",     border: "border-[var(--accent)]/20",   dot: "bg-[var(--accent)]/50" },
    { bg: "bg-primary/8",             border: "border-primary/20",           dot: "bg-primary/60" },
    { bg: "bg-[var(--accent)]/8",     border: "border-[var(--accent)]/25",   dot: "bg-[var(--accent)]/70" },
  ];

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/wiki/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        {/* ── Portada y sidebar ── */}
        <aside>
          <div
            className="aspect-3/4 rounded-[var(--radius-card)] overflow-hidden bg-white-custom relative"
            style={{ border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)", boxShadow: "var(--shadow-card)" }}
          >
            <SmartImage
              src={libro.portada_url || "/placeholder-cover.jpg"}
              alt={libro.titulo}
              className="w-full h-full"
            />
          </div>

          <div className="card-main mt-8 p-6">
            <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
              <Calendar size={12} /> Próximo Capítulo
            </h4>
            {capituloProximo ? (
              <>
                <p className="text-primary font-bold text-sm leading-snug mb-1">{capituloProximo.titulo_capitulo}</p>
                <p className="text-primary/50 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 italic">
                  <Clock size={10} />
                  {new Date(capituloProximo.fecha_publicacion).toLocaleDateString("es-ES", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </>
            ) : (
              <p className="text-primary/30 font-bold text-xs italic">Sin capítulo programado</p>
            )}
          </div>

          {/* ── Resumen de grupos en sidebar (reinos o narradores) ── */}
          {tieneAgrupacion && grupos.length > 1 && (
            <div className="card-main mt-6 p-6">
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-4 flex items-center gap-2 italic">
                <BookOpen size={12} /> {tieneReinos ? "Reinos" : "Protagonistas"}
              </h4>
              <div className="flex flex-col gap-3">
                {grupos.map((g, i) => {
                  const label = grupoLabel(g);
                  const img   = grupoImg(g);
                  if (!label) return null;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      {img ? (
                        <img
                          src={img}
                          alt={label}
                          className="w-8 h-8 object-cover flex-shrink-0"
                          style={{ borderRadius: "var(--radius-btn)", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)" }}
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 flex items-center justify-center text-[10px] font-black text-primary/50 flex-shrink-0 ${acentos[i % acentos.length].bg}`}
                          style={{ borderRadius: "var(--radius-btn)", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)" }}
                        >
                          {label.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-primary font-black text-[11px] uppercase tracking-wide">
                          {g.reino?.nombre ?? g.narrador?.nombre}
                        </p>
                        {g.reino && g.narrador && (
                          <p className="text-primary/40 font-bold text-[9px] italic uppercase tracking-wide">
                            {g.narrador.nombre}
                          </p>
                        )}
                        <p className="text-primary/40 font-bold text-[9px] italic">
                          {g.capitulos.length} cap{g.capitulos.length !== 1 ? "ítulos" : "ítulo"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── Contenido principal ── */}
        <main>
          <div className="mb-12">
            <h1 className="text-5xl font-black text-primary italic tracking-tighter leading-[0.9] mb-6 uppercase">
              {libro.titulo}
            </h1>
            <p className="text-primary/70 leading-relaxed text-lg font-medium italic">
              &quot;{libro.sinopsis}&quot;
            </p>
          </div>

          {/* ── Índice agrupado ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-8 pb-4" style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                <ListOrdered size={16} /> Índice
              </h3>
              {leidos.size > 0 && (
                <span className="flex items-center gap-1.5 text-primary/40 font-bold text-[9px] uppercase tracking-widest italic">
                  <CheckCircle2 size={11} className="text-primary/30" />
                  {leidos.size}/{capitulos.length} leídos
                </span>
              )}
            </div>

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
                  const primerCapId = capitulos[0]?.id;

                  return (
                    <div key={gi}>
                      {/* Cabecera del grupo */}
                      {label && (
                        <div className="flex items-center gap-4 mb-4">
                          {img ? (
                            <img
                              src={img}
                              alt={label}
                              className="w-10 h-10 object-cover flex-shrink-0 shadow-md"
                              style={{ borderRadius: "var(--radius-btn)", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)" }}
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 flex items-center justify-center text-sm font-black text-primary/60 flex-shrink-0 ${acento.bg}`}
                              style={{ borderRadius: "var(--radius-btn)", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)" }}
                            >
                              {label.charAt(0)}
                            </div>
                          )}
                          <div>
                            {/* Etiqueta encima: "Reino" o "Narrador" */}
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 italic mb-0.5">
                              {grupo.reino ? "Reino" : "Narrador"}
                            </p>
                            <p className="text-primary font-black uppercase text-sm tracking-tight">
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
                      <div
                        className={`grid gap-2 pl-4`}
                        style={{ borderLeft: `calc(var(--border-width) * 2) solid color-mix(in srgb, var(--primary) ${gi % 2 === 0 ? "18" : "25"}%, transparent)` }}
                      >
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
                              className={`w-full flex items-center justify-between p-5 transition-all text-left group ${
                                esRuta  ? "bg-blue-50/60"  :
                                leido   ? "bg-primary/[0.03]" :
                                acento.bg
                              }`}
                              style={{
                                borderRadius: "var(--radius-card)",
                                border: `var(--border-width) solid ${
                                  esRuta ? "rgb(219 234 254)" :
                                  leido  ? "color-mix(in srgb, var(--primary) 5%, transparent)" :
                                  "color-mix(in srgb, var(--primary) 8%, transparent)"
                                }`,
                                boxShadow: leido ? "none" : "var(--shadow-card)",
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
                      className={`w-full flex items-center justify-between p-6 transition-all text-left group ${
                        esRuta ? "bg-blue-50/60" :
                        leido  ? "bg-primary/[0.03]" :
                        "bg-white-custom"
                      }`}
                      style={{
                        borderRadius: "var(--radius-card)",
                        border: `var(--border-width) solid ${
                          esRuta ? "rgb(219 234 254)" :
                          leido  ? "color-mix(in srgb, var(--primary) 5%, transparent)" :
                          "color-mix(in srgb, var(--primary) 8%, transparent)"
                        }`,
                        boxShadow: leido ? "none" : "var(--shadow-card)",
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