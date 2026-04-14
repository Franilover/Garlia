"use client";

import React from "react";
import Link from "next/link";
import { Book, Lock, Timer } from "lucide-react";
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
}

const Biblioteca = () => {
  const { data: libros, loading } = useSupabaseData<Libro>("libros", {
    isAdmin: false,
    order: { campo: "created_at", asc: false },
  });

  if (loading && libros.length === 0) return <Loading text="Abriendo archivos..." />;

  return (
    <div className="min-h-screen bg-bg-main pb-20">

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {libros.map((libro, index) => (
          <MotionDiv
            key={libro.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            <Link href={`/wiki/libros/${libro.id}`}>
              <div className="cursor-pointer relative">
                <MotionDiv
                  whileHover={{ y: -10 }}
                  className="relative aspect-[3/4] rounded-[var(--radius-card)] overflow-hidden shadow-xl border border-primary/10 bg-white-custom"
                >
                  <SmartImage
                    src={libro.portada_url || "/placeholder-cover.jpg"}
                    alt={libro.titulo}
                    className="w-full h-full object-cover"
                  />
                  {(() => {
                    const vis = libro.visibilidad;
                    if (!vis || vis === "publico") return null;
                    return (
                      <div className="absolute top-6 left-6 z-20 bg-white-custom/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10 flex items-center gap-2">
                        {vis === "programado" && <Timer size={10} className="text-primary" />}
                        {vis === "oculto"     && <Lock  size={10} className="text-primary" />}
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">
                          {libro.estado}
                        </span>
                      </div>
                    );
                  })()}
                </MotionDiv>

                <div className="mt-6 px-2">
                  <h2 className="text-primary font-black uppercase text-base group-hover:text-[var(--accent)] transition-colors leading-tight tracking-tight">
                    {libro.titulo}
                  </h2>
                  <p className="text-primary/50 text-xs mt-2 line-clamp-3 italic leading-relaxed font-medium">
                    &quot;{libro.sinopsis}&quot;
                  </p>
                </div>
              </div>
            </Link>
          </MotionDiv>
        ))}

        {!loading && libros.length === 0 && (
          <p className="col-span-full text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-24 italic">
            No hay libros disponibles por el momento
          </p>
        )}
      </div>
    </div>
  );
};

export default Biblioteca;