"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Lock, Timer } from "lucide-react";
import { MotionDiv } from '@/components/ui/Motion';
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, PageHeader } from "@/components/ui";

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  estado: string;
  visibilidad: string;
  created_at: string;
  categoria: string | null;
}

const Biblioteca = () => {
  const { data: libros, loading } = useSupabaseData<Libro>("libros", {
    isAdmin: false,
    order: { campo: "created_at", asc: false },
  });

  const librosVisibles = useMemo(
    () => libros.filter(l => l.visibilidad === "publico" || l.visibilidad === "programado"),
    [libros]
  );

  // Agrupar por categoría, manteniendo orden de aparición
  const grupos = useMemo(() => {
    const map = new Map<string, Libro[]>();
    for (const libro of librosVisibles) {
      const cat = libro.categoria ?? "Sin categoría";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(libro);
    }
    return Array.from(map.entries());
  }, [librosVisibles]);

  const hayMultiplesCategorias = grupos.length > 1;

  if (loading) return <Loading text="Abriendo archivos..." />;

  const renderLibro = (libro: Libro, index: number) => (
    <MotionDiv
      key={libro.id}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      <Link href={`/wiki/libros/${libro.id}`} className="block">
        <MotionDiv
          whileHover={{ y: -10 }}
          className="relative aspect-[3/4] rounded-[var(--radius-card)] overflow-hidden shadow-xl border border-primary/10 bg-white-custom"
        >
          <SmartImage
            src={libro.portada_url || "/placeholder-cover.jpg"}
            alt={libro.titulo}
            className="w-full h-full object-cover"
          />
          {libro.visibilidad !== "publico" && (
            <div className="absolute top-6 left-6 z-20 bg-white-custom/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10 flex items-center gap-2">
              {libro.visibilidad === "programado" && <Timer size={10} className="text-primary" />}
              {libro.visibilidad === "oculto"     && <Lock  size={10} className="text-primary" />}
              <span className="text-[9px] font-black uppercase text-primary tracking-widest">
                {libro.estado}
              </span>
            </div>
          )}
        </MotionDiv>
        <div className="mt-6 px-2">
          <h2 className="text-primary font-black uppercase text-base group-hover:text-[var(--accent)] transition-colors leading-tight tracking-tight">
            {libro.titulo}
          </h2>
          <p className="text-primary/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
            &quot;{libro.sinopsis}&quot;
          </p>
        </div>
      </Link>
    </MotionDiv>
  );

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <br />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {librosVisibles.length === 0 ? (
          <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-24 italic">
            No hay libros disponibles por el momento
          </p>
        ) : hayMultiplesCategorias ? (
          /* Vista agrupada por categoría */
          <div className="flex flex-col gap-16">
            {grupos.map(([categoria, items]) => (
              <section key={categoria}>
                <h2
                  className="text-primary font-black uppercase text-[10px] tracking-[0.25em] italic mb-8 pb-3 flex items-center gap-3"
                  style={{ borderBottom: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
                >
                  {categoria}
                  <span className="text-primary/30 font-bold text-[9px]">({items.length})</span>
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
                  {items.map((libro, index) => renderLibro(libro, index))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Vista plana (una sola categoría) */
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
            {librosVisibles.map((libro, index) => renderLibro(libro, index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Biblioteca;