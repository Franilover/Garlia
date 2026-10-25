"use client";

/**
 * EscritorSection.tsx  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Sección "Escritor / Creador" dentro de /myself/garlia.
 * Capa de lectura semántica — sin estadísticas ni fórmulas, solo lo que
 * un escritor, diseñador o worldbuilder necesita para crear historias.
 *
 * Nav lateral agrupado en 4 categorías (mismo patrón que WorldbuilderPage):
 *
 *   Mundo    — Reinos · Política · Grupos
 *   Vida     — Criaturas · Flora
 *   Objetos  — Materiales · Objetos
 *   Lore     — Personajes · Libros
 */

import { useEffect, useState, useMemo } from "react";
import {
  Gem,
  Globe,
  Package,
  Search,
  ChevronRight,
  MapPin,
  Crown,
  Sparkles,
  Swords,
  Handshake,
  ShoppingCart,
  AlertTriangle,
  Bug,
  Leaf,
  Users,
  BookOpen,
  Layers,
  UserCircle2,
  Scroll,
  ChevronDown,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";
import { PAGE_TITLE_CLS } from "@/domains/garlia/_shared/types";

// ─── Tipos compartidos ─────────────────────────────────────────────────────

interface Material { id: string; nombre: string; descripcion?: string | null; categoria?: string | null }
interface PropiedadEscritor { propiedad_clave: string; nivel: string; significado: string | null }
interface Reino { id: string; nombre: string }
interface ReinoLore extends Reino {
  cultura?: string | null; politica?: string | null;
  economia?: string | null; geografia?: string | null; historia?: string | null;
}
interface ItemEscritor { id: string; nombre: string }
interface Criatura {
  id: string; nombre: string; imagen_url?: string | null; descripcion?: string | null; sobre?: string | null;
  // Campos del EditorCriatura
  habitat?: string | null; pensamiento?: string | null; alma?: string | null;
  biologia?: string | null; relacion?: string | null; comportamiento?: string | null; magia?: string | null;
  descripcion_dnd?: string | null;
}
interface FloraMin { id: string; nombre: string; imagen_url?: string | null; descripcion?: string | null; notas?: string | null }
interface Personaje { id: string; nombre: string; img_url?: string | null; especie?: string | null; sobre?: string | null; reino?: string | null; caracteristicas?: string | null }
interface Grupo { id: string; nombre: string; tipo: string; subtipo?: string | null; descripcion?: string | null }
interface LibroMin { id: string; titulo: string; created_at: string }
interface LibroPagina { id: string; libro_id: string; orden: number; contenido: string }
interface EraMundo { id: string; nombre: string; descripcion?: string | null; anio_inicio?: number | null; anio_fin?: number | null; color?: string | null }
interface EventoMundo { id: string; titulo: string; descripcion?: string | null; dia_absoluto?: number | null; reinoNombre?: string | null }
interface PizarronLienzoMin { id: string; nombre: string; descripcion?: string | null; updated_at: string }
interface PizarronNodoTexto { id: string; label: string | null }

interface ReinoRelacionRaw { id: string; reino_a_id: string; reino_b_id: string; tipo: string; descripcion?: string | null; reino_a: { nombre: string }[] | null; reino_b: { nombre: string }[] | null }
interface ReinoRelacion { id: string; reino_a_id: string; reino_b_id: string; tipo: string; descripcion?: string | null; reino_a_nombre: string | null; reino_b_nombre: string | null }

type Subseccion = "reinos" | "politica" | "grupos" | "criaturas" | "flora" | "materiales" | "objetos" | "personajes" | "libros" | "linea" | "ideas";
type Grupo_Nav = "Mundo" | "Vida" | "Objetos" | "Lore";

// ─── Helpers visuales ─────────────────────────────────────────────────────

const LABEL_CLS = "text-[10px] font-black uppercase tracking-widest";
const CARD_BORDER = "color-mix(in srgb, var(--primary) 12%, transparent)";
const MUTED = "color-mix(in srgb, var(--primary) 35%, transparent)";
const MUTED_BG = "color-mix(in srgb, var(--primary) 5%, transparent)";

function SinDatos({ texto = "Sin datos" }: { texto?: string }) {
  return <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>{texto}</p>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ background: MUTED_BG, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
      {children}
    </span>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className={`mb-1.5 flex items-center gap-1.5 ${LABEL_CLS}`} style={{ color: MUTED }}>
      {icon}{children}
    </p>
  );
}

/** Buscador reutilizable */
function Buscador({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2"
      style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", background: "color-mix(in srgb, var(--primary) 4%, transparent)" }}>
      <Search size={13} style={{ color: MUTED }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-xs font-bold outline-none" style={{ color: "var(--primary)" }} />
    </div>
  );
}

/** Fila de lista lateral */
function FilaLista({ nombre, activo, onClick }: { nombre: string; activo: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors w-full"
      style={{ background: activo ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activo ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
      <p className="min-w-0 truncate text-xs font-black">{nombre}</p>
      <ChevronRight size={12} style={{ flexShrink: 0 }} />
    </button>
  );
}

/** Panel vacío de detalle */
function PanelVacio({ texto }: { texto: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-2xl border" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
      <p className="text-[11px] font-bold" style={{ color: MUTED }}>{texto}</p>
    </div>
  );
}

/** Encabezado de card de detalle */
function DetalleHeader({ nombre, subtitulo, icon }: { nombre: string; subtitulo?: string | null; icon: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-base font-black" style={{ color: "var(--primary)" }}>{nombre}</p>
        {subtitulo && <p className="text-[11px] font-bold capitalize" style={{ color: MUTED }}>{subtitulo}</p>}
      </div>
      <span style={{ color: "var(--accent)", flexShrink: 0 }}>{icon}</span>
    </div>
  );
}

// ─── Propiedades narrativas (compartido con Materiales) ─────────────────────

const PROPS_ESCRITOR: Record<string, { label: string; descripcion: string }> = {
  dureza:        { label: "Dureza",        descripcion: "Resistencia a ser rayado o deformado" },
  rigidez:       { label: "Rigidez",       descripcion: "Cuánto mantiene su forma bajo presión" },
  flexibilidad:  { label: "Flexibilidad",  descripcion: "Capacidad de doblarse sin romperse" },
  estabilidad:   { label: "Estabilidad",   descripcion: "Resistencia al paso del tiempo y la magia" },
  conductividad: { label: "Conductividad", descripcion: "Transmite calor, energía o magia" },
  transparencia: { label: "Transparencia", descripcion: "Deja pasar la luz o la vista" },
  interaccion:   { label: "Interacción",   descripcion: "Reacciona con otras materias o fuerzas" },
  cohesion:      { label: "Cohesión",      descripcion: "Qué tan unido permanece el material" },
};

function colorDeNivel(nivel: string) {
  const n = nivel.toLowerCase();
  if (n.includes("muy alt") || n.includes("extremo") || n.includes("máximo") || n.includes("maximo"))
    return { bg: "color-mix(in srgb, hsl(45 90% 55%) 15%, transparent)", text: "hsl(45 85% 50%)" };
  if (n.includes("alto") || n.includes("alta") || n.includes("elevad"))
    return { bg: "color-mix(in srgb, hsl(200 70% 55%) 15%, transparent)", text: "hsl(200 65% 50%)" };
  if (n.includes("medio") || n.includes("media") || n.includes("moderado"))
    return { bg: "color-mix(in srgb, var(--primary) 10%, transparent)", text: "color-mix(in srgb, var(--primary) 65%, transparent)" };
  if (n.includes("bajo") || n.includes("baja") || n.includes("poco") || n.includes("mínimo") || n.includes("minimo"))
    return { bg: "color-mix(in srgb, hsl(0 0% 55%) 12%, transparent)", text: "color-mix(in srgb, var(--primary) 40%, transparent)" };
  return { bg: MUTED_BG, text: "color-mix(in srgb, var(--primary) 55%, transparent)" };
}

// ══════════════════════════════════════════════════════════════════════════════
// MUNDO — Reinos
// ══════════════════════════════════════════════════════════════════════════════

function SubseccionReinos() {
  const [reinos, setReinos] = useState<ReinoLore[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<ReinoLore | null>(null);

  // Entidades del reino seleccionado
  const [personajesReino, setPersonajesReino] = useState<{ id: string; nombre: string; img_url?: string | null; especie?: string | null }[]>([]);
  const [criaturasReino, setCriaturasReino] = useState<{ id: string; nombre: string; imagen_url?: string | null }[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(false);

  useEffect(() => {
    supabase
      .from("reinos")
      .select("id, nombre, cultura, politica, economia, geografia, historia")
      .order("nombre")
      .then(({ data }) => { setReinos(data ?? []); setLoading(false); });
  }, []);

  // Cuando cambia el reino activo, carga sus personajes y criaturas
  useEffect(() => {
    if (!activo) { setPersonajesReino([]); setCriaturasReino([]); return; }
    setLoadingEntidades(true);
    Promise.all([
      // personajes con campo reino = nombre del reino (así está guardado)
      supabase.from("personajes").select("id, nombre, img_url, especie")
        .eq("reino", activo.nombre).limit(50).order("nombre"),
      // criaturas via tabla de relación criatura_reinos
      supabase.from("criatura_reinos").select("criaturas(id, nombre, imagen_url)")
        .eq("reino_id", activo.id).limit(30),
    ]).then(([persRes, criRes]) => {
      if (!persRes.error) setPersonajesReino(persRes.data ?? []);
      if (!criRes.error) setCriaturasReino(
        (criRes.data ?? []).flatMap((r: any) => r.criaturas ? [r.criaturas] : [])
      );
      setLoadingEntidades(false);
    });
  }, [activo?.id, activo?.nombre]);

  const filtrados = useMemo(() => {
    if (!query.trim()) return reinos;
    const q = query.toLowerCase();
    return reinos.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [reinos, query]);

  const CAMPOS_LORE: { key: keyof ReinoLore; label: string }[] = [
    { key: "geografia", label: "Geografía" },
    { key: "cultura", label: "Cultura" },
    { key: "politica", label: "Política" },
    { key: "economia", label: "Economía" },
    { key: "historia", label: "Historia" },
  ];

  // Extrae texto plano de un posible string con marcado Lexical/HTML
  function limpiarTexto(s: string | null | undefined): string {
    if (!s) return "";
    // Si es JSON (Lexical), quita todo lo que no sea texto
    try {
      const json = JSON.parse(s);
      if (json?.root?.children) {
        const extraer = (nodo: any): string => {
          if (nodo.type === "text") return nodo.text ?? "";
          if (nodo.children) return nodo.children.map(extraer).join(" ");
          return "";
        };
        return json.root.children.map(extraer).join("\n").trim();
      }
    } catch { /* no es JSON, continúa */ }
    // Quita tags HTML
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar reino…" />
        {loading ? <SinDatos texto="Cargando…" /> : filtrados.length === 0 ? <SinDatos texto="Sin resultados." /> : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtrados.map((r) => (
              <FilaLista key={r.id} nombre={r.nombre} activo={activo?.id === r.id} onClick={() => setActivo(activo?.id === r.id ? null : r)} />
            ))}
          </div>
        )}
      </div>
      <div>
        {!activo ? <PanelVacio texto="Seleccioná un reino para leer su lore" /> : (
          <div className="flex flex-col gap-5 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
            <DetalleHeader nombre={activo.nombre} icon={<Crown size={18} />} />
            {CAMPOS_LORE.map(({ key, label }) => {
              const texto = limpiarTexto(activo[key] as string | null);
              if (!texto) return null;
              return (
                <div key={key}>
                  <SectionLabel icon={null}>{label}</SectionLabel>
                  <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                    {texto.slice(0, 600)}{texto.length > 600 ? "…" : ""}
                  </p>
                </div>
              );
            })}
            {CAMPOS_LORE.every(({ key }) => !activo[key]) && (
              <SinDatos texto="Este reino no tiene lore escrito todavía." />
            )}

            {/* Personajes del reino */}
            <div>
              <SectionLabel icon={<Users size={10} />}>
                Personajes{loadingEntidades ? "" : ` (${personajesReino.length})`}
              </SectionLabel>
              {loadingEntidades ? <SinDatos texto="Cargando…" /> :
               personajesReino.length === 0 ? <SinDatos texto="Sin personajes registrados." /> : (
                <div className="flex flex-wrap gap-1.5">
                  {personajesReino.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: MUTED_BG }}>
                      {p.img_url
                        ? <img src={p.img_url} alt={p.nombre} className="h-4 w-4 rounded-full object-cover" />
                        : <UserCircle2 size={12} style={{ opacity: 0.4 }} />}
                      <span className="text-[10px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                        {p.nombre}
                      </span>
                      {p.especie && (
                        <span className="text-[9px]" style={{ color: MUTED }}>{p.especie}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Criaturas del reino */}
            {(loadingEntidades || criaturasReino.length > 0) && (
              <div>
                <SectionLabel icon={<Bug size={10} />}>
                  Criaturas{loadingEntidades ? "" : ` (${criaturasReino.length})`}
                </SectionLabel>
                {loadingEntidades ? <SinDatos texto="Cargando…" /> : (
                  <div className="flex flex-wrap gap-1.5">
                    {criaturasReino.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: MUTED_BG }}>
                        {c.imagen_url
                          ? <img src={c.imagen_url} alt={c.nombre} className="h-4 w-4 rounded-md object-cover" />
                          : <Bug size={10} style={{ opacity: 0.4 }} />}
                        <span className="text-[10px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                          {c.nombre}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MUNDO — Política (sin cambios respecto a v1, refactorizado internamente)
// ══════════════════════════════════════════════════════════════════════════════

function SubseccionPolitica() {
  const [reinos, setReinos] = useState<Reino[]>([]);
  const [relaciones, setRelaciones] = useState<ReinoRelacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [noTabla, setNoTabla] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("reinos").select("id, nombre").order("nombre"),
      supabase.from("reino_relaciones").select("id, reino_a_id, reino_b_id, tipo, descripcion, reino_a:reinos!reino_a_id(nombre), reino_b:reinos!reino_b_id(nombre)").order("tipo"),
    ]).then(([reinosRes, relRes]) => {
      setReinos(reinosRes.data ?? []);
      if (relRes.error?.code === "42P01") { setNoTabla(true); }
      else {
        const raw = (relRes.data ?? []) as ReinoRelacionRaw[];
        setRelaciones(raw.map((r) => ({
          id: r.id, reino_a_id: r.reino_a_id, reino_b_id: r.reino_b_id,
          tipo: r.tipo, descripcion: r.descripcion,
          reino_a_nombre: Array.isArray(r.reino_a) ? (r.reino_a[0]?.nombre ?? null) : null,
          reino_b_nombre: Array.isArray(r.reino_b) ? (r.reino_b[0]?.nombre ?? null) : null,
        })));
      }
      setLoading(false);
    });
  }, []);

  const filtradas = useMemo(() => filtroTipo === "todos" ? relaciones : relaciones.filter((r) => r.tipo === filtroTipo), [relaciones, filtroTipo]);
  const TIPOS = ["todos", "alianza", "comercio", "conflicto", "tratado"];
  const tipoIcon = (tipo: string) => {
    if (tipo === "alianza") return <Handshake size={13} className="text-emerald-500" />;
    if (tipo === "comercio") return <ShoppingCart size={13} className="text-blue-400" />;
    if (tipo === "conflicto") return <Swords size={13} className="text-red-400" />;
    return <Crown size={13} style={{ color: MUTED }} />;
  };

  if (loading) return <SinDatos texto="Cargando…" />;
  if (noTabla) return (
    <div className="rounded-2xl border p-6" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} style={{ color: "hsl(45 90% 55%)", flexShrink: 0 }} />
        <p className="text-xs font-black" style={{ color: "var(--primary)" }}>La tabla de relaciones políticas aún no existe. Consultá la documentación del proyecto.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className={`mb-2 ${LABEL_CLS}`} style={{ color: MUTED }}>Reinos ({reinos.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {reinos.map((r) => (
            <span key={r.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: MUTED_BG, color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
              <Crown size={9} /> {r.nombre}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => {
          const sel = filtroTipo === t;
          return (
            <button key={t} type="button" onClick={() => setFiltroTipo(t)}
              className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest capitalize transition-colors"
              style={{ background: sel ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: sel ? "var(--primary)" : MUTED, border: `1px solid ${sel ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}` }}>
              {t}
            </button>
          );
        })}
      </div>
      {filtradas.length === 0 ? (
        <SinDatos texto={relaciones.length === 0 ? "Aún no hay relaciones registradas." : "Sin relaciones de este tipo."} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((rel) => (
            <div key={rel.id} className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: CARD_BORDER }}>
              <div className="flex items-center gap-2">{tipoIcon(rel.tipo)}<span className={`${LABEL_CLS} capitalize`} style={{ color: MUTED }}>{rel.tipo}</span></div>
              <p className="text-xs font-black" style={{ color: "var(--primary)" }}>
                {rel.reino_a_nombre ?? rel.reino_a_id}<span className="mx-1.5 opacity-30">↔</span>{rel.reino_b_nombre ?? rel.reino_b_id}
              </p>
              {rel.descripcion && <p className="text-[11px] leading-4" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>{rel.descripcion}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MUNDO — Grupos / Facciones
// ══════════════════════════════════════════════════════════════════════════════

const GRUPO_TIPO_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  personajes: { label: "Personajes", icon: <Users size={12} /> },
  criaturas:  { label: "Criaturas",  icon: <Bug size={12} /> },
  items:      { label: "Objetos",    icon: <Package size={12} /> },
  reinos:     { label: "Reinos",     icon: <Crown size={12} /> },
  libros:     { label: "Libros",     icon: <BookOpen size={12} /> },
  canciones:  { label: "Canciones",  icon: <Sparkles size={12} /> },
};

function SubseccionGrupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<Grupo | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  useEffect(() => {
    supabase.from("grupos_mundo").select("id, nombre, tipo, subtipo, descripcion").order("nombre")
      .then(({ data }) => { setGrupos(data ?? []); setLoading(false); });
  }, []);

  const tipos = useMemo(() => {
    const set = new Set(grupos.map((g) => g.tipo));
    return ["todos", ...Array.from(set).sort()];
  }, [grupos]);

  const filtrados = useMemo(() => {
    let g = grupos;
    if (filtroTipo !== "todos") g = g.filter((x) => x.tipo === filtroTipo);
    if (query.trim()) {
      const q = query.toLowerCase();
      g = g.filter((x) => x.nombre.toLowerCase().includes(q) || (x.subtipo ?? "").toLowerCase().includes(q));
    }
    return g;
  }, [grupos, query, filtroTipo]);

  // Agrupa por tipo
  const porTipo = useMemo(() => {
    const map = new Map<string, Grupo[]>();
    for (const g of filtrados) {
      if (!map.has(g.tipo)) map.set(g.tipo, []);
      map.get(g.tipo)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtrados]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar grupo…" />
        <div className="flex flex-wrap gap-1">
          {tipos.map((t) => {
            const sel = filtroTipo === t;
            return (
              <button key={t} type="button" onClick={() => setFiltroTipo(t)}
                className="rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest capitalize transition-colors"
                style={{ background: sel ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent", color: sel ? "var(--primary)" : MUTED, border: `1px solid ${sel ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}` }}>
                {GRUPO_TIPO_LABELS[t]?.label ?? t}
              </button>
            );
          })}
        </div>
        {loading ? <SinDatos texto="Cargando…" /> : filtrados.length === 0 ? <SinDatos texto="Sin resultados." /> : (
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "calc(100dvh - 220px)" }}>
            {porTipo.map(([tipo, items], gi) => (
              <div key={tipo}>
                <div className="flex items-center gap-2 px-1 py-1.5" style={{ marginTop: gi > 0 ? "8px" : 0 }}>
                  <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1`} style={{ color: MUTED }}>
                    {GRUPO_TIPO_LABELS[tipo]?.icon}{GRUPO_TIPO_LABELS[tipo]?.label ?? tipo}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((g) => (
                    <button key={g.id} type="button" onClick={() => setActivo(activo?.id === g.id ? null : g)}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                      style={{ background: activo?.id === g.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activo?.id === g.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black">{g.nombre}</p>
                        {g.subtipo && <p className="text-[9px] capitalize" style={{ color: MUTED }}>{g.subtipo}</p>}
                      </div>
                      <ChevronRight size={12} style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        {!activo ? <PanelVacio texto="Seleccioná un grupo para ver sus detalles" /> : (
          <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
            <DetalleHeader nombre={activo.nombre} subtitulo={activo.subtipo ?? (GRUPO_TIPO_LABELS[activo.tipo]?.label ?? activo.tipo)} icon={<Layers size={18} />} />
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: MUTED_BG, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                {GRUPO_TIPO_LABELS[activo.tipo]?.icon}
                {GRUPO_TIPO_LABELS[activo.tipo]?.label ?? activo.tipo}
              </span>
            </div>
            {activo.descripcion
              ? <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>{activo.descripcion}</p>
              : <SinDatos texto="Sin descripción." />}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIDA — Criaturas
// ══════════════════════════════════════════════════════════════════════════════

// Campos de lore adicionales del editor que mostramos en sección colapsable
const CRIATURA_CAMPOS_LORE: { key: keyof Criatura; label: string }[] = [
  { key: "biologia",      label: "Biología" },
  { key: "habitat",       label: "Hábitat" },
  { key: "comportamiento",label: "Comportamiento" },
  { key: "pensamiento",   label: "Pensamiento" },
  { key: "alma",          label: "Alma / Esencia" },
  { key: "relacion",      label: "Relación con humanos" },
  { key: "magia",         label: "Magia" },
  { key: "descripcion_dnd", label: "Rasgos D&D" },
];

function DetalleCriatura({ criatura }: { criatura: Criatura }) {
  const [reinos, setReinos] = useState<{ nombre: string }[]>([]);
  const [habitats, setHabitats] = useState<{ nombre: string }[]>([]);
  const [personajesEspecie, setPersonajesEspecie] = useState<{ id: string; nombre: string; img_url?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandidoLore, setExpandidoLore] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      // reinos donde aparece la criatura (tabla de relación)
      supabase.from("criatura_reinos").select("reinos(nombre)").eq("criatura_id", criatura.id).limit(20),
      // habitats si existe tabla directa
      supabase.from("criatura_habitats").select("habitats(nombre)").eq("criatura_id", criatura.id).limit(20),
      // personajes cuya especie coincide con el nombre de la criatura
      supabase.from("personajes").select("id, nombre, img_url").eq("especie", criatura.nombre).limit(30),
    ]).then(([reinosRes, habRes, persRes]) => {
      setReinos((reinosRes.data ?? []).flatMap((r: any) => r.reinos ? [r.reinos] : []));
      if (!habRes.error) setHabitats((habRes.data ?? []).flatMap((r: any) => r.habitats ? [r.habitats] : []));
      if (!persRes.error) setPersonajesEspecie(persRes.data ?? []);
      setLoading(false);
    });
  }, [criatura.id, criatura.nombre]);

  const descripcion = criatura.descripcion || criatura.sobre;
  // Campos de lore extra que tienen contenido
  const camposLoreConDatos = CRIATURA_CAMPOS_LORE.filter(({ key }) => !!(criatura as any)[key]);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
      {/* Header + imagen */}
      <div className="flex items-start gap-4">
        {criatura.imagen_url && (
          <img src={criatura.imagen_url} alt={criatura.nombre}
            className="h-16 w-16 rounded-xl object-cover flex-shrink-0"
            style={{ border: `1px solid ${CARD_BORDER}` }} />
        )}
        <DetalleHeader nombre={criatura.nombre} icon={<Bug size={18} />} />
      </div>

      {/* Descripción principal */}
      {descripcion && (
        <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
          {descripcion}
        </p>
      )}

      {loading ? <SinDatos texto="Cargando…" /> : (
        <>
          {/* Reinos y hábitats */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <SectionLabel icon={<Crown size={10} />}>Presente en reinos</SectionLabel>
              {reinos.length === 0 ? <SinDatos /> : (
                <div className="flex flex-wrap gap-1">{reinos.map((r, i) => <Tag key={i}>{r.nombre}</Tag>)}</div>
              )}
            </div>
            {habitats.length > 0 && (
              <div>
                <SectionLabel icon={<MapPin size={10} />}>Hábitats</SectionLabel>
                <div className="flex flex-wrap gap-1">{habitats.map((h, i) => <Tag key={i}>{h.nombre}</Tag>)}</div>
              </div>
            )}
          </div>

          {/* Personajes de esta especie */}
          {personajesEspecie.length > 0 && (
            <div>
              <SectionLabel icon={<Users size={10} />}>Personajes de esta especie ({personajesEspecie.length})</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {personajesEspecie.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 rounded-full px-2 py-1"
                    style={{ background: MUTED_BG }}>
                    {p.img_url
                      ? <img src={p.img_url} alt={p.nombre} className="h-4 w-4 rounded-full object-cover" />
                      : <UserCircle2 size={12} style={{ opacity: 0.4 }} />}
                    <span className="text-[10px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>{p.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campos de lore adicionales colapsables */}
          {camposLoreConDatos.length > 0 && (
            <div>
              <button type="button" onClick={() => setExpandidoLore((v) => !v)}
                className="flex items-center gap-1.5 mb-2"
                style={{ color: MUTED }}>
                <ChevronDown size={11} style={{ transform: expandidoLore ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                <span className={LABEL_CLS}>{expandidoLore ? "Ocultar" : "Ver"} lore adicional ({camposLoreConDatos.length} campos)</span>
              </button>
              {expandidoLore && (
                <div className="flex flex-col gap-4">
                  {camposLoreConDatos.map(({ key, label }) => (
                    <div key={key}>
                      <SectionLabel icon={null}>{label}</SectionLabel>
                      <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                        {String((criatura as any)[key]).slice(0, 500)}
                        {String((criatura as any)[key]).length > 500 ? "…" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SubseccionCriaturas() {
  const [criaturas, setCriaturas] = useState<Criatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activa, setActiva] = useState<Criatura | null>(null);

  useEffect(() => {
    supabase.from("criaturas")
      .select("id, nombre, imagen_url, descripcion, sobre, habitat, pensamiento, alma, biologia, relacion, comportamiento, magia, descripcion_dnd")
      .order("nombre")
      .then(({ data }) => { setCriaturas(data ?? []); setLoading(false); });
  }, []);

  const filtradas = useMemo(() => {
    if (!query.trim()) return criaturas;
    const q = query.toLowerCase();
    return criaturas.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [criaturas, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar criatura…" />
        {loading ? <SinDatos texto="Cargando…" /> : filtradas.length === 0 ? <SinDatos texto="Sin resultados." /> : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtradas.map((c) => (
              <button key={c.id} type="button" onClick={() => setActiva(activa?.id === c.id ? null : c)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                style={{ background: activa?.id === c.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activa?.id === c.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                {c.imagen_url
                  ? <img src={c.imagen_url} alt={c.nombre} className="h-6 w-6 rounded-md object-cover flex-shrink-0" />
                  : <Bug size={14} style={{ flexShrink: 0, opacity: 0.4 }} />}
                <p className="min-w-0 flex-1 truncate text-xs font-black">{c.nombre}</p>
                <ChevronRight size={12} style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {!activa ? <PanelVacio texto="Seleccioná una criatura para ver sus detalles" /> : (
          <DetalleCriatura criatura={activa} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VIDA — Flora
// ══════════════════════════════════════════════════════════════════════════════

function DetalleFlora({ planta }: { planta: FloraMin }) {
  const [ecosistemas, setEcosistemas] = useState<{ nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from("ecosistema_flora").select("ecosistemas(nombre)").eq("planta_id", planta.id).limit(10)
      .then(({ data, error }) => {
        if (!error) setEcosistemas((data ?? []).flatMap((r: any) => r.ecosistemas ? [r.ecosistemas] : []));
        setLoading(false);
      });
  }, [planta.id]);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-start gap-4">
        {planta.imagen_url && (
          <img src={planta.imagen_url} alt={planta.nombre}
            className="h-16 w-16 rounded-xl object-cover flex-shrink-0"
            style={{ border: `1px solid ${CARD_BORDER}` }} />
        )}
        <DetalleHeader nombre={planta.nombre} icon={<Leaf size={18} />} />
      </div>
      {planta.descripcion && <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>{planta.descripcion}</p>}
      {planta.notas && <p className="text-[11px] leading-5 italic" style={{ color: MUTED }}>{planta.notas}</p>}
      {!loading && ecosistemas.length > 0 && (
        <div>
          <SectionLabel icon={<MapPin size={10} />}>Ecosistemas donde crece</SectionLabel>
          <div className="flex flex-wrap gap-1">{ecosistemas.map((e, i) => <Tag key={i}>{e.nombre}</Tag>)}</div>
        </div>
      )}
    </div>
  );
}

function SubseccionFlora() {
  const [flora, setFlora] = useState<FloraMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activa, setActiva] = useState<FloraMin | null>(null);

  useEffect(() => {
    supabase.from("organismos").select("id, nombre, imagen_url, descripcion, notas")
      .eq("tipo_organismo", "vegetal").order("nombre")
      .then(({ data }) => { setFlora(data ?? []); setLoading(false); });
  }, []);

  const filtrada = useMemo(() => {
    if (!query.trim()) return flora;
    const q = query.toLowerCase();
    return flora.filter((f) => f.nombre.toLowerCase().includes(q));
  }, [flora, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar planta…" />
        {loading ? <SinDatos texto="Cargando…" /> : filtrada.length === 0 ? <SinDatos texto="Sin resultados." /> : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtrada.map((f) => (
              <button key={f.id} type="button" onClick={() => setActiva(activa?.id === f.id ? null : f)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                style={{ background: activa?.id === f.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activa?.id === f.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                {f.imagen_url
                  ? <img src={f.imagen_url} alt={f.nombre} className="h-6 w-6 rounded-md object-cover flex-shrink-0" />
                  : <Leaf size={14} style={{ flexShrink: 0, opacity: 0.4 }} />}
                <p className="min-w-0 flex-1 truncate text-xs font-black">{f.nombre}</p>
                <ChevronRight size={12} style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {!activa ? <PanelVacio texto="Seleccioná una planta para ver sus detalles" /> : (
          <DetalleFlora planta={activa} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJETOS — Materiales (igual a v1, extraído limpio)
// ══════════════════════════════════════════════════════════════════════════════

function DetalleMaterial({ material }: { material: Material }) {
  const [habitats, setHabitats] = useState<{ nombre: string }[]>([]);
  const [yacimientos, setYacimientos] = useState<{ nombre: string; tipo_yacimiento?: string }[]>([]);
  const [propiedades, setPropiedades] = useState<PropiedadEscritor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPropiedades([]);
    Promise.all([
      supabase.from("material_habitats").select("habitats(nombre)").eq("material_id", material.id).limit(10),
      supabase.from("yacimientos_geologicos_v1").select("nombre, tipo_yacimiento").eq("material_id", material.id).limit(10),
      (supabase as any).from("v_frontend_escritor_propiedades_interpretadas")
        .select("propiedad_clave, interpretacion_humana, valor_mostrable")
        .eq("entidad_tipo", "material").eq("entidad_id", material.id).eq("valor_mostrable", true),
    ]).then(([habRes, yacRes, propRes]) => {
      setHabitats((habRes.data ?? []).flatMap((r: any) => r.habitats ? [r.habitats] : []));
      setYacimientos(yacRes.data ?? []);
      const props: PropiedadEscritor[] = (propRes.data ?? [])
        .filter((r: any) => r.interpretacion_humana?.nivel)
        .map((r: any) => ({ propiedad_clave: r.propiedad_clave, nivel: r.interpretacion_humana.nivel, significado: r.interpretacion_humana.significado ?? null }));
      setPropiedades(props);
      setLoading(false);
    });
  }, [material.id]);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
      <DetalleHeader nombre={material.nombre} subtitulo={material.categoria?.replace(/_/g, " ")} icon={<Gem size={18} />} />
      {material.descripcion && <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>{material.descripcion}</p>}
      {loading ? <SinDatos texto="Cargando…" /> : (
        <>
          {propiedades.length > 0 && (
            <div>
              <SectionLabel icon={<Sparkles size={10} />}>Propiedades</SectionLabel>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {propiedades.map((p) => {
                  const meta = PROPS_ESCRITOR[p.propiedad_clave];
                  const { bg, text } = colorDeNivel(p.nivel);
                  return (
                    <div key={p.propiedad_clave} className="flex flex-col gap-1 rounded-xl px-3 py-2.5" style={{ background: bg }}>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: text }}>{meta?.label ?? p.propiedad_clave.replace(/_/g, " ")}</span>
                      <p className="text-[11px] font-black" style={{ color: text }}>{p.nivel}</p>
                      {p.significado && <p className="text-[10px] leading-4" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>{p.significado}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <SectionLabel icon={<MapPin size={10} />}>Hábitats</SectionLabel>
              {habitats.length === 0 ? <SinDatos /> : <div className="flex flex-wrap gap-1">{habitats.map((h, i) => <Tag key={i}>{h.nombre}</Tag>)}</div>}
            </div>
            {yacimientos.length > 0 && (
              <div>
                <SectionLabel icon={<Sparkles size={10} />}>Yacimientos</SectionLabel>
                <div className="flex flex-col gap-1">
                  {yacimientos.map((y, i) => (
                    <p key={i} className="text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                      {y.nombre}{y.tipo_yacimiento && <span className="ml-1 opacity-50">({y.tipo_yacimiento})</span>}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SubseccionMateriales() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<Material | null>(null);

  useEffect(() => {
    supabase.from("materiales").select("id, nombre, descripcion, categoria").order("nombre")
      .then(({ data }) => { setMateriales(data ?? []); setLoading(false); });
  }, []);

  const filtrados = useMemo(() => {
    if (!query.trim()) return materiales;
    const q = query.toLowerCase();
    return materiales.filter((m) => m.nombre.toLowerCase().includes(q) || (m.categoria ?? "").toLowerCase().includes(q));
  }, [materiales, query]);

  const grupos = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of filtrados) {
      const cat = m.categoria ?? "sin categoría";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "sin categoría") return 1; if (b === "sin categoría") return -1;
      return a.localeCompare(b);
    });
  }, [filtrados]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar material…" />
        {loading ? <SinDatos texto="Cargando…" /> : filtrados.length === 0 ? <SinDatos texto="Sin resultados." /> : (
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {grupos.map(([categoria, items], gi) => (
              <div key={categoria}>
                <div className="flex items-center gap-2 px-1 py-1.5" style={{ marginTop: gi > 0 ? "8px" : 0 }}>
                  <span className="text-[9px] font-black uppercase tracking-widest capitalize whitespace-nowrap" style={{ color: MUTED }}>{categoria.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((m) => <FilaLista key={m.id} nombre={m.nombre} activo={activo?.id === m.id} onClick={() => setActivo(activo?.id === m.id ? null : m)} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        {!activo ? <PanelVacio texto="Seleccioná un material para ver sus detalles" /> : <DetalleMaterial material={activo} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OBJETOS — Items
// ══════════════════════════════════════════════════════════════════════════════

function DetalleItem({ item }: { item: ItemEscritor }) {
  const [materiales, setMateriales] = useState<{ nombre: string; proporcion?: number }[]>([]);
  const [propiedades, setPropiedades] = useState<{ propiedad: string; valor: unknown }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("item_materiales").select("proporcion, materiales(nombre)").eq("item_id", item.id).limit(10),
      supabase.from("item_propiedades").select("propiedad, valor").eq("item_id", item.id).limit(20),
    ]).then(([matRes, propRes]) => {
      setMateriales((matRes.data ?? []).flatMap((r: any) => r.materiales ? [{ nombre: r.materiales.nombre, proporcion: r.proporcion }] : []));
      setPropiedades(propRes.data ?? []);
      setLoading(false);
    });
  }, [item.id]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
      <DetalleHeader nombre={item.nombre} icon={<Package size={18} />} />
      {loading ? <SinDatos texto="Cargando…" /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionLabel icon={<Gem size={10} />}>Materiales</SectionLabel>
            {materiales.length === 0 ? <SinDatos /> : (
              <div className="flex flex-col gap-1">
                {materiales.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: MUTED_BG }}>
                    <span className="text-xs font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>{m.nombre}</span>
                    {m.proporcion != null && <span className="text-[10px] font-black" style={{ color: MUTED }}>{m.proporcion}%</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {propiedades.length > 0 && (
            <div>
              <SectionLabel icon={<Sparkles size={10} />}>Propiedades</SectionLabel>
              <div className="grid grid-cols-2 gap-1">
                {propiedades.map((p, i) => (
                  <div key={i} className="rounded-lg px-2.5 py-1.5" style={{ background: MUTED_BG }}>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: MUTED }}>{p.propiedad}</p>
                    <p className="text-xs font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>{String(p.valor)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubseccionObjetos() {
  const [items, setItems] = useState<ItemEscritor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<ItemEscritor | null>(null);

  useEffect(() => {
    supabase.from("items").select("id, nombre").order("nombre").limit(200)
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  const filtrados = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.nombre.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar objeto…" />
        {loading ? <SinDatos texto="Cargando…" /> : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtrados.map((it) => <FilaLista key={it.id} nombre={it.nombre} activo={activo?.id === it.id} onClick={() => setActivo(activo?.id === it.id ? null : it)} />)}
          </div>
        )}
      </div>
      <div>
        {!activo ? <PanelVacio texto="Seleccioná un objeto para ver sus detalles" /> : <DetalleItem item={activo} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LORE — Personajes
// ══════════════════════════════════════════════════════════════════════════════

function SubseccionPersonajes() {
  const [personajes, setPersonajes] = useState<Personaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<Personaje | null>(null);
  const [filtroReino, setFiltroReino] = useState<string>("todos");

  useEffect(() => {
    supabase.from("personajes").select("id, nombre, img_url, especie, sobre, reino, caracteristicas").order("nombre").limit(300)
      .then(({ data }) => { setPersonajes(data ?? []); setLoading(false); });
  }, []);

  const reinos = useMemo(() => {
    const set = new Set(personajes.map((p) => p.reino).filter(Boolean) as string[]);
    return ["todos", ...Array.from(set).sort()];
  }, [personajes]);

  const filtrados = useMemo(() => {
    let p = personajes;
    if (filtroReino !== "todos") p = p.filter((x) => x.reino === filtroReino);
    if (query.trim()) {
      const q = query.toLowerCase();
      p = p.filter((x) => x.nombre.toLowerCase().includes(q) || (x.especie ?? "").toLowerCase().includes(q));
    }
    return p;
  }, [personajes, query, filtroReino]);

  // Agrupa por reino
  const porReino = useMemo(() => {
    const map = new Map<string, Personaje[]>();
    for (const p of filtrados) {
      const reino = p.reino ?? "Sin reino";
      if (!map.has(reino)) map.set(reino, []);
      map.get(reino)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Sin reino") return 1; if (b === "Sin reino") return -1;
      return a.localeCompare(b);
    });
  }, [filtrados]);

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar personaje…" />
        {/* Filtro por reino */}
        <select value={filtroReino} onChange={(e) => setFiltroReino(e.target.value)}
          className="rounded-lg border px-2.5 py-1.5 text-[10px] font-black bg-transparent outline-none"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
          {reinos.map((r) => <option key={r} value={r} style={{ background: "var(--bg-main)" }}>{r === "todos" ? "Todos los reinos" : r}</option>)}
        </select>
        {loading ? <SinDatos texto="Cargando…" /> : filtrados.length === 0 ? <SinDatos texto="Sin resultados." /> : (
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "calc(100dvh - 230px)" }}>
            {porReino.map(([reino, items], gi) => (
              <div key={reino}>
                <div className="flex items-center gap-2 px-1 py-1.5" style={{ marginTop: gi > 0 ? "8px" : 0 }}>
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest whitespace-nowrap" style={{ color: MUTED }}>
                    <Crown size={8} />{reino}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
                </div>
                <div className="flex flex-col gap-0.5">
                  {items.map((p) => (
                    <button key={p.id} type="button" onClick={() => setActivo(activo?.id === p.id ? null : p)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                      style={{ background: activo?.id === p.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activo?.id === p.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                      {p.img_url
                        ? <img src={p.img_url} alt={p.nombre} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                        : <UserCircle2 size={16} style={{ flexShrink: 0, opacity: 0.4 }} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black">{p.nombre}</p>
                        {p.especie && <p className="text-[9px] capitalize" style={{ color: MUTED }}>{p.especie}</p>}
                      </div>
                      <ChevronRight size={12} style={{ flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        {!activo ? <PanelVacio texto="Seleccioná un personaje para ver sus detalles" /> : (
          <div className="flex flex-col gap-5 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
            <div className="flex items-start gap-4">
              {activo.img_url
                ? <img src={activo.img_url} alt={activo.nombre} className="h-16 w-16 rounded-xl object-cover flex-shrink-0" style={{ border: `1px solid ${CARD_BORDER}` }} />
                : <div className="flex h-16 w-16 items-center justify-center rounded-xl flex-shrink-0" style={{ background: MUTED_BG }}><UserCircle2 size={28} style={{ opacity: 0.3 }} /></div>}
              <div>
                <p className="text-base font-black" style={{ color: "var(--primary)" }}>{activo.nombre}</p>
                {activo.especie && <p className="text-[11px] font-bold capitalize" style={{ color: MUTED }}>{activo.especie}</p>}
                {activo.reino && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: MUTED_BG, color: MUTED }}>
                    <Crown size={8} />{activo.reino}
                  </span>
                )}
              </div>
            </div>
            {activo.sobre
              ? <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>{activo.sobre}</p>
              : <SinDatos texto="Sin descripción." />}
            {activo.caracteristicas && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid color-mix(in srgb, var(--primary) 8%, transparent)` }}>
                <SectionLabel icon={<Sparkles size={10} />}>Características de especie</SectionLabel>
                <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
                  {activo.caracteristicas.slice(0, 400)}{activo.caracteristicas.length > 400 ? "…" : ""}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LORE — Libros de conocimiento
// ══════════════════════════════════════════════════════════════════════════════

function VisorLibro({ libro }: { libro: LibroMin }) {
  const [paginas, setPaginas] = useState<LibroPagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagActual, setPagActual] = useState(0);

  useEffect(() => {
    setLoading(true);
    setPagActual(0);
    supabase.from("libros_conocimiento_paginas").select("id, libro_id, orden, contenido")
      .eq("libro_id", libro.id).order("orden")
      .then(({ data }) => { setPaginas(data ?? []); setLoading(false); });
  }, [libro.id]);

  if (loading) return <div className="flex h-48 items-center justify-center rounded-2xl border" style={{ borderColor: CARD_BORDER }}><SinDatos texto="Cargando páginas…" /></div>;
  if (paginas.length === 0) return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
      <DetalleHeader nombre={libro.titulo} icon={<BookOpen size={18} />} />
      <SinDatos texto="Este libro no tiene páginas escritas todavía." />
    </div>
  );

  // Dos páginas por "apertura" (simula libro físico en desktop)
  const pagIzq = paginas[pagActual];
  const pagDer = paginas[pagActual + 1];
  const totalAperturas = Math.ceil(paginas.length / 2);
  const aperturaActual = Math.floor(pagActual / 2);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ borderColor: CARD_BORDER }}>
      <div className="flex items-center justify-between gap-3">
        <DetalleHeader nombre={libro.titulo} subtitulo={`${paginas.length} página${paginas.length !== 1 ? "s" : ""}`} icon={<BookOpen size={18} />} />
      </div>

      {/* Apertura del libro */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[pagIzq, pagDer].filter(Boolean).map((pag, i) => (
          <div key={pag!.id} className="rounded-xl p-4 min-h-[200px]"
            style={{ background: i === 0 ? "color-mix(in srgb, var(--primary) 3%, transparent)" : MUTED_BG, border: `1px solid ${CARD_BORDER}` }}>
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-right" style={{ color: MUTED }}>
              Pág. {pag!.orden}
            </p>
            <p className="text-[12px] leading-6 whitespace-pre-wrap" style={{ color: "color-mix(in srgb, var(--primary) 70%, transparent)", fontFamily: "serif" }}>
              {pag!.contenido}
            </p>
          </div>
        ))}
      </div>

      {/* Navegación */}
      {totalAperturas > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button type="button" disabled={aperturaActual === 0} onClick={() => setPagActual(Math.max(0, pagActual - 2))}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-opacity disabled:opacity-30"
            style={{ background: MUTED_BG, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
            ← Anterior
          </button>
          <p className="text-[10px] font-bold" style={{ color: MUTED }}>
            {aperturaActual + 1} / {totalAperturas}
          </p>
          <button type="button" disabled={aperturaActual >= totalAperturas - 1} onClick={() => setPagActual(Math.min(paginas.length - 1, pagActual + 2))}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-opacity disabled:opacity-30"
            style={{ background: MUTED_BG, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function SubseccionLibros() {
  const [libros, setLibros] = useState<LibroMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activo, setActivo] = useState<LibroMin | null>(null);

  useEffect(() => {
    supabase.from("libros_conocimiento").select("id, titulo, created_at").order("titulo")
      .then(({ data }) => { setLibros(data ?? []); setLoading(false); });
  }, []);

  const filtrados = useMemo(() => {
    if (!query.trim()) return libros;
    const q = query.toLowerCase();
    return libros.filter((l) => l.titulo.toLowerCase().includes(q));
  }, [libros, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <Buscador value={query} onChange={setQuery} placeholder="Buscar libro…" />
        {loading ? <SinDatos texto="Cargando…" /> : filtrados.length === 0 ? <SinDatos texto="Sin libros." /> : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtrados.map((l) => (
              <button key={l.id} type="button" onClick={() => setActivo(activo?.id === l.id ? null : l)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                style={{ background: activo?.id === l.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activo?.id === l.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                <Scroll size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                <p className="min-w-0 flex-1 truncate text-xs font-black">{l.titulo}</p>
                <ChevronRight size={12} style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {!activo ? <PanelVacio texto="Seleccioná un libro para leerlo" /> : <VisorLibro libro={activo} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LORE — Línea de tiempo (eras + eventos)
// ══════════════════════════════════════════════════════════════════════════════

function SubseccionLineaTiempo() {
  const [eras, setEras] = useState<EraMundo[]>([]);
  const [eventos, setEventos] = useState<EventoMundo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEra, setFiltroEra] = useState<string>("todas");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      (supabase as any).from("eras_mundo")
        .select("id, nombre, descripcion, anio_inicio, anio_fin, color")
        .order("anio_inicio", { ascending: true, nullsFirst: false }),
      supabase.from("eventos_mundo")
        .select("id, titulo, descripcion, dia_absoluto, reino_id, reinos!reino_id(nombre)")
        .order("dia_absoluto", { ascending: true, nullsFirst: false }),
    ]).then(([erasRes, evRes]) => {
      setEras(erasRes.data ?? []);
      const evData = (evRes.data ?? []).map((e: any) => {
        const reino = Array.isArray(e.reinos) ? e.reinos[0] : e.reinos;
        return {
          id: e.id,
          titulo: e.titulo ?? "Sin título",
          descripcion: e.descripcion ?? null,
          dia_absoluto: e.dia_absoluto ?? null,
          reinoNombre: reino?.nombre ?? null,
        };
      });
      setEventos(evData);
      setLoading(false);
    });
  }, []);

  // Eventos filtrados por era seleccionada (por rango de día absoluto)
  const eraActiva = eras.find((e) => e.id === filtroEra) ?? null;
  const eventosFiltrados = useMemo(() => {
    if (!eraActiva || eraActiva.anio_inicio == null) return eventos;
    return eventos.filter((ev) => {
      if (ev.dia_absoluto == null) return false;
      const ini = eraActiva.anio_inicio ?? -Infinity;
      const fin = eraActiva.anio_fin ?? Infinity;
      return ev.dia_absoluto >= ini && ev.dia_absoluto <= fin;
    });
  }, [eventos, eraActiva]);

  if (loading) return <SinDatos texto="Cargando…" />;

  return (
    <div className="flex flex-col gap-6">
      {/* Eras — banda cromática horizontal */}
      {eras.length > 0 && (
        <div>
          <SectionLabel icon={<Sparkles size={10} />}>Eras del mundo</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {eras.map((era) => {
              const sel = filtroEra === era.id;
              const accent = era.color ?? "color-mix(in srgb, var(--accent) 60%, transparent)";
              return (
                <button key={era.id} type="button" onClick={() => setFiltroEra(sel ? "todas" : era.id)}
                  className="flex items-start gap-3 rounded-xl p-3 text-left transition-colors"
                  style={{ background: sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "color-mix(in srgb, var(--primary) 3%, transparent)", border: `1px solid ${sel ? "color-mix(in srgb, var(--primary) 18%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}` }}>
                  {/* Franja de color */}
                  <div className="mt-0.5 h-full w-1 rounded-full flex-shrink-0" style={{ minHeight: "2rem", background: accent, opacity: sel ? 1 : 0.5 }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black" style={{ color: sel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 75%, transparent)" }}>{era.nombre}</p>
                      {(era.anio_inicio != null || era.anio_fin != null) && (
                        <span className="text-[9px] font-bold flex-shrink-0" style={{ color: MUTED }}>
                          {era.anio_inicio ?? "?"} → {era.anio_fin ?? "presente"}
                        </span>
                      )}
                    </div>
                    {era.descripcion && (
                      <p className="mt-0.5 text-[11px] leading-4" style={{ color: MUTED }}>{era.descripcion.slice(0, 120)}{era.descripcion.length > 120 ? "…" : ""}</p>
                    )}
                  </div>
                </button>
              );
            })}
            {filtroEra !== "todas" && (
              <button type="button" onClick={() => setFiltroEra("todas")}
                className="text-[10px] font-black uppercase tracking-widest self-start px-2 py-1"
                style={{ color: MUTED }}>
                ← Ver todos los eventos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Eventos — lista cronológica */}
      <div>
        <SectionLabel icon={<ChevronRight size={10} />}>
          Eventos{eraActiva ? ` · ${eraActiva.nombre}` : ""} ({eventosFiltrados.length})
        </SectionLabel>
        {eventosFiltrados.length === 0 ? (
          <SinDatos texto={eraActiva ? "No hay eventos registrados para esta era." : "Aún no hay eventos en la línea de tiempo."} />
        ) : (
          <div className="relative flex flex-col">
            {/* Línea vertical */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }} />
            <div className="flex flex-col gap-0">
              {eventosFiltrados.map((ev, i) => (
                <div key={ev.id} className="flex items-start gap-3 pl-1 py-2.5">
                  {/* Punto */}
                  <div className="mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 z-10"
                    style={{ background: "color-mix(in srgb, var(--accent) 70%, transparent)", border: "2px solid color-mix(in srgb, var(--bg-main) 90%, transparent)", outline: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)" }} />
                  <div className="min-w-0 flex-1 rounded-xl p-3"
                    style={{ background: i % 2 === 0 ? "color-mix(in srgb, var(--primary) 3%, transparent)" : "transparent", border: "1px solid color-mix(in srgb, var(--primary) 7%, transparent)" }}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-xs font-black" style={{ color: "var(--primary)" }}>{ev.titulo}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {ev.reinoNombre && <Tag>{ev.reinoNombre}</Tag>}
                        {ev.dia_absoluto != null && (
                          <span className="text-[9px] font-bold" style={{ color: MUTED }}>Día {ev.dia_absoluto}</span>
                        )}
                      </div>
                    </div>
                    {ev.descripcion && (
                      <p className="mt-1 text-[11px] leading-4" style={{ color: "color-mix(in srgb, var(--primary) 50%, transparent)" }}>{ev.descripcion.slice(0, 200)}{ev.descripcion.length > 200 ? "…" : ""}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LORE — Ideas / Pizarrón (lienzos + nodos de texto)
// ══════════════════════════════════════════════════════════════════════════════

function SubseccionIdeas() {
  const [lienzos, setLienzos] = useState<PizarronLienzoMin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activo, setActivo] = useState<PizarronLienzoMin | null>(null);
  const [notas, setNotas] = useState<PizarronNodoTexto[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);

  useEffect(() => {
    supabase.from("pizarron_lienzos").select("id, nombre, descripcion, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data }) => { setLienzos(data ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!activo) { setNotas([]); return; }
    setLoadingNotas(true);
    // Traemos todos los nodos del lienzo — mostramos texto y entidades
    supabase.from("pizarron_nodos")
      .select("id, tipo_entidad, label, datos_extra")
      .eq("lienzo_id", activo.id)
      .then(({ data }) => {
        // Priorizamos nodos de texto y cualquiera con label
        const con_texto = (data ?? []).filter((n: any) => n.label?.trim());
        setNotas(con_texto.map((n: any) => ({ id: n.id, label: n.label as string })));
        setLoadingNotas(false);
      });
  }, [activo?.id]);

  const formatFecha = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Lista de lienzos */}
      <div className="flex flex-col gap-2">
        <p className={`${LABEL_CLS} px-1`} style={{ color: MUTED }}>Lienzos ({lienzos.length})</p>
        {loading ? <SinDatos texto="Cargando…" /> : lienzos.length === 0 ? <SinDatos texto="No hay lienzos creados." /> : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {lienzos.map((l) => (
              <button key={l.id} type="button" onClick={() => setActivo(activo?.id === l.id ? null : l)}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors"
                style={{ background: activo?.id === l.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: activo?.id === l.id ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
                <p className="truncate text-xs font-black">{l.nombre}</p>
                <p className="text-[9px]" style={{ color: MUTED }}>{formatFecha(l.updated_at)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notas del lienzo activo */}
      <div>
        {!activo ? (
          <PanelVacio texto="Seleccioná un lienzo para ver sus ideas y notas" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black" style={{ color: "var(--primary)" }}>{activo.nombre}</p>
                {activo.descripcion && <p className="text-[11px]" style={{ color: MUTED }}>{activo.descripcion}</p>}
              </div>
              <Sparkles size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
            </div>

            {loadingNotas ? (
              <SinDatos texto="Cargando notas…" />
            ) : notas.length === 0 ? (
              <SinDatos texto="Este lienzo no tiene nodos con texto todavía." />
            ) : (
              <div className="columns-1 sm:columns-2 gap-3">
                {notas.map((nota) => (
                  <div key={nota.id} className="break-inside-avoid mb-3 rounded-xl p-4"
                    style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)" }}>
                    <p className="text-[12px] leading-5 whitespace-pre-wrap"
                      style={{ color: "color-mix(in srgb, var(--primary) 75%, transparent)" }}>
                      {nota.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAV  — Sidebar izquierdo agrupado (igual patrón que WorldbuilderPage)
// ══════════════════════════════════════════════════════════════════════════════

type NavItem = { key: Subseccion; label: string; icon: React.ReactNode };
type NavGroup = { group: Grupo_Nav; icon: React.ReactNode; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Mundo", icon: <Globe size={12} />,
    items: [
      { key: "reinos",   label: "Reinos",   icon: <Crown size={14} /> },
      { key: "politica", label: "Política",  icon: <Swords size={14} /> },
      { key: "grupos",   label: "Grupos",   icon: <Layers size={14} /> },
    ],
  },
  {
    group: "Vida", icon: <Leaf size={12} />,
    items: [
      { key: "criaturas", label: "Criaturas", icon: <Bug size={14} /> },
      { key: "flora",     label: "Flora",     icon: <Leaf size={14} /> },
    ],
  },
  {
    group: "Objetos", icon: <Package size={12} />,
    items: [
      { key: "materiales", label: "Materiales", icon: <Gem size={14} /> },
      { key: "objetos",    label: "Objetos",    icon: <Package size={14} /> },
    ],
  },
  {
    group: "Lore", icon: <BookOpen size={12} />,
    items: [
      { key: "personajes", label: "Personajes",     icon: <Users size={14} /> },
      { key: "libros",     label: "Libros",          icon: <BookOpen size={14} /> },
      { key: "linea",      label: "Línea de tiempo", icon: <ChevronRight size={14} /> },
      { key: "ideas",      label: "Ideas",           icon: <Sparkles size={14} /> },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

export function EscritorSection() {
  const [subseccion, setSubseccion] = useState<Subseccion>("reinos");
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<Grupo_Nav>>(new Set(["Mundo"]));

  const toggleGrupo = (g: Grupo_Nav) =>
    setGruposExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });

  const handleSelect = (key: Subseccion, group: Grupo_Nav) => {
    setSubseccion(key);
    setGruposExpandidos((prev) => new Set([...prev, group]));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="grid flex-1 min-h-0 lg:grid-cols-[140px_minmax(0,1fr)]">

        {/* ── Sidebar nav ─────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col border-r overflow-y-auto py-4 px-2"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", scrollbarWidth: "none" }}>
          <p className={`mb-4 px-2 ${LABEL_CLS}`} style={{ color: MUTED }}>Escritor</p>
          <nav className="flex flex-col gap-1">
            {NAV_GROUPS.map((grp) => {
              const expandido = gruposExpandidos.has(grp.group);
              const grupoActivo = grp.items.some((i) => i.key === subseccion);
              return (
                <div key={grp.group}>
                  <button type="button" onClick={() => toggleGrupo(grp.group)}
                    className="flex w-full items-center justify-between gap-1.5 rounded-lg px-2 py-2 text-left transition-colors"
                    style={{ color: grupoActivo ? "var(--primary)" : MUTED }}>
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                      {grp.icon}{grp.group}
                    </span>
                    <ChevronDown size={10} style={{ transform: expandido ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                  </button>
                  {expandido && (
                    <div className="mb-1 pl-1">
                      {grp.items.map((item) => {
                        const sel = item.key === subseccion;
                        return (
                          <button key={item.key} type="button" onClick={() => handleSelect(item.key, grp.group)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                            style={{ background: sel ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent", color: sel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 50%, transparent)" }}>
                            {item.icon}
                            <span className={`text-xs ${sel ? "font-black" : "font-medium"}`}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Mobile: nav horizontal scrollable ───────────────────────────── */}
        <div className="lg:hidden flex overflow-x-auto gap-1 px-4 pt-4 pb-2 border-b"
          style={{ borderColor: "color-mix(in srgb, var(--primary) 8%, transparent)", scrollbarWidth: "none" }}>
          {NAV_GROUPS.flatMap((grp) => grp.items).map((item) => {
            const sel = item.key === subseccion;
            return (
              <button key={item.key} type="button" onClick={() => setSubseccion(item.key)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black transition-colors flex-shrink-0"
                style={{ background: sel ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "color-mix(in srgb, var(--primary) 4%, transparent)", color: sel ? "var(--primary)" : MUTED, border: `1px solid ${sel ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}` }}>
                {item.icon}{item.label}
              </button>
            );
          })}
        </div>

        {/* ── Contenido principal ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-y-auto px-4 py-6 sm:px-6">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <p className={PAGE_TITLE_CLS}>
              {NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === subseccion)?.label ?? "Escritor"}
            </p>
          </div>

          {subseccion === "reinos"     && <SubseccionReinos />}
          {subseccion === "politica"   && <SubseccionPolitica />}
          {subseccion === "grupos"     && <SubseccionGrupos />}
          {subseccion === "criaturas"  && <SubseccionCriaturas />}
          {subseccion === "flora"      && <SubseccionFlora />}
          {subseccion === "materiales" && <SubseccionMateriales />}
          {subseccion === "objetos"    && <SubseccionObjetos />}
          {subseccion === "personajes" && <SubseccionPersonajes />}
          {subseccion === "libros"     && <SubseccionLibros />}
          {subseccion === "linea"      && <SubseccionLineaTiempo />}
          {subseccion === "ideas"      && <SubseccionIdeas />}
        </main>
      </div>
    </div>
  );
}

export default EscritorSection;
