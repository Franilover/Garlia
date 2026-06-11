"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { db } from "@/lib/api/client/db";
import { Play, Calendar, Clock, CheckCircle2, Map, Building2 } from "lucide-react";
import { SmartImage } from "@/components/display/SmartImage";
import { Loading, BackBtn } from "@/components/ui";
import { toSlug, esUUID } from "@/lib/utils/slugify";

interface Capitulo {
  id: string;
  titulo_capitulo: string;
  orden: number;
  fecha_publicacion: string | null;
  libro_id: string;
  narrador_id: string | null;
  personajes_ids: string[] | null;
  reinos_ids: string[] | null;
  ciudades_ids: string[] | null;
}

interface Libro {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  categoria: string | null; // UUID del grupo, o null
}

interface Personaje {
  id: string;
  nombre: string;
  img_url: string | null;
}

interface Reino {
  id: string;
  nombre: string;
  logo_url: string | null;
}

interface Ciudad {
  id: string;
  nombre: string;
  imagen_url: string | null;
}

interface CapituloProximo {
  titulo_capitulo: string;
  fecha_publicacion: string;
}





// ─── Caché de módulo para caps (sobrevive navegación SPA) ────────────────────
const CAPS_TTL_MS = 5 * 60 * 1_000;
const _capsCache: Record<string, { data: Capitulo[]; ts: number }> = {};

function capsCacheados(libroId: string): Capitulo[] | null {
  const c = _capsCache[libroId];
  return c && Date.now() - c.ts < CAPS_TTL_MS ? c.data : null;
}








// ─── Resolver slug → libro usando Dexie primero ──────────────────────────────
async function resolverLibroPorSlug(slugParam: string): Promise<Libro | null> {
  // 1. Intentar desde Dexie (0 RTT)
  try {
    if (db?.libros) {
      const todos = await db.libros.toArray() as any[];
      if (todos.length > 0) {
        const encontrado = todos.find((l: any) =>
          toSlug(l.titulo ?? "") === slugParam && l.visibilidad === "publico"
        );
        if (encontrado) return encontrado as Libro;
      }
    }
  } catch {}

  // 2. Fallback a Supabase — UNA sola query con los campos necesarios
  const { data } = await supabase
    .from("libros")
    .select("id, titulo, sinopsis, portada_url, categoria")
    .eq("visibilidad", "publico");
  if (!data) return null;

  // Guardar en Dexie para la próxima visita
  try { await db?.libros?.bulkPut(data as any[]); } catch {}

  return (data.find((l: any) => toSlug(l.titulo ?? "") === slugParam) ?? null) as Libro | null;
}



export default function LibroDetalle() {
  const params   = useParams();
  const slugParam = params?.id as string;
  const router   = useRouter();

  const [loading,          setLoading]          = useState(true);
  const [loadingCaps,      setLoadingCaps]      = useState(true);
  const [libro,            setLibro]            = useState<Libro | null>(null);
  const [libroId,          setLibroId]          = useState<string | null>(null);
  const [capitulos,        setCapitulos]        = useState<Capitulo[]>([]);
  const [capituloProximo,  setCapituloProximo]  = useState<CapituloProximo | null | false>(null);
  const [notFound,         setNotFound]         = useState(false);
  const [leidos,           setLeidos]           = useState<Set<string>>(new Set());
  const [personajesMap,    setPersonajesMap]    = useState<Record<string, Personaje>>({});
  const [reinosMap,        setReinosMap]        = useState<Record<string, Reino>>({});
  const [ciudadesMap,      setCiudadesMap]      = useState<Record<string, Ciudad>>({});

  // ── Capítulos leídos ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!libroId) return;
    const leer = () => {
      try {
        const raw = localStorage.getItem(`leidos:${libroId}`);
        setLeidos(new Set(raw ? (JSON.parse(raw) as string[]) : []));
      } catch {}
    };
    leer();
    const onVisible = () => { if (document.visibilityState === "visible") leer(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", leer);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", leer);
    };
  }, [libroId]);

  const marcarLeido = (capId: string) => {
    if (!libroId) return;
    setLeidos(prev => {
      const next = new Set(prev);
      next.add(capId);
      try { localStorage.setItem(`leidos:${libroId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // ── Carga principal ───────────────────────────────────────────────────────────
  // Estrategia de tres capas para libro + caps:
  //   1. Libro: Dexie → mostrar portada/sinopsis sin spinner
  //   2. Caps:  caché de módulo → Dexie → Supabase (fuente de verdad)
  //   3. Caps se guardan en Dexie para la próxima visita (offline-ready)
  useEffect(() => {
    if (!slugParam) return;
    let mounted = true;

    setLoading(true);
    setLoadingCaps(true);
    setNotFound(false);
    setLibro(null);
    setLibroId(null);
    setCapitulos([]);
    setCapituloProximo(null);

    const cargar = async () => {
      let libroData: Libro | null = null;

      // ── Caso 1: UUID directo (links viejos) ──────────────────────────────
      if (esUUID(slugParam)) {
        try {
          libroData = ((await db?.libros?.get(slugParam)) as any) ?? null;
        } catch {}

        if (!libroData) {
          const { data } = await supabase
            .from("libros")
            .select("id, titulo, sinopsis, portada_url, categoria")
            .eq("id", slugParam)
            .eq("visibilidad", "publico")
            .single();
          libroData = data as Libro | null;
          if (libroData) { try { await db?.libros?.put(libroData as any); } catch {} }
        }

        if (!libroData) {
          if (mounted) { setNotFound(true); setLoading(false); setLoadingCaps(false); }
          return;
        }
        const slug = toSlug(libroData.titulo);
        if (slug) router.replace(`/garlia/libros/${slug}`);

      // ── Caso 2: slug normal ──────────────────────────────────────────────
      } else {
        libroData = await resolverLibroPorSlug(slugParam);
        if (!libroData) {
          if (mounted) { setNotFound(true); setLoading(false); setLoadingCaps(false); }
          return;
        }
      }

      if (!mounted) return;

      // Libro resuelto: mostrar portada/sinopsis ya, sin esperar caps
      setLibro(libroData);
      setLibroId(libroData.id);
      setLoading(false); // ← quita el spinner principal aquí, no al final

      // `categoria` en libros es el nombre del grupo (texto libre, no FK).
      // "Libro" → interfaz rica con narradores; cualquier otro valor → simple.
      const grupoNombreLocal = libroData.categoria ?? null;

      // ── Caps: caché de módulo (0ms) ───────────────────────────────────────
      const cached = capsCacheados(libroData.id);
      if (cached) {
        if (!mounted) return;
        setCapitulos(cached);
        setLoadingCaps(false);

        // Personajes si es "Libro"
        if (grupoNombreLocal === "Libro") {
          const ids = new Set<string>();
          for (const c of cached) {
            if (c.narrador_id) ids.add(c.narrador_id);
            (c.personajes_ids ?? []).forEach(id => ids.add(id));
          }
          if (ids.size > 0) {
            Promise.resolve(
              supabase
                .from("personajes")
                .select("id, nombre, img_url")
                .in("id", [...ids])
                .then(({ data: pData }) => {
                  if (pData && mounted) {
                    const map: Record<string, Personaje> = {};
                    for (const p of pData as Personaje[]) map[p.id] = p;
                    setPersonajesMap(map);
                  }
                })
            ).catch(() => {});
          }
        }

        // Próximo siempre se refresca (es tiempo-sensitivo)
        supabase
          .from("capitulos")
          .select("titulo_capitulo, fecha_publicacion")
          .eq("libro_id", libroData.id)
          .eq("visibilidad", "programado")
          .gt("fecha_publicacion", new Date().toISOString())
          .order("fecha_publicacion", { ascending: true })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => { if (mounted) setCapituloProximo(data ?? false); });
        return;
      }

      // ── Caps: Dexie (sin red, ~5ms) ───────────────────────────────────────
      try {
        const dexieCaps = (await db?.capitulos
          ?.where("libro_id")
          .equals(libroData.id)
          .filter((c: any) => c.visibilidad === "publico")
          .sortBy("orden")) as Capitulo[] | undefined;
        if (dexieCaps?.length && mounted) {
          setCapitulos(dexieCaps);
          setLoadingCaps(false); // ya hay algo útil que mostrar
        }
      } catch {}

      // ── Caps: Supabase (fuente de verdad) ────────────────────────────────
      try {
        const ahora = new Date().toISOString();
        const [capsRes, proximoRes] = await Promise.all([
          supabase
            .from("capitulos")
            .select("id, titulo_capitulo, orden, fecha_publicacion, libro_id, narrador_id, personajes_ids, reinos_ids, ciudades_ids")
            .eq("libro_id", libroData.id)
            .eq("visibilidad", "publico")
            .not("titulo_capitulo", "like", "[Ruta]%")
            .order("orden", { ascending: true }),
          supabase
            .from("capitulos")
            .select("titulo_capitulo, fecha_publicacion")
            .eq("libro_id", libroData.id)
            .eq("visibilidad", "programado")
            .gt("fecha_publicacion", ahora)
            .order("fecha_publicacion", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!mounted) return;

        if (capsRes.data) {
          const capsNorm = (capsRes.data as any[]).map((c) => ({
            id: c.id,
            titulo_capitulo: c.titulo_capitulo,
            orden: c.orden,
            fecha_publicacion: c.fecha_publicacion,
            libro_id: c.libro_id,
            narrador_id: c.narrador_id ?? null,
            personajes_ids: c.personajes_ids ?? null,
            reinos_ids: c.reinos_ids ?? null,
            ciudades_ids: c.ciudades_ids ?? null,
          })) as Capitulo[];

          // Actualizar caché de módulo
          _capsCache[libroData.id] = { data: capsNorm, ts: Date.now() };
          setCapitulos(capsNorm);

          // Guardar caps en Dexie para la próxima visita
          try { await db?.capitulos?.bulkPut(capsNorm as any[]); } catch {}

          // ── Personajes, reinos y ciudades solo si el grupo es "Libro" ──────
          if (grupoNombreLocal === "Libro") {
            const personajeIds = new Set<string>();
            const reinoIds     = new Set<string>();
            const ciudadIds    = new Set<string>();
            for (const c of capsNorm) {
              if (c.narrador_id) personajeIds.add(c.narrador_id);
              (c.personajes_ids ?? []).forEach(id => personajeIds.add(id));
              (c.reinos_ids   ?? []).forEach(id => reinoIds.add(id));
              (c.ciudades_ids ?? []).forEach(id => ciudadIds.add(id));
            }

            await Promise.all([
              personajeIds.size > 0
                ? supabase.from("personajes").select("id, nombre, img_url").in("id", [...personajeIds])
                    .then(({ data }) => {
                      if (data && mounted) {
                        const map: Record<string, Personaje> = {};
                        for (const p of data as Personaje[]) map[p.id] = p;
                        setPersonajesMap(map);
                      }
                    })
                : Promise.resolve(),
              reinoIds.size > 0
                ? supabase.from("reinos").select("id, nombre, logo_url").in("id", [...reinoIds])
                    .then(({ data }) => {
                      if (data && mounted) {
                        const map: Record<string, Reino> = {};
                        for (const r of data as Reino[]) map[r.id] = r;
                        setReinosMap(map);
                      }
                    })
                : Promise.resolve(),
              ciudadIds.size > 0
                ? supabase.from("ciudades").select("id, nombre, imagen_url").in("id", [...ciudadIds])
                    .then(({ data }) => {
                      if (data && mounted) {
                        const map: Record<string, Ciudad> = {};
                        for (const c of data as Ciudad[]) map[c.id] = c;
                        setCiudadesMap(map);
                      }
                    })
                : Promise.resolve(),
            ]);
          }
        }

        setCapituloProximo(proximoRes.data ?? false);
      } catch {}

      if (mounted) setLoadingCaps(false);
    };

    cargar().catch(() => {
      if (mounted) { setLoading(false); setLoadingCaps(false); }
    });

    return () => { mounted = false; };
  }, [slugParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Spinner solo mientras no tenemos el libro — los caps tienen su propio estado
  if (loading) return <Loading text="Cargando libro…" />;
  if (notFound || !libro || !libroId) return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center gap-4">
      <p className="text-primary/30 font-black uppercase text-xs tracking-widest italic">Libro no encontrado</p>
      <BackBtn onClick={() => router.push("/garlia/libros")} />
    </div>
  );

  // `categoria` en libros es el nombre del grupo (texto libre).
  // "Libro" → interfaz rica con narradores; cualquier otro valor → simple.
  const esLibro = libro.categoria === "Libro";

  const rutaLector = (primerCapId: string, targetCapId?: string): string => {
    const targetId = targetCapId ?? primerCapId;
    const cap = capitulos.find(c => c.id === targetId) ?? capitulos.find(c => c.id === primerCapId);
    const orden = cap?.orden ?? 1;
    return `/garlia/libros/${slugParam}/leer/${orden}`;
  };

  // ── Fila de personajes de un capítulo ────────────────────────────────────────
  const PersonajesRow = ({ cap }: { cap: Capitulo }) => {
    const ids = [
      ...(cap.narrador_id ? [cap.narrador_id] : []),
      ...(cap.personajes_ids ?? []).filter(id => id !== cap.narrador_id),
    ];
    const personajes = ids.map(id => personajesMap[id]).filter(Boolean);
    if (personajes.length === 0) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap mb-1">
        {personajes.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border ${i === 0 && cap.narrador_id === p.id ? "border-primary/30" : "border-primary/10"}`}>
              {p.img_url
                ? <SmartImage src={p.img_url} alt={p.nombre} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-[7px] font-black text-primary/40">{p.nombre[0]}</div>
              }
            </div>
            <span className={`text-[8px] font-black uppercase tracking-wide ${i === 0 && cap.narrador_id === p.id ? "text-primary/60" : "text-primary/30"}`}>
              {p.nombre}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ── Lista de capítulos ────────────────────────────────────────────────────────
  const ListaCaps = ({ withPersonajes }: { withPersonajes: boolean }) => {
    if (loadingCaps && capitulos.length === 0) return (
      <p className="text-center text-primary/25 font-bold text-[10px] uppercase tracking-widest py-12 italic animate-pulse">
        Cargando capítulos…
      </p>
    );
    if (capitulos.length === 0) return (
      <p className="text-center text-primary/30 font-bold text-xs uppercase tracking-widest py-12 italic">
        Aún no hay capítulos publicados
      </p>
    );
    return (
      <div className="grid gap-3">
        {capitulos.map((cap) => {
          const esRuta = cap.titulo_capitulo?.startsWith("[Ruta]");
          const leido  = leidos.has(cap.id);
          return (
            <button
              key={cap.id}
              onClick={() => { marcarLeido(cap.id); router.push(rutaLector(cap.id)); }}
              className={`w-full flex items-center justify-between p-4 transition-all text-left group rounded-btn shadow-card ${esRuta ? "bg-blue-50/60" : leido ? "bg-primary/[0.03]" : "bg-white-custom"}`}
              style={{
                border: `var(--border-width) solid ${esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}`,
                boxShadow: leido ? "none" : undefined,
                opacity: leido ? 0.55 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = "color-mix(in srgb, var(--primary) 25%, transparent)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = leido ? "0.55" : "1"; e.currentTarget.style.borderColor = esRuta ? "rgb(219 234 254)" : leido ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
            >
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                {withPersonajes && <PersonajesRow cap={cap} />}
                {esRuta && <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">↳ Nodo de ruta</span>}
                <span className={`font-black uppercase text-[12px] group-hover:translate-x-1 transition-transform leading-snug ${leido ? "text-primary/40 line-through decoration-primary/20" : "text-primary"}`}>
                  {cap.orden}. {esRuta ? cap.titulo_capitulo.replace("[Ruta] ", "") : cap.titulo_capitulo}
                </span>
                {cap.fecha_publicacion && (
                  <span className="text-primary/40 font-bold text-[9px] uppercase tracking-wider italic">
                    {new Date(cap.fecha_publicacion).toLocaleDateString("es-ES")}
                  </span>
                )}
              </div>
              <div className="flex-shrink-0 ml-4">
                {leido
                  ? <CheckCircle2 size={14} className="text-primary/25" />
                  : <Play size={14} fill="currentColor" className="text-primary" />
                }
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ── Interfaz SIMPLE: poemario, one-shot, etc. ───────────────────────────────
  if (!esLibro) {
    return (
      <div className="min-h-screen bg-bg-main pb-20 relative">
        <BackBtn onClick={() => router.push("/garlia/libros")} />
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[340px_1fr] gap-12 mt-4 items-start">
          <div
            className="rounded-[var(--radius-card)] overflow-hidden bg-white-custom md:sticky md:top-8"
            style={{ border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)", boxShadow: "var(--shadow-card)" }}
          >
            <SmartImage src={libro.portada_url || "/placeholder-cover.jpg"} alt={libro.titulo} className="w-full h-full" />
          </div>
          <main>
            <h1 className="text-4xl font-black text-primary italic tracking-tighter leading-[0.9] mb-10 uppercase text-center">
              {libro.titulo}
            </h1>
            <ListaCaps withPersonajes={false} />
          </main>
        </div>
      </div>
    );
  }

  // ── Interfaz RICA: grupo "Libro" — sidebar + narradores por cap ─────────────
  return (
    <div className="min-h-screen bg-bg-main pb-20 relative">
      <BackBtn onClick={() => router.push("/garlia/libros")} />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[280px_1fr] gap-12 mt-4 items-start">

        {/* ── Sidebar ── */}
        <aside className="md:sticky md:top-8 flex flex-col gap-6">
          <div style={{ aspectRatio: "3/4", borderRadius: "var(--radius-card)", overflow: "hidden", border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)", boxShadow: "var(--shadow-card)" }}>
            <SmartImage src={libro.portada_url || "/placeholder-cover.jpg"} alt={libro.titulo} className="w-full h-full" />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-primary/40 text-[11px] italic leading-relaxed font-medium">
              {libro.sinopsis}
            </p>

            {capituloProximo && (
              <div className="flex items-start gap-2 mt-1 p-3 rounded-[var(--radius-btn)] bg-primary/3 border border-primary/8">
                <Clock size={10} className="text-primary/30 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/30">Próximamente</span>
                  <span className="text-[10px] font-bold text-primary/50 italic">{capituloProximo.titulo_capitulo}</span>
                  <span className="text-[8px] font-bold text-primary/25 uppercase tracking-wide">
                    {new Date(capituloProximo.fecha_publicacion).toLocaleDateString("es-ES")}
                  </span>
                </div>
              </div>
            )}

            {capitulos.length > 0 && (
              <button
                onClick={() => { marcarLeido(capitulos[0].id); router.push(rutaLector(capitulos[0].id)); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-[var(--radius-btn)] bg-primary text-[var(--btn-text)] font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-opacity"
              >
                <Play size={10} fill="currentColor" />
                {leidos.size > 0 ? "Continuar leyendo" : "Empezar a leer"}
              </button>
            )}

            {/* ── Reinos ── */}
            {Object.keys(reinosMap).length > 0 && (
              <div className="hidden md:flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Map size={9} className="text-primary/30" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/30">Reinos</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(reinosMap).map(reino => (
                    <div key={reino.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-primary/10 bg-primary/3">
                      {reino.logo_url && (
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0">
                          <SmartImage src={reino.logo_url} alt={reino.nombre} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-[9px] font-bold text-primary/60">{reino.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Ciudades ── */}
            {Object.keys(ciudadesMap).length > 0 && (
              <div className="hidden md:flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Building2 size={9} className="text-primary/30" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/30">Ciudades</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(ciudadesMap).map(ciudad => (
                    <div key={ciudad.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-primary/10 bg-primary/3">
                      {ciudad.imagen_url && (
                        <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0">
                          <SmartImage src={ciudad.imagen_url} alt={ciudad.nombre} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-[9px] font-bold text-primary/60">{ciudad.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Capítulos con narradores ── */}
        <main>
          <ListaCaps withPersonajes={true} />
        </main>
      </div>
    </div>
  );
}