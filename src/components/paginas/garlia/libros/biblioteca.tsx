"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, Timer, BookOpen, Sparkles } from "lucide-react";
import { MotionDiv } from "@/components/ui/Motion";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading } from "@/components/ui";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { toSlug } from "@/lib/utils/slugify";

// ─── Tipos ───────────────────────────────────────────────────────────────────
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

interface CapsInfo {
  count: number;
  ultimaFecha: string | null;
}

// ─── Caché en módulo (sobrevive navegación SPA) ───────────────────────────────
// TTL de 5 minutos: si el usuario vuelve a la página antes de eso, ve datos
// instantáneos sin ningún fetch.
const CACHE_TTL_MS = 5 * 60 * 1_000;

let _librosCache:  { data: Libro[];                  ts: number } | null = null;
let _capsCache:    { data: Record<string, CapsInfo>; ts: number } | null = null;

function isFresh(cache: { ts: number } | null): boolean {
  return !!cache && Date.now() - cache.ts < CACHE_TTL_MS;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function esReciente(fecha: string | null | undefined, dias = 14): boolean {
  if (!fecha) return false;
  return Date.now() - new Date(fecha).getTime() < dias * 86_400_000;
}

/** Una sola pasada de localStorage para TODOS los libros. */
function leerTodosLeidos(libros: Libro[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const libro of libros) {
    try {
      const raw = localStorage.getItem(`leidos:${libro.id}`);
      if (raw) result[libro.id] = (JSON.parse(raw) as string[]).length;
    } catch {}
  }
  return result;
}

// ─── Hook de datos: Dexie primero, luego Supabase en paralelo ────────────────
function useBibliotecaData() {
  const [libros,    setLibros]    = useState<Libro[]>([]);
  const [capsInfo,  setCapsInfo]  = useState<Record<string, CapsInfo>>({});
  const [loading,   setLoading]   = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      // ── 1. Mostrar caché de módulo inmediatamente (0ms) ──────────────────
      if (isFresh(_librosCache)) {
        setLibros(_librosCache!.data);
        setLoading(false);
      }
      if (isFresh(_capsCache)) {
        setCapsInfo(_capsCache!.data);
      }

      // ── 2. Mostrar datos de Dexie si no hay caché de módulo ──────────────
      if (!isFresh(_librosCache)) {
        try {
          const dexieLibros = (await db?.libros?.toArray()) as Libro[] | undefined;
          if (dexieLibros && dexieLibros.length > 0 && mounted.current) {
            const visibles = dexieLibros.filter(
              (l) => l.visibilidad === "publico" || l.visibilidad === "programado"
            );
            setLibros(visibles);
            setLoading(false); // ya hay algo que mostrar
          }
        } catch {}
      }

      // ── 3. Fetch en paralelo: libros + capítulos al mismo tiempo ─────────
      try {
        const [librosRes, capsRes] = await Promise.all([
          supabase
            .from("libros")
            .select("id, titulo, sinopsis, portada_url, estado, visibilidad, created_at, categoria")
            .in("visibilidad", ["publico", "programado"])
            .order("created_at", { ascending: false }),

          supabase
            .from("capitulos")
            .select("libro_id, fecha_publicacion")
            .eq("visibilidad", "publico")
            .not("titulo_capitulo", "like", "[Ruta]%"),
        ]);

        if (!mounted.current) return;

        // ── Libros ─────────────────────────────────────────────────────────
        if (librosRes.data) {
          const nuevosLibros = librosRes.data as Libro[];
          _librosCache = { data: nuevosLibros, ts: Date.now() };
          setLibros(nuevosLibros);
          setLoading(false);

          // Guardar en Dexie para la próxima visita offline
          try { await db?.libros?.bulkPut(nuevosLibros as any[]); } catch {}
        }

        // ── Capítulos → mapa de conteos ────────────────────────────────────
        if (capsRes.data) {
          const map: Record<string, CapsInfo> = {};
          for (const row of capsRes.data as { libro_id: string; fecha_publicacion: string | null }[]) {
            if (!map[row.libro_id]) map[row.libro_id] = { count: 0, ultimaFecha: null };
            map[row.libro_id].count++;
            const f = row.fecha_publicacion;
            if (f && (!map[row.libro_id].ultimaFecha || f > map[row.libro_id].ultimaFecha!)) {
              map[row.libro_id].ultimaFecha = f;
            }
          }
          _capsCache = { data: map, ts: Date.now() };
          setCapsInfo(map);
        }
      } catch (e) {
        // Si falla el fetch pero ya mostramos Dexie, simplemente dejamos lo que hay.
        if (mounted.current) setLoading(false);
      }
    }

    load();
    return () => { mounted.current = false; };
  }, []);

  return { libros, capsInfo, loading };
}

// ─── Tarjeta de libro ─────────────────────────────────────────────────────────
function LibroCard({
  libro,
  index,
  numCaps,
  nuevo,
  leidosCount,
}: {
  libro: Libro;
  index: number;
  numCaps: number;
  nuevo: boolean;
  leidosCount: number;
}) {
  const progreso = numCaps > 0 ? Math.round((leidosCount / numCaps) * 100) : 0;
  const slug = toSlug(libro.titulo);
  const href = `/garlia/libros/${slug}`;

  return (
    <MotionDiv
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      <Link href={href} className="block">
        {/* MÓVIL: layout horizontal */}
        <div className="flex sm:hidden items-center gap-4 p-3 rounded-[var(--radius-card)] border border-primary/8 bg-white-custom shadow-sm group-hover:border-primary/20 transition-colors">
          <div className="relative flex-shrink-0 w-16 aspect-[3/4] rounded-[var(--radius-btn)] overflow-hidden">
            <SmartImage
              src={libro.portada_url || "/placeholder-cover.jpg"}
              alt={libro.titulo}
              className="w-full h-full object-cover"
            />
            {nuevo && (
              <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-[var(--accent,var(--primary))] shadow-sm" />
            )}
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-primary font-black uppercase text-[11px] leading-tight tracking-tight line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                {libro.titulo}
              </h2>
              {libro.visibilidad !== "publico" && (
                <div className="flex items-center gap-1 flex-shrink-0 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                  {libro.visibilidad === "programado" && <Timer size={8} className="text-primary" />}
                  {libro.visibilidad === "oculto"     && <Lock  size={8} className="text-primary" />}
                  <span className="text-[7px] font-black uppercase text-primary tracking-widest">{libro.estado}</span>
                </div>
              )}
            </div>
            <p className="text-primary/40 text-[10px] italic leading-relaxed font-medium line-clamp-2">
              {libro.sinopsis}
            </p>
            {numCaps > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-0.5 rounded-full bg-primary/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/30 transition-all"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-primary/30 uppercase tracking-wider whitespace-nowrap">
                  {leidosCount > 0 ? `${leidosCount}/${numCaps}` : `${numCaps} caps`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP: portada con hover overlay */}
        <div className="hidden sm:block">
          <MotionDiv
            whileHover={{ y: -8 }}
            className="relative aspect-[3/4] rounded-[var(--radius-card)] overflow-hidden shadow-xl border border-primary/10 bg-white-custom"
          >
            <SmartImage
              src={libro.portada_url || "/placeholder-cover.jpg"}
              alt={libro.titulo}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
              <p className="text-white/90 text-[11px] italic leading-relaxed font-medium line-clamp-5">
                &ldquo;{libro.sinopsis}&rdquo;
              </p>
            </div>

            {libro.visibilidad !== "publico" && (
              <div className="absolute top-4 left-4 z-20 bg-white-custom/90 backdrop-blur-md px-3 py-1 rounded-full border border-primary/10 flex items-center gap-1.5">
                {libro.visibilidad === "programado" && <Timer size={9} className="text-primary" />}
                {libro.visibilidad === "oculto"     && <Lock  size={9} className="text-primary" />}
                <span className="text-[8px] font-black uppercase text-primary tracking-widest">{libro.estado}</span>
              </div>
            )}

            {nuevo && (
              <div className="absolute top-4 right-4 z-20 bg-[var(--accent,var(--primary))]/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5">
                <Sparkles size={8} className="text-white" />
                <span className="text-[8px] font-black uppercase text-white tracking-widest">Nuevo</span>
              </div>
            )}

            {numCaps > 0 && (
              <div className="absolute bottom-4 right-4 z-20 bg-white-custom/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-primary/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <BookOpen size={8} className="text-primary/60" />
                <span className="text-[8px] font-bold text-primary/70 tracking-wide">
                  {numCaps} cap{numCaps !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </MotionDiv>

          <div className="mt-5 px-1">
            <h2 className="text-primary font-black uppercase text-sm group-hover:text-[var(--accent)] transition-colors leading-tight tracking-tight">
              {libro.titulo}
            </h2>
            {numCaps > 0 && leidosCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-0.5 rounded-full bg-primary/8 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/25 transition-all"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <span className="text-[8px] font-bold text-primary/25 uppercase tracking-wider whitespace-nowrap">
                  {leidosCount}/{numCaps}
                </span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </MotionDiv>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
const Biblioteca = () => {
  const { libros, capsInfo, loading } = useBibliotecaData();

  // Una sola pasada de localStorage para todos los libros (no N hooks individuales)
  const [leidosMap, setLeidosMap] = useState<Record<string, number>>({});
  useEffect(() => {
    if (libros.length > 0) setLeidosMap(leerTodosLeidos(libros));
  }, [libros]);

  // Agrupar por categoría
  const grupos = useMemo(() => {
    const map = new Map<string, Libro[]>();
    for (const libro of libros) {
      const cat = libro.categoria ?? "Sin categoría";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(libro);
    }
    const orden: Record<string, number> = { Libro: 0, Extra: 1 };
    return Array.from(map.entries()).sort(
      ([a], [b]) => (orden[a] ?? 99) - (orden[b] ?? 99)
    );
  }, [libros]);

  const hayMultiplesCategorias = grupos.length > 1;

  if (loading && libros.length === 0) return <Loading text="Abriendo archivos..." />;

  const renderLibro = (libro: Libro, index: number) => {
    const info     = capsInfo[libro.id];
    const numCaps  = info?.count ?? 0;
    const nuevo    = esReciente(info?.ultimaFecha);
    const leidos   = leidosMap[libro.id] ?? 0;
    return (
      <LibroCard
        key={libro.id}
        libro={libro}
        index={index}
        numCaps={numCaps}
        nuevo={nuevo}
        leidosCount={leidos}
      />
    );
  };

  return (
    <div className="min-h-screen bg-bg-main pb-20">
      <br />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {libros.length === 0 ? (
          <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-24 italic">
            No hay libros disponibles por el momento
          </p>
        ) : hayMultiplesCategorias ? (
          <div className="flex flex-col gap-16">
            {grupos.map(([categoria, items]) => (
              <section key={categoria}>
                <h2
                  className="text-primary font-black uppercase text-[10px] tracking-[0.25em] italic mb-8 pb-3 flex items-center gap-3"
                  style={{
                    borderBottom:
                      "var(--border-width) solid color-mix(in srgb, var(--primary) 10%, transparent)",
                  }}
                >
                  {categoria}
                  <span className="text-primary/30 font-bold text-[9px]">({items.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
                  {items.map((libro, index) => renderLibro(libro, index))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
            {libros.map((libro, index) => renderLibro(libro, index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Biblioteca;