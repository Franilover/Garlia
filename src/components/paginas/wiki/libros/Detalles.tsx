"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { Play, ListOrdered, Calendar, Loader2 } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";

interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string;
  libro_id: string;
}

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  fecha_proximo_capitulo?: string;
}

export default function LibroDetalle() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [libro, setLibro]       = useState<Libro | null>(null);
  const [loadingLibro, setLoadingLibro] = useState(true);
  const [capitulos, setCapitulos] = useState<Capitulo[]>([]);
  const [loadingCaps, setLoadingCaps] = useState(true);




  useEffect(() => {
    if (!id) return;
    const hoy = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.from("libros").select("*").eq("id", id).single(),
      supabase.from("capitulos")
        .select("*").eq("libro_id", id)
        .lte("fecha_publicacion", hoy)
        .not("titulo_capitulo", "like", "[Ruta]%")
        .order("orden", { ascending: true }),
    ]).then(([libroRes, capsRes]) => {
      if (libroRes.data) setLibro(libroRes.data);
      setCapitulos(capsRes.data ?? []);
    }).finally(() => { setLoadingLibro(false); setLoadingCaps(false); });
  }, [id]);


  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/wiki/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[320px_1fr] gap-16 mt-4">
        <aside>
          <div className="aspect-3/4 rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10 bg-white-custom relative">
            {loadingLibro
              ? <div className="absolute inset-0 flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary/20" /></div>
              : <SmartImage src={libro?.portada_url || "/placeholder-cover.jpg"} alt={libro?.titulo || "Libro"} className="w-full h-full" />
            }
          </div>
          {!loadingLibro && libro?.fecha_proximo_capitulo && (
            <div className="mt-8 p-6 bg-primary/5 rounded-[var(--radius-card)] border border-primary/10">
              <h4 className="text-primary font-black uppercase text-[9px] tracking-[0.2em] mb-2 flex items-center gap-2 italic">
                <Calendar size={12} /> Próximo Capítulo
              </h4>
              <p className="text-primary font-bold text-sm">
                {new Date(libro.fecha_proximo_capitulo).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
              </p>
            </div>
          )}
        </aside>

        <main>
          <div className="mb-12">
            {loadingLibro ? (
              <div className="space-y-4">
                <div className="h-12 w-3/4 bg-primary/5 animate-pulse rounded-[var(--radius-btn)]" />
                <div className="h-20 w-full bg-primary/5 animate-pulse rounded-[var(--radius-btn)]" />
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-black text-primary italic tracking-tighter leading-[0.9] mb-6 uppercase">{libro?.titulo}</h1>
                <p className="text-primary/70 leading-relaxed text-lg font-medium italic">&quot;{libro?.sinopsis}&quot;</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-8 border-b border-primary/10 pb-4">
              <h3 className="text-primary font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 italic">
                <ListOrdered size={16} /> Índice
              </h3>

            </div>

            <div className="grid gap-3">
              {loadingCaps
                ? [1, 2, 3].map(i => <div key={i} className="w-full h-24 bg-primary/5 animate-pulse rounded-[var(--radius-card)]" />)
                : capitulos.length === 0
                  ? <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">Aún no hay capítulos publicados</p>
                  : capitulos.map((cap) => {
                      const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
                      return (
                        <button key={cap.id}
                          onClick={() => router.push(`/wiki/libros/${id}/leer/${capitulos[0]?.id ?? cap.id}#cap-${cap.id}`)}
                          className={`w-full flex items-center justify-between p-6 border rounded-[var(--radius-card)] hover:border-primary/20 transition-all text-left group ${esRuta ? "bg-blue-50/60 border-blue-100" : "bg-white-custom border-primary/5"}`}
                        >
                          <div className="flex flex-col gap-1">
                            {esRuta && <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">↳ Nodo de ruta</span>}
                            <span className="text-primary font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform">
                              {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                            </span>
                            <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                              {new Date(cap.fecha_publicacion) > new Date() ? "Programado: " : "Publicado: "}
                              {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                            </span>
                          </div>
                          <Play size={14} fill="currentColor" className="text-primary" />
                        </button>
                      );
                    })
              }
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}