"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MotionDiv } from '@/components/ui/Motion';
import Link from "next/link";
import { supabase } from "@/lib/api/client/supabase";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, PageHeader } from "@/components/ui";
import { Music, User, ChevronRight, List, LayoutGrid } from "lucide-react";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";
import { toSlug } from "@/lib/utils/slugify";

interface Personaje {
  id: string;
  nombre: string;
  img_url?: string;
}

interface Cancion {
  id: string;
  titulo: string;
  personaje_id?: string | null;
  personaje?: Personaje | Personaje[] | null;
  cantante?: string;
  compositor?: string;
  idioma?: string;
  portada_url?: string;
  visible?: boolean;
}

function normPersonaje(v: Personaje | Personaje[] | null | undefined): Personaje | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const CancionCardGrid = ({ cancion, index }: { cancion: Cancion; index: number }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="relative group h-full"
  >
    <Link href={`/garlia/canciones/${toSlug(cancion.titulo)}`}>
      <MotionDiv
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="cursor-pointer h-full"
      >
        <div
          className="relative aspect-square overflow-hidden bg-linear-to-br from-primary/10 to-primary/5"
          style={{
            borderRadius: "var(--radius-card)",
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <SmartImage
            src={cancion.portada_url || "/placeholder-cover.jpg"}
            alt={cancion.titulo}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />

          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-b from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

          {/* Textos más pequeños para restarles protagonismo frente al personaje */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h2 className="text-white font-black uppercase text-sm leading-tight tracking-tighter italic line-clamp-2 drop-shadow-sm group-hover:text-accent transition-colors duration-300">
              {cancion.titulo}
            </h2>
            {cancion.cantante && (
              <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest mt-1 truncate">
                {cancion.cantante}
              </p>
            )}
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
    <Link href={`/garlia/canciones/${toSlug(cancion.titulo)}`}>
      {/* Reducimos padding y tamaños generales de la fila */}
      <div
        className="group flex items-center gap-3 bg-white-custom/50 hover:bg-white-custom/80 backdrop-blur-sm px-3 py-2 transition-all duration-300 cursor-pointer"
        style={{
          borderRadius: "var(--radius-btn)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
      >
        <span className="font-mono text-[9px] font-black text-primary/20 w-5 text-right shrink-0 select-none group-hover:text-primary/40 transition-colors">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Imagen en miniatura más pequeña (w-10 h-10 en lugar de 14) */}
        <div
          className="w-10 h-10 overflow-hidden shrink-0"
          style={{ borderRadius: "var(--radius-btn)", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)" }}
        >
          <SmartImage src={cancion.portada_url || "/placeholder-cover.jpg"} alt={cancion.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-primary font-black uppercase text-xs group-hover:text-accent transition-colors tracking-tighter italic truncate">
            {cancion.titulo}
          </h2>
          {cancion.cantante && (
            <p className="text-primary/40 text-[9px] font-bold uppercase tracking-widest truncate mt-0.5">
              {cancion.cantante}
            </p>
          )}
        </div>

        <ChevronRight size={14} className="text-primary/20 group-hover:text-primary/50 transition-colors shrink-0" />
      </div>
    </Link>
  </MotionDiv>
);

const PersonajeBloque = ({
  personaje,
  canciones,
  vistaFila,
  globalOffset,
  imgUrl,
}: {
  personaje: string;
  canciones: Cancion[];
  vistaFila: boolean;
  globalOffset: number;
  imgUrl?: string;
}) => (
  <MotionDiv
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="mb-24 flex flex-col md:flex-row gap-8 lg:gap-12 items-start"
  >
    {/* COLUMNA IZQUIERDA: Personaje en Grande */}
    <div className="w-full md:w-1/3 lg:w-1/4 shrink-0 flex flex-col items-center md:items-start text-center md:text-left sticky top-24">
      {imgUrl ? (
        <div 
          className="w-48 h-48 md:w-full md:aspect-square mb-5 overflow-hidden shadow-lg bg-primary/5"
          style={{
            borderRadius: "var(--radius-card)",
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)"
          }}
        >
          <img
            src={imgUrl}
            alt={personaje}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="w-48 h-48 md:w-full md:aspect-square mb-5 flex items-center justify-center bg-primary/5 shadow-lg"
          style={{
            borderRadius: "var(--radius-card)",
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)"
          }}
        >
          <User size={64} className="text-primary/20" />
        </div>
      )}

      <h2 className="text-3xl lg:text-4xl font-black uppercase text-primary tracking-tighter leading-none mb-2">
        {personaje}
      </h2>
      <div className="flex items-center gap-2 mb-4 w-full justify-center md:justify-start">
        <div className="h-px w-8" style={{ background: "color-mix(in srgb, var(--primary) 20%, transparent)" }} />
        <p className="text-[10px] font-mono font-bold text-primary/40 tracking-widest uppercase whitespace-nowrap">
          {canciones.length} {canciones.length !== 1 ? "canciones" : "canción"}
        </p>
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 20%, transparent), transparent)" }} />
      </div>
    </div>

    {/* COLUMNA DERECHA: Canciones en Pequeñito */}
    <div className="w-full md:w-2/3 lg:w-3/4 flex-1">
      {vistaFila ? (
        <div className="flex flex-col gap-2">
          {canciones.map((c, i) => (
            <CancionCardFila key={c.id} cancion={c} index={globalOffset + i} />
          ))}
        </div>
      ) : (
        // Utilizamos un grid más denso (más columnas) para que las tarjetas se vean más pequeñas
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {canciones.map((c, i) => (
            <CancionCardGrid key={c.id} cancion={c} index={globalOffset + i} />
          ))}
        </div>
      )}
    </div>
  </MotionDiv>
);

export default function CancionesPage() {
  const { data: cancionesCacheadas, loading } = useSupabaseData<Cancion>("canciones");
  const [canciones, setCanciones] = useState<Cancion[]>([]);
  const [vistaFila, setVistaFila] = useState(false);

  useEffect(() => {
    if (cancionesCacheadas.length > 0) {
      setCanciones(cancionesCacheadas);
    }
  }, [cancionesCacheadas]);

  useEffect(() => {
    supabase
      .from("canciones")
      .select("*, personaje:personajes!personaje_id(id, nombre, img_url)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCanciones(data as Cancion[]);
      });
  }, []);

  const filtradas = useMemo(() =>
    canciones.filter(c => c.visible !== false),
    [canciones]
  );

  const grupos = useMemo(() => {
    const SIN_PERSONAJE = "Sin personaje";
    const mapa = new Map<string, { canciones: Cancion[]; imgUrl?: string }>();

    for (const c of filtradas) {
      const p = normPersonaje(c.personaje);
      const key = p?.nombre?.trim() || SIN_PERSONAJE;
      if (!mapa.has(key)) mapa.set(key, { canciones: [], imgUrl: p?.img_url });
      mapa.get(key)!.canciones.push(c);
      if (!mapa.get(key)!.imgUrl && p?.img_url) {
        mapa.get(key)!.imgUrl = p.img_url;
      }
    }

    const entries = [...mapa.entries()];
    const conPersonaje = entries.filter(([k]) => k !== SIN_PERSONAJE);
    const sinPersonaje = entries.filter(([k]) => k === SIN_PERSONAJE);

    return [...conPersonaje, ...sinPersonaje];
  }, [filtradas]);

  if (loading) return <Loading text="Cargando" />;

  let offsetAccumulator = 0;

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <div className="max-w-6xl mx-auto pt-16 px-6">
        <div className="flex items-end justify-between mb-10 gap-4">
          <PageHeader title="Canciones" icon={<Music size={22} />} />

          <button
            onClick={() => setVistaFila(v => !v)}
            title={vistaFila ? "Vista cuadrícula" : "Vista lista"}
            className="p-3 rounded-btn border border-primary/10 hover:bg-primary/5 hover:border-primary/20 text-primary/40 hover:text-primary transition-all shrink-0 mb-[2px]"
          >
            {vistaFila ? <LayoutGrid size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {grupos.length === 0 ? (
          <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-24 italic">
            No hay canciones disponibles
          </p>
        ) : (
          grupos.map(([personaje, { canciones: cancionesList, imgUrl }]) => {
            const currentOffset = offsetAccumulator;
            offsetAccumulator += cancionesList.length;
            return (
              <PersonajeBloque
                key={personaje}
                personaje={personaje}
                canciones={cancionesList}
                vistaFila={vistaFila}
                globalOffset={currentOffset}
                imgUrl={imgUrl}
              />
            );
          })
        )}
      </div>
    </div>
  );
}