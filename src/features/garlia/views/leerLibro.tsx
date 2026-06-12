"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/api/client/supabase";
import { ChevronLeft, List, ChevronRight } from "lucide-react";
import { Btn } from "@/components/ui";
import { db } from "@/lib/api/client/db";
import { motion, AnimatePresence } from "framer-motion";

import { CapituloLista, CapituloScrollItem } from "@/features/editorGarlia/components/editorCapitulos/snippets/type";
import { esUUID } from "@/lib/utils/slugify";
import { CapituloScrollBlock, ToastPortal } from "@/features/garlia/components/CapituloScrollBlock";
import { LectorSkeleton, ReadingProgressBar, Vignette, CapituloHeader, FinCapituloSeparador } from "@/features/garlia/components/LectorUI";

/* ─────────────────────────────────────────────
   Tipos
   ───────────────────────────────────────────── */
interface NarradorInfo {
  id: string;
  nombre: string;
  img_url?: string | null;
}

/* ─────────────────────────────────────────────
   localStorage helpers
   ───────────────────────────────────────────── */
function cargarLeidos(libroId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`leidos:${libroId}`);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { }
  return new Set();
}

function guardarLeido(libroId: string, capId: string): void {
  try {
    const set = cargarLeidos(libroId);
    set.add(capId);
    localStorage.setItem(`leidos:${libroId}`, JSON.stringify([...set]));
  } catch { }
}

/* ─────────────────────────────────────────────
   Barra de progreso VERTICAL — rail sobre borde derecho
   ───────────────────────────────────────────── */
function BarraProgresoVertical({ capId }: { capId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!capId) return;
    const container = document.getElementById("lector-scroll-container");
    if (!container) return;

    const calc = () => {
      const el = document.getElementById(`cap-${capId}`);
      if (!el) return;
      const top    = el.offsetTop;
      const bottom = top + el.offsetHeight;
      const total  = bottom - top;
      const scrolled = container.scrollTop + container.clientHeight - top;
      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)));
    };
    calc();
    container.addEventListener("scroll", calc, { passive: true });
    return () => container.removeEventListener("scroll", calc);
  }, [capId]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <motion.div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, originY: 0,
          background: "linear-gradient(to bottom, var(--accent, var(--primary)), color-mix(in srgb, var(--primary) 60%, transparent))",
          borderRadius: 99,
        }}
        animate={{ height: `${progress}%` }}
        transition={{ duration: 0.18, ease: "linear" }}
      />
      <motion.div
        style={{
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--primary)", opacity: 0.6, marginLeft: -1,
        }}
        animate={{ top: `${progress}%` }}
        transition={{ duration: 0.18, ease: "linear" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Hook: marca capítulos como leídos al scrollear
   ───────────────────────────────────────────── */
function useScrollLeidos(libroId: string, capId: string) {
  useEffect(() => {
    if (!libroId || !capId) return;
    let obs: IntersectionObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const montar = () => {
      const el = document.getElementById(`cap-${capId}`);
      if (!el) { timer = setTimeout(montar, 120); return; }
      obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) guardarLeido(libroId, capId); },
        { threshold: 0.4 }
      );
      obs.observe(el);
    };
    timer = setTimeout(montar, 80);
    return () => { if (timer) clearTimeout(timer); obs?.disconnect(); };
  }, [libroId, capId]);
}

/* ─────────────────────────────────────────────
   Personajes del capítulo activo
   ───────────────────────────────────────────── */
function PersonajesPanel({ ids, border }: { ids: string[]; border: string }) {
  const [personajes, setPersonajes] = useState<{ id: string; nombre: string; img_url?: string | null }[]>([]);

  useEffect(() => {
    if (ids.length === 0) return;
    supabase
      .from("personajes").select("id, nombre, img_url").in("id", ids)
      .then(({ data }) => { if (data) setPersonajes(data); });
  }, [ids.join(",")]);

  if (personajes.length === 0) return null;

  return (
    <div style={{ paddingTop: 14, borderTop: border }}>
      <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.25, marginBottom: 10 }}>
        Personajes
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {personajes.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {p.img_url ? (
              <img src={p.img_url} alt={p.nombre} style={{ width: 24, height: 24, borderRadius: "var(--radius-btn, 4px)", objectFit: "cover", border, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: "var(--radius-btn, 4px)", border, flexShrink: 0, background: "color-mix(in srgb, var(--primary) 8%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--primary)", opacity: 0.4 }}>
                {p.nombre.charAt(0)}
              </div>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", opacity: 0.65, lineHeight: 1.2 }}>
              {p.nombre}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Reinos y ciudades del capítulo activo
   ───────────────────────────────────────────── */
function LugaresPanel({ reinosIds, ciudadesIds, border }: { reinosIds: string[]; ciudadesIds: string[]; border: string }) {
  const [reinos,   setReinos]   = useState<{ id: string; nombre: string }[]>([]);
  const [ciudades, setCiudades] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    if (reinosIds.length === 0) { setReinos([]); return; }
    supabase.from("reinos").select("id, nombre").in("id", reinosIds)
      .then(({ data }) => { if (data) setReinos(data); });
  }, [reinosIds.join(",")]);

  useEffect(() => {
    if (ciudadesIds.length === 0) { setCiudades([]); return; }
    supabase.from("ciudades").select("id, nombre").in("id", ciudadesIds)
      .then(({ data }) => { if (data) setCiudades(data); });
  }, [ciudadesIds.join(",")]);

  if (reinos.length === 0 && ciudades.length === 0) return null;

  return (
    <div style={{ padding: "14px 16px 0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {reinos.length > 0 && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {reinos.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, color: "var(--primary)", opacity: 0.2, lineHeight: 1 }}>♛</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontStyle: "italic", color: "var(--primary)", opacity: 0.55, letterSpacing: "-0.01em", textTransform: "uppercase", lineHeight: 1.2 }}>
                  {r.nombre}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ciudades.length > 0 && (
        <div>
          <p style={{ fontSize: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--primary)", opacity: 0.25, marginBottom: 7 }}>
            {ciudades.length === 1 ? "Ciudad" : "Ciudades"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {ciudades.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, color: "var(--primary)", opacity: 0.2, lineHeight: 1 }}>◈</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", opacity: 0.45, textTransform: "uppercase", lineHeight: 1.2 }}>
                  {c.nombre}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Panel lateral izquierdo
   ───────────────────────────────────────────── */
function PanelLateral({
  libroTitulo,
  capActual,
  capitulos,
  capIdActual,
  loading,
  esExtra,
  onVolver,
  onSelectCap,
}: {
  libroTitulo?: string;
  capActual: CapituloScrollItem | null;
  capitulos: CapituloScrollItem[];
  capIdActual: string;
  loading?: boolean;
  esExtra?: boolean;
  onVolver: () => void;
  onSelectCap?: (capId: string) => void;
}) {
  const border = "1px solid color-mix(in srgb, var(--primary) 10%, transparent)";
  const narrador = (capActual as any)?._narrador as NarradorInfo | null | undefined;
  const personajesIds = Array.from(new Set(capActual?.personajes_ids ?? []));

  return (
    <div style={{
      width: "clamp(220px, 22vw, 300px)", flexShrink: 0, height: "100vh",
      borderRight: border, display: "flex", flexDirection: "column",
      overflow: "hidden", position: "relative", background: "var(--bg-main)",
    }}>

      {/* ── Hero: imagen del narrador con degradado ── */}
      <div style={{ position: "relative", flexShrink: 0, height: 200, overflow: "hidden" }}>
        {narrador?.img_url ? (
          <img
            src={narrador.img_url}
            alt={narrador.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "color-mix(in srgb, var(--primary) 6%, var(--bg-main))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {narrador?.nombre && (
              <span style={{ fontSize: 56, fontWeight: 900, color: "var(--primary)", opacity: 0.06, fontStyle: "italic", textTransform: "uppercase" }}>
                {narrador.nombre.charAt(0)}
              </span>
            )}
          </div>
        )}

        {/* Degradado sobre la imagen */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg-main) 0%, transparent) 0%, color-mix(in srgb, var(--bg-main) 55%, transparent) 55%, var(--bg-main) 100%)",
        }} />

        {/* Botón volver — arriba izquierda */}
        <button onClick={onVolver} style={{
          position: "absolute", top: 12, left: 14,
          display: "flex", alignItems: "center", gap: 5,
          border: "none", background: "none", cursor: "pointer",
          color: "var(--primary)", fontSize: 9,
          fontFamily: "var(--font-mono)", letterSpacing: "0.16em",
          textTransform: "uppercase", opacity: 0.55, transition: "opacity 0.15s",
          textShadow: "0 1px 6px var(--bg-main)",
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
        >
          ← Volver
        </button>
      </div>

      {/* ── Reinos y ciudades del capítulo ── */}
      {!loading && capActual && !esExtra && (
        <LugaresPanel
          reinosIds={(capActual as any).reinos_ids ?? []}
          ciudadesIds={(capActual as any).ciudades_ids ?? []}
          border={border}
        />
      )}

      {/* ── Personajes del capítulo ── */}
      {!loading && !esExtra && personajesIds.length > 0 && (
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <PersonajesPanel ids={personajesIds} border={border} />
        </div>
      )}

      <div style={{ margin: "10px 16px 4px", height: 1, background: border.replace("1px solid ", ""), flexShrink: 0 }} />

      {/* ── Índice scrolleable ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 8px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px" }}>
            {[80, 60, 100, 50, 75].map((w, i) => (
              <div key={i} style={{ height: 9, width: `${w}%`, borderRadius: 4, background: "color-mix(in srgb, var(--primary) 7%, transparent)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {capitulos.map(cap => {
              const esActual = cap.id === capIdActual;
              return (
                <button key={cap.id} onClick={() => onSelectCap?.(cap.id)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "6px 10px", borderRadius: 6, border: "none",
                  background: esActual ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                  cursor: "pointer", transition: "background 0.12s",
                  color: esActual ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                  fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.4,
                }}
                  onMouseEnter={e => { if (!esActual) e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 6%, transparent)"; }}
                  onMouseLeave={e => { if (!esActual) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 8, opacity: 0.35, marginRight: 6, fontVariantNumeric: "tabular-nums" }}>
                    {String(cap.orden).padStart(2, "0")}
                  </span>
                  {cap.titulo_capitulo}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra de progreso vertical */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, background: "color-mix(in srgb, var(--primary) 6%, transparent)", borderRadius: 99 }}>
        <BarraProgresoVertical capId={capIdActual} />
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────
   Componente principal del lector
   ───────────────────────────────────────────── */
export default function Lector() {
  const params = useParams();
  const slugParam  = params?.id    as string;
  // ordenParam es el número de capítulo en la URL: /leer/1, /leer/2, etc.
  // También puede llegar un UUID legacy que se canonicaliza.
  const ordenParam = params?.capId as string;
  const router = useRouter();

  const [id,             setId]             = useState<string>("");
  const [capId,          setCapId]          = useState<string>("");
  const [capitulos,      setCapitulos]      = useState<CapituloScrollItem[]>([]);
  const [listaCapitulos, setListaCapitulos] = useState<CapituloLista[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [esExtra,        setEsExtra]        = useState(false);  // poemario / sin grupo
  const [activeCapTitle, setActiveCapTitle] = useState<string | null>(null);
  const [showSidebar,    setShowSidebar]    = useState(false);  // móvil: drawer lateral
  const hasScrolled = useRef(false);

  // ── Flujo único: resolver libro + cargar caps ──────────────────────────────
  useEffect(() => {
    if (!slugParam || !ordenParam) return;
    setLoading(true);
    hasScrolled.current = false;

    const getDexieTable = async () => {
      try {
        if (!db || !(db as any).capitulos) return null;
        return (db as any).capitulos;
      } catch { return null; }
    };

    const cachearEnDexie = async (rows: any[]) => {
      const table = await getDexieTable();
      if (!table || rows.length === 0) return;
      try {
        const ids      = rows.map(r => r.id);
        const existing = await table.bulkGet(ids) as (any | undefined)[];
        const merged   = rows.map((row: any, i: number) => {
          const prev = existing[i];
          return { ...prev, ...row, contenido: row.contenido ?? prev?.contenido ?? "", status: "synced" };
        });
        await table.bulkPut(merged);
      } catch (e) { console.warn("[Dexie] Error cacheando caps:", e); }
    };

    /**
     * Dado un ordenParam (número como string, o UUID legacy),
     * devuelve el capId activo y canonicaliza la URL si hace falta.
     */
    const resolverCapActivo = (
      caps: any[],
      libroId: string,
      esExtraLocal: boolean,
      canonicalizarURL: boolean,
    ): string => {
      let capActivo: any | null = null;

      if (esUUID(ordenParam)) {
        // URL legacy con UUID → encontrar el cap por ID
        capActivo = caps.find(c => c.id === ordenParam) ?? caps[0] ?? null;
      } else {
        // URL numérica normal → buscar por número de orden
        const n = parseInt(ordenParam, 10);
        capActivo = (!isNaN(n) ? caps.find(c => c.orden === n) : null) ?? caps[0] ?? null;
      }

      if (!capActivo) return caps[0]?.id ?? "";

      // Canonicalizar URL: siempre debe ser /leer/{orden}
      if (canonicalizarURL) {
        const nuevaURL = `/garlia/libros/${slugParam}/leer/${capActivo.orden}`;
        router.replace(nuevaURL, { scroll: false });
      }

      setActiveCapTitle(`${capActivo.orden}. ${capActivo.titulo_capitulo}`);
      return capActivo.id;
    };

    const aplicarCaps = (
      capsValidas: any[],
      libroId: string,
      esExtraLocal: boolean,
      canonicalizarURL: boolean,
    ) => {
      // ── Filtro de seguridad en cliente ────────────────────────────────────
      // Descarta caps que no sean públicos o que tengan fecha futura,
      // independientemente de la fuente (Supabase, Dexie, caché).
      const ahora = new Date();
      const caps = capsValidas.filter(c => {
        const vis = c.visibilidad ?? "publico"; // fallback para datos Dexie sin campo
        if (vis === "oculto") return false;
        if (vis === "publico") return true;
        if (vis === "programado") {
          if (!c.fecha_publicacion) return false;
          return new Date(c.fecha_publicacion) <= ahora;
        }
        return false; // cualquier otro valor desconocido → ocultar
      });

      const lista: CapituloLista[] = caps.map(c => ({
        id: c.id, orden: c.orden,
        titulo_capitulo: c.titulo_capitulo,
        fecha_publicacion: c.fecha_publicacion,
      }));
      const capIdActivo = resolverCapActivo(caps, libroId, esExtraLocal, canonicalizarURL);

      setId(libroId);
      setListaCapitulos(lista);
      setCapitulos(caps as unknown as CapituloScrollItem[]);
      setCapId(capIdActivo);
    };

    const run = async () => {
      const hoy = new Date().toISOString();

      // ── 1. Resolver UUID del libro ────────────────────────────────────────
      let libroId: string;
      let esExtraLocal = false;

      if (esUUID(slugParam)) {
        const { data } = await supabase
          .from("libros").select("id, titulo, categoria").eq("id", slugParam).single();
        if (!data) { setError("Libro no encontrado"); return; }
        libroId = data.id;
        // Detectar tipo de grupo: poemario u otros sin navegación lineal
        if (data.categoria) {
          const { data: grupo } = await supabase.from("grupos_mundo").select("nombre").eq("id", data.categoria).single();
          if (grupo?.nombre?.toLowerCase().includes("poemario") || grupo?.nombre?.toLowerCase().includes("extra")) {
            esExtraLocal = true; setEsExtra(true);
          }
        }
      } else {
        let encontrado: { id: string; titulo: string; categoria?: string } | null = null;
        try {
          if (db?.libros) {
            const dexieLibros = await db.libros.toArray() as any[];
            encontrado = dexieLibros.find((l: any) => {
              try { return new URL("http://x/" + l.titulo).pathname.slice(1) === slugParam || l.titulo?.toLowerCase().replace(/\s+/g, "-") === slugParam; } catch { return false; }
            }) ?? dexieLibros.find((l: any) => l.titulo?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === slugParam) ?? null;
          }
        } catch {}
        if (!encontrado) {
          const { data: todos } = await supabase.from("libros").select("id, titulo, categoria");
          if (!todos) { setError("Libro no encontrado"); return; }
          try { await db?.libros?.bulkPut(todos as any[]); } catch {}
          const { toSlug } = await import("@/lib/utils/slugify");
          encontrado = todos.find(l => toSlug(l.titulo) === slugParam) ?? null;
        }
        if (!encontrado) { setError("Libro no encontrado"); return; }
        libroId = encontrado.id;
        // Detectar tipo de grupo
        if (encontrado.categoria) {
          const { data: grupo } = await supabase.from("grupos_mundo").select("nombre").eq("id", encontrado.categoria).single();
          if (grupo?.nombre?.toLowerCase().includes("poemario") || grupo?.nombre?.toLowerCase().includes("extra")) {
            esExtraLocal = true; setEsExtra(true);
          }
        }
      }

      // ── 2. Dexie-first: render instantáneo si hay caché ───────────────────
      let yaRenderizoDesdeCache = false;
      try {
        const table = await getDexieTable();
        if (table) {
          const cached: any[] = (await table.where("libro_id").equals(libroId).toArray()) as any[];
          const capsCached = cached.filter(c => c.contenido && !c.deleted);
          if (capsCached.length > 0) {
            // La URL no se canonicaliza desde caché (sin RTT) — se hará al llegar Supabase
            aplicarCaps(capsCached, libroId, esExtraLocal, false);
            setLoading(false);
            yaRenderizoDesdeCache = true;
          }
        }
      } catch {}

      // ── 3. Fetch desde Supabase (siempre, para datos frescos) ─────────────
      type CapRaw = {
        id: string; orden: number; titulo_capitulo: string; contenido: string;
        fecha_publicacion: string; personajes_ids: string[];
        reinos_ids: string[] | null; ciudades_ids: string[] | null;
        libros: { titulo: string } | { titulo: string }[] | null;
        narrador: any;
      };

      const { data: contenidos, error: capsError } = await supabase
        .from("capitulos")
        .select(`id, orden, titulo_capitulo, contenido, fecha_publicacion, visibilidad, personajes_ids, reinos_ids, ciudades_ids, libros(titulo), narrador:personajes!narrador_id(id, nombre, img_url)`)
        .eq("libro_id", libroId)
        .or(`visibilidad.eq.publico,and(visibilidad.eq.programado,fecha_publicacion.lte.${hoy.split("T")[0]})`)
        .not("titulo_capitulo", "like", "[Ruta]%")
        .order("orden", { ascending: true });

      if (capsError) {
        if (!yaRenderizoDesdeCache) setError(capsError.message);
        return;
      }

      const normOne = <T,>(v: T | T[] | null | undefined): T | null => {
        if (!v) return null;
        return Array.isArray(v) ? (v[0] ?? null) : v;
      };

      const rawList = (contenidos as unknown as CapRaw[]) ?? [];
      const capsValidas = rawList.map(c => ({
        id: c.id, orden: c.orden, titulo_capitulo: c.titulo_capitulo,
        contenido: c.contenido, fecha_publicacion: c.fecha_publicacion,
        personajes_ids: c.personajes_ids, reinos_ids: c.reinos_ids ?? [],
        ciudades_ids: c.ciudades_ids ?? [],
        libro_id: libroId,
        libros: normOne(c.libros) ?? undefined,
        _narrador: normOne(c.narrador),
      }));

      cachearEnDexie(capsValidas);

      // canonicalizarURL=true: convierte UUID o número incorrecto → /leer/{orden}
      aplicarCaps(capsValidas, libroId, esExtraLocal, true);
    };

    run()
      .catch(async (err) => {
        console.error("Error crítico en Lector:", err);
        try {
          const table = await getDexieTable();
          if (table) {
            const todos = (await table.toArray()) as any[];
            const cached = todos.filter(c => !c.deleted && c.libro_id === id && c.contenido);
            if (cached.length > 0) { aplicarCaps(cached, id, esExtra, false); return; }
          }
        } catch {}
        setError("Error al abrir el pergamino");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, ordenParam]);

  // ── Navegación entre capítulos ─────────────────────────────────────────────
  /** Navegar a un cap por su ID (desde selector de índice, botones, etc.) */
  const handleNavigate = useCallback((targetCapId: string) => {
    const cap = capitulos.find(c => c.id === targetCapId);
    if (!cap) return;
    const url = `/garlia/libros/${slugParam}/leer/${cap.orden}`;
    const el = document.getElementById(`cap-${targetCapId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      router.replace(url, { scroll: false });
    } else {
      router.push(url);
    }
    setCapId(targetCapId);
    setActiveCapTitle(`${cap.orden}. ${cap.titulo_capitulo}`);
  }, [capitulos, slugParam, router]);

  const capActual = capitulos.find(c => c.id === capId) ?? null;
  const capAnterior = capActual ? capitulos.find(c => c.orden === capActual.orden - 1) ?? null : null;
  const capSiguiente = capActual ? capitulos.find(c => c.orden === capActual.orden + 1) ?? null : null;
  const libroTitulo = capitulos[0]?.libros?.titulo;
  const personajesIds = Array.from(new Set(capActual?.personajes_ids ?? []));

  useScrollLeidos(id, capId);

  // Scroll inicial al cap activo
  useEffect(() => {
    if (loading || hasScrolled.current || !capId) return;
    hasScrolled.current = true;
    setTimeout(() => {
      document.getElementById(`cap-${capId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }, [loading, capId]);

  // Observar qué capítulo es visible para actualizar el título
  useEffect(() => {
    if (!capId) return;
    const container = document.getElementById("lector-scroll-container");
    const el = document.getElementById(`cap-${capId}`);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const cap = capitulos.find(c => c.id === capId);
          if (cap) setActiveCapTitle(`${cap.orden}. ${cap.titulo_capitulo}`);
        }
      },
      { root: container, threshold: 0.15, rootMargin: "-10% 0px -60% 0px" }
    );
    const t = setTimeout(() => { obs.observe(el); }, 300);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, [capId, capitulos]);

  if (!loading && (error || capitulos.length === 0)) return (
    <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-primary p-6 text-center">
      <h2 className="font-black uppercase text-xl mb-4 italic tracking-tighter">
        {error || "No hay capítulos disponibles"}
      </h2>
      <Btn variant="outline" size="sm" onClick={() => router.push(`/garlia/libros/${slugParam}`)}>
        Volver al índice
      </Btn>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-main)" }}>

      {/* ── Barra superior fija en móvil ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-12 border-b border-primary/8 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--bg-main) 92%, transparent)" }}>
        <button onClick={() => router.push(`/garlia/libros/${slugParam}`)}
          className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors font-black text-[9px] uppercase tracking-widest">
          <ChevronLeft size={14} /> Volver
        </button>
        {libroTitulo && (
          <span className="text-primary/50 font-black text-[9px] uppercase tracking-wider italic truncate max-w-[45%] text-center">
            {libroTitulo}
          </span>
        )}
        <button onClick={() => setShowSidebar(true)}
          className="flex items-center gap-1.5 text-primary/40 hover:text-primary transition-colors font-black text-[9px] uppercase tracking-widest">
          <List size={13} /> Índice
        </button>
      </div>

      {/* ── Drawer lateral en móvil ── */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setShowSidebar(false)}
              className="md:hidden fixed inset-0 z-50"
              style={{ background: "color-mix(in srgb, var(--primary) 30%, transparent)", backdropFilter: "blur(2px)" }}
            />
            <motion.div
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-50"
              style={{ width: "clamp(260px, 80vw, 340px)", background: "var(--bg-main)", borderRight: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}
            >
              <PanelLateral
                libroTitulo={libroTitulo}
                capActual={capActual}
                capitulos={capitulos}
                capIdActual={capId}
                loading={loading}
                esExtra={esExtra}
                onVolver={() => router.push(`/garlia/libros/${slugParam}`)}
                onSelectCap={(id) => { handleNavigate(id); setShowSidebar(false); }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Panel lateral — solo desktop ── */}
      <div className="hidden md:flex">
        <PanelLateral
          libroTitulo={libroTitulo}
          capActual={capActual}
          capitulos={capitulos}
          capIdActual={capId}
          loading={loading}
          esExtra={esExtra}
          onVolver={() => router.push(`/garlia/libros/${slugParam}`)}
          onSelectCap={handleNavigate}
        />
      </div>

      {/* ── Columna derecha: texto scrolleable ── */}
      <div id="lector-scroll-container"
        style={{ flex: 1, height: "100vh", overflowY: "auto", position: "relative" }}
        className="bg-bg-main text-primary-dark">
        <Vignette />

        {/* Indicador de capítulo activo */}
        {activeCapTitle && (
          <div className="hidden md:flex sticky top-0 z-30 items-center gap-3 px-8 py-2.5 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--bg-main) 90%, transparent), transparent)" }}>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/25 italic truncate max-w-sm">
              {activeCapTitle}
            </span>
          </div>
        )}

        {/* Padding top en móvil */}
        <div className="md:hidden h-12" />

        {/* Capítulo activo — uno solo a la vez */}
        {!loading && capActual && (
          <CapituloScrollBlock
            key={capActual.id}
            cap={capActual}
            onNavigate={handleNavigate}
            esExtra={esExtra}
            haySegSiguiente={!!capSiguiente}
          />
        )}

        {/* Footer de navegación */}
        {!loading && capActual && (
          <footer className="max-w-2xl mx-auto px-6 pb-20 pt-4 flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 w-full max-w-xs">
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }} />
              {!capSiguiente && (
                <span className="font-serif text-base" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>— Fin —</span>
              )}
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary) 20%, transparent))" }} />
            </div>

            {esExtra ? (
              /* Poemario / extra: solo botón volver al índice, sin anterior/siguiente */
              <button onClick={() => router.push(`/garlia/libros/${slugParam}`)}
                className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all">
                <List size={16} /> Índice
              </button>
            ) : (
              /* Novela / libro: navegación anterior + índice + siguiente */
              <div className="flex items-center justify-between w-full gap-4">
                {capAnterior ? (
                  <button onClick={() => router.push(`/garlia/libros/${slugParam}/leer/${capAnterior.orden}`)}
                    className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all">
                    <ChevronLeft size={14} /> Cap. {capAnterior.orden}
                  </button>
                ) : <div />}

                <button onClick={() => router.push(`/garlia/libros/${slugParam}`)}
                  className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all">
                  <List size={16} /> Índice
                </button>

                {capSiguiente ? (
                  <button onClick={() => router.push(`/garlia/libros/${slugParam}/leer/${capSiguiente.orden}`)}
                    className="flex items-center gap-2 text-primary/40 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-all">
                    Cap. {capSiguiente.orden} <ChevronRight size={14} />
                  </button>
                ) : <div />}
              </div>
            )}
          </footer>
        )}
      </div>

      {/* Toast portal — una sola instancia */}
      <ToastPortal />
    </div>
  );
}