"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MotionDiv } from '@/components/ui/Motion';
import Link from "next/link";
import { supabase } from "@/lib/api/client/supabase";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, PageHeader } from "@/components/ui";
import { Music, User, ChevronRight, List, LayoutGrid, Search, X } from "lucide-react";
import { useSupabaseData } from "@/hooks/data/useSupabaseData";

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

// Normaliza el join que Supabase puede devolver como array o objeto
function normPersonaje(v: Personaje | Personaje[] | null | undefined): Personaje | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Igual que en detalles.tsx — rotación de acentos por grupo
const ACENTOS = [
  { bg: "bg-primary/5",           borderLeft: "color-mix(in srgb, var(--primary) 18%, transparent)" },
  { bg: "bg-[var(--accent)]/5",   borderLeft: "color-mix(in srgb, var(--accent) 22%, transparent)"  },
  { bg: "bg-primary/8",           borderLeft: "color-mix(in srgb, var(--primary) 25%, transparent)" },
  { bg: "bg-[var(--accent)]/8",   borderLeft: "color-mix(in srgb, var(--accent) 28%, transparent)"  },
];

const CancionCardGrid = ({ cancion, index }: { cancion: Cancion; index: number }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="relative group h-full"
  >
    <Link href={`/wiki/canciones/${cancion.id}`}>
      <MotionDiv
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="cursor-pointer h-full"
      >
        <div
          className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5"
          style={{
            borderRadius: "var(--radius-card)",
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Imagen */}
          <SmartImage
            src={cancion.portada_url || "/placeholder-cover.jpg"}
            alt={cancion.titulo}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />

          {/* Gradiente permanente desde abajo */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

          {/* Gradiente hover desde arriba (oscurece más) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

          {/* Título sobre la imagen */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2 className="text-white font-black uppercase text-base leading-tight tracking-tighter italic line-clamp-2 drop-shadow-sm group-hover:text-[var(--accent)] transition-colors duration-300">
              {cancion.titulo}
            </h2>
            {cancion.cantante && (
              <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mt-1 truncate">
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
    <Link href={`/wiki/canciones/${cancion.id}`}>
      <div
        className="group flex items-center gap-4 bg-white-custom/50 hover:bg-white-custom/80 backdrop-blur-sm px-4 py-3 transition-all duration-300 cursor-pointer"
        style={{
          borderRadius: "var(--radius-btn)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
      >
        {/* Número de track */}
        <span className="font-mono text-[10px] font-black text-primary/20 w-6 text-right shrink-0 select-none group-hover:text-primary/40 transition-colors">
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Thumbnail 56px */}
        <div
          className="w-14 h-14 overflow-hidden shrink-0"
          style={{ borderRadius: "var(--radius-btn)", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)" }}
        >
          <SmartImage src={cancion.portada_url || "/placeholder-cover.jpg"} alt={cancion.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h2 className="text-primary font-black uppercase text-sm group-hover:text-[var(--accent)] transition-colors tracking-tighter italic truncate">
            {cancion.titulo}
          </h2>
          {cancion.cantante && (
            <p className="text-primary/40 text-[10px] font-bold uppercase tracking-widest truncate mt-0.5">
              {cancion.cantante}
            </p>
          )}
        </div>

        <ChevronRight size={14} className="text-primary/20 group-hover:text-primary/50 transition-colors shrink-0" />
      </div>
    </Link>
  </MotionDiv>
);

// ─── Encabezado de bloque por personaje ───────────────────────────────────────
const PersonajeHeader = ({
  nombre,
  count,
  imgUrl,
}: {
  nombre: string;
  count: number;
  imgUrl?: string;
}) => (
  <MotionDiv
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4 }}
    className="flex items-center gap-4 mb-6"
  >
    {imgUrl ? (
      <img
        src={imgUrl}
        alt={nombre}
        className="w-10 h-10 object-cover flex-shrink-0"
        style={{
          borderRadius: "var(--radius-btn)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
        }}
      />
    ) : (
      <div
        className="w-10 h-10 flex items-center justify-center bg-primary/5 flex-shrink-0"
        style={{
          borderRadius: "var(--radius-btn)",
          border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
        }}
      >
        <User size={14} className="text-primary/40" />
      </div>
    )}

    <div className="flex-1 flex items-center gap-3 min-w-0">
      {/* Línea izquierda */}
      <div
        className="h-px flex-1 hidden sm:block"
        style={{ background: "linear-gradient(to left, color-mix(in srgb, var(--primary) 10%, transparent), transparent)" }}
      />

      {/* Bloque central */}
      <div className="flex flex-col items-start sm:items-center gap-0.5 min-w-0">
        <p className="text-primary font-black uppercase text-sm tracking-tight leading-none">
          {nombre}
        </p>
        <p className="text-[8px] font-mono font-bold text-primary/30 tracking-widest">
          ── {count} {count !== 1 ? "canciones" : "canción"} ──
        </p>
      </div>

      {/* Línea derecha */}
      <div
        className="h-px flex-1"
        style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--primary) 10%, transparent), transparent)" }}
      />
    </div>
  </MotionDiv>
);

// ─── Bloque de un personaje ────────────────────────────────────────────────────
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
    className="mb-16"
  >
    <PersonajeHeader nombre={personaje} count={canciones.length} imgUrl={imgUrl} />

    {vistaFila ? (
      <div className="flex flex-col gap-3">
        {canciones.map((c, i) => (
          <CancionCardFila key={c.id} cancion={c} index={globalOffset + i} />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {canciones.map((c, i) => (
          <CancionCardGrid key={c.id} cancion={c} index={globalOffset + i} />
        ))}
      </div>
    )}
  </MotionDiv>
);

// ─── Página principal ──────────────────────────────────────────────────────────
export default function CancionesPage() {
  // Carga desde Dexie al instante, refresca en background desde Supabase
  const { data: cancionesCacheadas, loading } = useSupabaseData<Cancion>("canciones");

  // canciones enriquecidas con el join de personaje
  const [canciones, setCanciones] = useState<Cancion[]>([]);

  // Usar data cacheada inmediatamente mientras llega el join completo
  useEffect(() => {
    if (cancionesCacheadas.length > 0) {
      setCanciones(cancionesCacheadas);
    }
  }, [cancionesCacheadas]);

  // Fetch con join en background para enriquecer con datos de personaje
  useEffect(() => {
    supabase
      .from("canciones")
      .select("*, personaje:personajes!personaje_id(id, nombre, img_url)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCanciones(data as Cancion[]);
      });
  }, []);
  const [vistaFila, setVistaFila] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Filtrar visibles y por búsqueda
  const filtradas = useMemo(() =>
    canciones
      .filter(c => c.visible !== false)
      .filter(c => {
        if (!busqueda) return true;
        const q = busqueda.toLowerCase();
        return (
          c.titulo.toLowerCase().includes(q) ||
          c.cantante?.toLowerCase().includes(q) ||
          normPersonaje(c.personaje)?.nombre.toLowerCase().includes(q)
        );
      }),
    [canciones, busqueda]
  );

  // Agrupar por personaje manteniendo el orden de aparición
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

    // "Sin personaje" siempre al final
    const entries = [...mapa.entries()];
    const sinPersonaje = entries.filter(([k]) => k === SIN_PERSONAJE);
    const conPersonaje = entries.filter(([k]) => k !== SIN_PERSONAJE);

    return [...conPersonaje, ...sinPersonaje];
  }, [filtradas]);

  if (loading) return <Loading text="Cargando" />;

  // Offset acumulado para los índices de animación stagger
  let offset = 0;

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <div className="max-w-6xl mx-auto pt-16 px-6">
        <PageHeader title="Canciones" icon={<Music size={32} />} />

        <div className="flex items-center gap-3 mb-10">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar canción…"
              className="w-full bg-white-custom border border-primary/10 rounded-[var(--radius-btn)] pl-10 pr-10 py-3 text-sm font-bold text-primary outline-none focus:border-primary/30 placeholder:text-primary/25 transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <X size={12} />
              </button>
            )}
          </div>
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
        {grupos.length === 0 ? (
          <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-24 italic">
            No hay canciones disponibles
          </p>
        ) : (
          grupos.map(([personaje, { canciones: cancionesList, imgUrl }]) => {
            const bloque = (
              <PersonajeBloque
                key={personaje}
                personaje={personaje}
                canciones={cancionesList}
                vistaFila={vistaFila}
                globalOffset={offset}
                imgUrl={imgUrl}
              />
            );
            offset += cancionesList.length;
            return bloque;
          })
        )}
      </div>
    </div>
  );
}