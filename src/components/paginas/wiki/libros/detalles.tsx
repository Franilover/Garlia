"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { Play, ListOrdered, Calendar, Clock, BookOpen } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";

interface Narrador {
  id: string;
  nombre: string;
  img_url?: string;
}

interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string | null;
  libro_id: string;
  narrador_id: string | null;
  narrador?: Narrador | null;
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

interface GrupoNarrador {
  narrador: Narrador | null;
  capitulos: Capitulo[];
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    const ahora = new Date().toISOString();

    Promise.all([
      supabase.from("libros").select("*").eq("id", id).single(),
      supabase
        .from("capitulos")
        .select("*, narrador:personajes!narrador_id(id, nombre, img_url)")
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
      setCapitulos((capsRes.data as Capitulo[]) ?? []);
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

  // ── Agrupar capítulos por narrador ──
  const grupos: GrupoNarrador[] = [];
  const visto = new Map<string | null, number>();

  for (const cap of capitulos) {
    const key = cap.narrador_id ?? null;
    if (visto.has(key)) {
      grupos[visto.get(key)!].capitulos.push(cap);
    } else {
      visto.set(key, grupos.length);
      grupos.push({ narrador: cap.narrador ?? null, capitulos: [cap] });
    }
  }

  const tieneNarradores = grupos.some(g => g.narrador !== null);

  // Colores de acento por grupo
  const acentos = [
    { bg: "bg-primary/5", border: "border-primary/15", dot: "bg-primary/40" },
    { bg: "bg-[var(--accent)]/5", border: "border-[var(--accent)]/20", dot: "bg-[var(--accent)]/50" },
    { bg: "bg-primary/8", border: "border-primary/20", dot: "bg-primary/60" },
    { bg: "bg-[var(--accent)]/8", border: "border-[var(--accent)]/25", dot: "bg-[var(--accent)]/70" },
  ];

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/wiki/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        {/* ── Portada y sidebar ── */}
        <aside>
          <div className="aspect-3/4 rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10 bg-white-custom relative">
            <SmartImage
              src={libro.portada_url || "/placeholder-cover.jpg"}
              alt={libro.titulo}
              className="w-full h-full"
            />
          </div>

          <div className="mt-8 p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10">
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

          {/* ── Resumen de narradores (sidebar) ── */}
          {tieneNarradores && grupos.length > 1 && (
            <div className="mt-6 p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10">
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-4 flex items-center gap-2 italic">
                <BookOpen size={12} /> Protagonistas
              </h4>
              <div className="flex flex-col gap-3">
                {grupos.map((g, i) => (
                  g.narrador && (
                    <div key={g.narrador.id} className="flex items-center gap-3">
                      {g.narrador.img_url ? (
                        <img src={g.narrador.img_url} alt={g.narrador.nombre}
                          className="w-8 h-8 rounded-full object-cover border border-primary/10 flex-shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-primary/50 border border-primary/10 flex-shrink-0 ${acentos[i % acentos.length].bg}`}>
                          {g.narrador.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-primary font-black text-[11px] uppercase tracking-wide">{g.narrador.nombre}</p>
                        <p className="text-primary/40 font-bold text-[9px] italic">{g.capitulos.length} cap{g.capitulos.length !== 1 ? "ítulos" : "ítulo"}</p>
                      </div>
                    </div>
                  )
                ))}
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
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                <ListOrdered size={16} /> Índice
              </h3>
            </div>

            {capitulos.length === 0 ? (
              <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
                Aún no hay capítulos publicados
              </p>
            ) : tieneNarradores ? (
              /* ── Vista agrupada por narrador ── */
              <div className="flex flex-col gap-10">
                {grupos.map((grupo, gi) => {
                  const acento = acentos[gi % acentos.length];
                  const primerCapId = capitulos[0]?.id;

                  return (
                    <div key={gi}>
                      {/* Cabecera del narrador */}
                      {grupo.narrador && (
                        <div className="flex items-center gap-4 mb-4">
                          {grupo.narrador.img_url ? (
                            <img
                              src={grupo.narrador.img_url}
                              alt={grupo.narrador.nombre}
                              className="w-10 h-10 rounded-full object-cover border border-primary/10 flex-shrink-0 shadow-md"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-primary/60 border border-primary/15 flex-shrink-0 ${acento.bg}`}>
                              {grupo.narrador.nombre.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/35 italic mb-0.5">Narrador</p>
                            <p className="text-primary font-black uppercase text-sm tracking-tight">{grupo.narrador.nombre}</p>
                          </div>
                          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 12%, transparent), transparent)" }} />
                        </div>
                      )}

                      {/* Lista de capítulos del grupo */}
                      <div className={`grid gap-2 pl-0 border-l-2 ${acento.border} pl-4`}>
                        {grupo.capitulos.map((cap) => {
                          const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                          return (
                            <button
                              key={cap.id}
                              onClick={() => router.push(`/wiki/libros/${id}/leer/${primerCapId}#cap-${cap.id}`)}
                              className={`w-full flex items-center justify-between p-5 border rounded-[var(--radius-card)] hover:border-primary/20 transition-all text-left group ${esRuta ? "bg-blue-50/60 border-blue-100" : `${acento.bg} border-primary/5`}`}
                            >
                              <div className="flex flex-col gap-1">
                                {esRuta && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>
                                )}
                                <span className="text-primary font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform">
                                  {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                                </span>
                                {cap.fecha_publicacion && (
                                  <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                                    Publicado: {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                                  </span>
                                )}
                              </div>
                              <Play size={14} fill="currentColor" className="text-primary/40 group-hover:text-primary transition-colors flex-shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Vista plana (sin narradores) ── */
              <div className="grid gap-3">
                {capitulos.map((cap) => {
                  const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                  return (
                    <button
                      key={cap.id}
                      onClick={() => router.push(`/wiki/libros/${id}/leer/${capitulos[0]?.id ?? cap.id}#cap-${cap.id}`)}
                      className={`w-full flex items-center justify-between p-6 border rounded-[var(--radius-card)] hover:border-primary/20 transition-all text-left group ${esRuta ? "bg-blue-50/60 border-blue-100" : "bg-white-custom border-primary/5"}`}
                    >
                      <div className="flex flex-col gap-1">
                        {esRuta && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>
                        )}
                        <span className="text-primary font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform">
                          {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                        </span>
                        {cap.fecha_publicacion && (
                          <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                            Publicado: {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                      <Play size={14} fill="currentColor" className="text-primary" />
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