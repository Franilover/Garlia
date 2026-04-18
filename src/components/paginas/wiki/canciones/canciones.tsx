"use client";

import React, { useState, useMemo } from "react";
import { MotionDiv } from '@/components/ui/Motion';
import Link from "next/link";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, PageHeader } from "@/components/ui";
import { Music, User, Mic2, PenTool, Globe, ChevronRight, List, LayoutGrid } from "lucide-react";

interface Cancion {
  id: string;
  titulo: string;
  personaje?: string;
  cantante?: string;
  compositor?: string;
  idioma?: string;
  portada_url?: string;
  visible?: boolean; // 👈 campo de visibilidad (ajusta el nombre si es distinto en tu DB)
}

const CancionCardGrid = ({ cancion, index }: { cancion: Cancion; index: number }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="relative group h-full"
  >
    <Link href={`/wiki/canciones/${cancion.id}`}>
      <MotionDiv
        whileHover={{ y: -12 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="cursor-pointer h-full flex flex-col"
      >
        <div className="relative aspect-square rounded-[var(--radius-card)] overflow-hidden shadow-2xl border border-primary/10 bg-gradient-to-br from-primary/10 to-primary/5 group-hover:shadow-[0_20px_40px_rgba(107,94,112,0.15)] transition-all duration-500">
          <SmartImage
            src={cancion.portada_url || "/placeholder-cover.jpg"}
            alt={cancion.titulo}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {cancion.personaje && (
            <div className="absolute bottom-6 right-6 z-20 bg-white-custom/95 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20 flex items-center gap-2 shadow-lg">
              <User size={11} className="text-primary" />
              <span className="text-[9px] font-black text-primary uppercase italic tracking-tighter">{cancion.personaje}</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
            <div className="bg-white-custom/90 p-5 rounded-full shadow-2xl backdrop-blur-sm border border-primary/10">
              <ChevronRight size={32} className="text-primary ml-1" />
            </div>
          </div>
        </div>
        <div className="mt-6 flex-1 flex flex-col px-2">
          <h2 className="text-primary font-black uppercase text-lg group-hover:text-[var(--accent)] transition-colors leading-tight tracking-tighter italic line-clamp-2">
            {cancion.titulo}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-primary/40 font-bold text-[8px] uppercase tracking-[0.2em]">
            {cancion.cantante   && <span className="flex items-center gap-2"><Mic2 size={10} />{cancion.cantante}</span>}
            {cancion.compositor && <span className="flex items-center gap-2"><PenTool size={10} />{cancion.compositor}</span>}
            {cancion.idioma     && <span className="flex items-center gap-2"><Globe size={10} />{cancion.idioma}</span>}
          </div>
        </div>
      </MotionDiv>
    </Link>
  </MotionDiv>
);

const CancionCardFila = ({ cancion, index }: { cancion: Cancion; index: number }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
  >
    <Link href={`/wiki/canciones/${cancion.id}`}>
      <div className="group flex items-center justify-between gap-4 bg-white-custom/50 hover:bg-white-custom/80 backdrop-blur-sm border border-primary/10 hover:border-primary/20 rounded-[var(--radius-btn)] px-6 py-4 transition-all duration-300 cursor-pointer">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-[var(--radius-btn)] overflow-hidden shrink-0 border border-primary/10">
            <SmartImage src={cancion.portada_url || "/placeholder-cover.jpg"} alt={cancion.titulo} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h2 className="text-primary font-black uppercase text-sm group-hover:text-[var(--accent)] transition-colors tracking-tighter italic truncate">
              {cancion.titulo}
            </h2>
            {(cancion.cantante || cancion.personaje) && (
              <p className="text-primary/40 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
                {cancion.cantante || cancion.personaje}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ChevronRight size={16} className="text-primary/30 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  </MotionDiv>
);

export default function CancionesPage() {
  const { data: canciones, loading } = useSupabaseData<Cancion>("canciones", {
    order: { campo: "created_at", asc: false },
    // 👇 Opción A: filtrar por visibilidad directamente en la query (recomendado)
    // Si tu hook soporta filters, úsalo así:
    // filters: [{ campo: "visible", valor: true }],
  });
  const [vistaFila, setVistaFila] = useState(false);
  const [busqueda,  setBusqueda]  = useState("");

  // 👇 useMemo SIEMPRE antes de cualquier return condicional (reglas de hooks)
  const filtradas = useMemo(() =>
    canciones
      .filter(c => c.visible !== false) // excluye las no visibles (null/undefined se tratan como visible)
      .filter(c => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return (
          c.titulo.toLowerCase().includes(q) ||
          c.cantante?.toLowerCase().includes(q) ||
          c.personaje?.toLowerCase().includes(q)
        );
      }),
    [canciones, busqueda]
  );

  if (loading) return <Loading text="Cargando" />;

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <div className="max-w-6xl mx-auto pt-16 px-6">
        <PageHeader title="Soliloquios" icon={<Music size={32} />} />
        <div className="flex items-center gap-3 mb-10">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar canción…"
            className="flex-1 bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] px-5 py-3 text-sm font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/25 transition-all"
          />
          <button
            onClick={() => setVistaFila(v => !v)}
            title={vistaFila ? "Vista cuadrícula" : "Vista lista"}
            className="p-3 rounded-[var(--radius-btn)] border border-primary/10 hover:bg-primary/5 hover:border-primary/20 text-primary/40 hover:text-primary transition-all"
          >
            {vistaFila ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {filtradas.length === 0 ? (
          <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-24 italic">
            No hay canciones disponibles
          </p>
        ) : vistaFila ? (
          <div className="flex flex-col gap-3">
            {filtradas.map((c, i) => <CancionCardFila key={c.id} cancion={c} index={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filtradas.map((c, i) => <CancionCardGrid key={c.id} cancion={c} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}