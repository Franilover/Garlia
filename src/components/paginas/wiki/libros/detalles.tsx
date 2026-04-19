"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { Play, ListOrdered, Calendar, Clock, Loader2 } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";

interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string | null;
  libro_id: string;
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

export default function LibroDetalle() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  // Un solo estado de loading para libro + capítulos
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
        .select("*")
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
      if (!libroRes.data) {
        // El libro no existe o no es visible — no renderizar nada
        setNotFound(true);
        return;
      }
      setLibro(libroRes.data);
      setCapitulos(capsRes.data ?? []);
      // false = consultado pero sin resultado; null = todavía no consultado
      setCapituloProximo(proximoRes.data ?? false);
    }).finally(() => {
      setLoading(false);
    });
  }, [id]);

  // Esperar a que todo esté listo antes de mostrar cualquier cosa
  if (loading) return <Loading text="Cargando libro…" />;

  // Libro no encontrado
  if (notFound || !libro) return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4">
      <p className="text-primary/30 font-black uppercase text-xs tracking-widest italic">Libro no encontrado</p>
      <BackBtn onClick={() => router.push("/wiki/libros")} />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/wiki/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        <aside>
          <div className="aspect-3/4 rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10 bg-white-custom relative">
            <SmartImage
              src={libro.portada_url || "/placeholder-cover.jpg"}
              alt={libro.titulo}
              className="w-full h-full"
            />
          </div>

          {/* Próximo capítulo programado — siempre visible tras la carga */}
          <div className="mt-8 p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10">
            <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
              <Calendar size={12} /> Próximo Capítulo
            </h4>

            {capituloProximo ? (
              <>
                <p className="text-primary font-bold text-sm leading-snug mb-1">
                  {capituloProximo.titulo_capitulo}
                </p>
                <p className="text-primary/50 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 italic">
                  <Clock size={10} />
                  {new Date(capituloProximo.fecha_publicacion).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </>
            ) : (
              <p className="text-primary/30 font-bold text-xs italic">
                Sin capítulo programado
              </p>
            )}
          </div>
        </aside>

        <main>
          <div className="mb-12">
            <h1 className="text-5xl font-black text-primary italic tracking-tighter leading-[0.9] mb-6 uppercase">
              {libro.titulo}
            </h1>
            <p className="text-primary/70 leading-relaxed text-lg font-medium italic">
              &quot;{libro.sinopsis}&quot;
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                <ListOrdered size={16} /> Índice
              </h3>
            </div>

            <div className="grid gap-3">
              {capitulos.length === 0 ? (
                <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
                  Aún no hay capítulos publicados
                </p>
              ) : (
                capitulos.map((cap) => {
                  const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                  return (
                    <button
                      key={cap.id}
                      onClick={() => router.push(`/wiki/libros/${id}/leer/${capitulos[0]?.id ?? cap.id}#cap-${cap.id}`)}
                      className={`w-full flex items-center justify-between p-6 border rounded-[var(--radius-card)] hover:border-primary/20 transition-all text-left group ${esRuta ? "bg-blue-50/60 border-blue-100" : "bg-white-custom border-primary/5"}`}
                    >
                      <div className="flex flex-col gap-1">
                        {esRuta && (
                          <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">
                            ↳ Nodo de ruta
                          </span>
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
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}