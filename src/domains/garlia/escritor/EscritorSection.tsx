"use client";

/**
 * EscritorSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Sección "Escritor / Creador" dentro de /myself/garlia.
 * Se monta vía lazy() en EditorMundoRoot y se navega desde el submenú admin
 * del navbar (ítem "Escritor", BookOpen).
 *
 * Es una capa de lectura semántica sobre los datos de Garlia — pensada para
 * worldbuilders y escritores que quieren consultar el universo sin tocar
 * datos técnicos. Tres subsecciones:
 *
 *   Materiales  — catálogo con rareza, hábitats y yacimientos
 *   Política    — relaciones entre reinos (alianza/comercio/conflicto/tratado)
 *   Objetos     — items con propiedades y composición de materiales
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
  Star,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "@/infra/supabase/supabase";
import { PAGE_TITLE_CLS } from "@/domains/garlia/_shared/types";

// ── Types ─────────────────────────────────────────────────────────────────

interface Material {
  id: string;
  nombre: string;
  categoria?: string | null;
  descripcion?: string | null;
  estado_materia?: string | null;
}

interface Reino {
  id: string;
  nombre: string;
}

interface ItemEscritor {
  id: string;
  nombre: string;
  tipo?: string | null;
  descripcion?: string | null;
  rareza?: string | null;
}

interface ReinoRelacionRaw {
  id: string;
  reino_a_id: string;
  reino_b_id: string;
  tipo: string;
  descripcion?: string | null;
  reino_a: { nombre: string }[] | null;
  reino_b: { nombre: string }[] | null;
}

interface ReinoRelacion {
  id: string;
  reino_a_id: string;
  reino_b_id: string;
  tipo: string;
  descripcion?: string | null;
  reino_a_nombre: string | null;
  reino_b_nombre: string | null;
}

type Subseccion = "materiales" | "politica" | "objetos";

// ── Pill de rareza ────────────────────────────────────────────────────────

function RarezaPill({ rareza }: { rareza?: string | null }) {
  if (!rareza) return null;
  const map: Record<string, { label: string; color: string }> = {
    comun:      { label: "Común",      color: "color-mix(in srgb, var(--primary) 30%, transparent)" },
    poco_comun: { label: "Poco común", color: "hsl(200 60% 55%)" },
    raro:       { label: "Raro",       color: "hsl(260 70% 65%)" },
    epico:      { label: "Épico",      color: "hsl(280 80% 60%)" },
    legendario: { label: "Legendario", color: "hsl(45 90% 55%)" },
  };
  const def = map[rareza.toLowerCase()] ?? { label: rareza, color: "var(--primary)" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
      style={{ background: `color-mix(in srgb, ${def.color} 15%, transparent)`, color: def.color }}
    >
      <Star size={8} />
      {def.label}
    </span>
  );
}

// ── Subsección: Materiales ─────────────────────────────────────────────────

function SubseccionMateriales() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading]       = useState(true);
  const [query, setQuery]           = useState("");
  const [activo, setActivo]         = useState<Material | null>(null);

  useEffect(() => {
    supabase
      .from("materiales")
      .select("id, nombre, categoria, descripcion, estado_materia")
      .order("nombre")
      .then(({ data }) => { setMateriales(data ?? []); setLoading(false); });
  }, []);

  const filtrados = useMemo(() => {
    if (!query.trim()) return materiales;
    const q = query.toLowerCase();
    return materiales.filter(
      (m) => m.nombre.toLowerCase().includes(q) || (m.categoria ?? "").toLowerCase().includes(q),
    );
  }, [materiales, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Lista */}
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          }}
        >
          <Search size={13} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar material…"
            className="flex-1 bg-transparent text-xs font-bold outline-none"
            style={{ color: "var(--primary)" }}
          />
        </div>
        {loading ? (
          <p className="px-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Cargando…</p>
        ) : filtrados.length === 0 ? (
          <p className="px-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Sin resultados.</p>
        ) : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtrados.map((m) => {
              const selected = activo?.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActivo(selected ? null : m)}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    background: selected ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                    color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)",
                  }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">{m.nombre}</p>
                    {m.categoria && (
                      <p className="truncate text-[10px] font-bold capitalize" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                        {m.categoria.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={12} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel detalle */}
      <div>
        {!activo ? (
          <div
            className="flex h-48 items-center justify-center rounded-2xl border"
            style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
          >
            <p className="text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              Seleccioná un material para ver sus detalles
            </p>
          </div>
        ) : (
          <DetalleMaterial material={activo} />
        )}
      </div>
    </div>
  );
}

function DetalleMaterial({ material }: { material: Material }) {
  const [habitats, setHabitats]     = useState<{ nombre: string }[]>([]);
  const [yacimientos, setYacimientos] = useState<{ nombre: string; tipo_yacimiento?: string }[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("material_habitats").select("habitats(nombre)").eq("material_id", material.id).limit(10),
      supabase.from("yacimientos_geologicos_v1").select("nombre, tipo_yacimiento").eq("material_id", material.id).limit(10),
    ]).then(([habRes, yacRes]) => {
      setHabitats((habRes.data ?? []).flatMap((r: any) => r.habitats ? [r.habitats] : []));
      setYacimientos(yacRes.data ?? []);
      setLoading(false);
    });
  }, [material.id]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black" style={{ color: "var(--primary)" }}>{material.nombre}</p>
          {material.categoria && (
            <p className="text-[11px] font-bold capitalize" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
              {material.categoria.replace(/_/g, " ")}{material.estado_materia ? ` · ${material.estado_materia}` : ""}
            </p>
          )}
        </div>
        <Gem size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
      </div>
      {material.descripcion && (
        <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>
          {material.descripcion}
        </p>
      )}
      {loading ? (
        <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Cargando datos…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              <MapPin size={10} /> Hábitats donde se encuentra
            </p>
            {habitats.length === 0 ? (
              <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Sin datos</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {habitats.map((h, i) => (
                  <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                    {h.nombre}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              <Sparkles size={10} /> Yacimientos
            </p>
            {yacimientos.length === 0 ? (
              <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Sin datos</p>
            ) : (
              <div className="flex flex-col gap-1">
                {yacimientos.map((y, i) => (
                  <p key={i} className="text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                    {y.nombre}{y.tipo_yacimiento && <span className="ml-1 opacity-50">({y.tipo_yacimiento})</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subsección: Política ───────────────────────────────────────────────────

function SubseccionPolitica() {
  const [reinos, setReinos]         = useState<Reino[]>([]);
  const [relaciones, setRelaciones] = useState<ReinoRelacion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [noTabla, setNoTabla]       = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("reinos").select("id, nombre").order("nombre"),
      supabase
        .from("reino_relaciones")
        .select("id, reino_a_id, reino_b_id, tipo, descripcion, reino_a:reinos!reino_a_id(nombre), reino_b:reinos!reino_b_id(nombre)")
        .order("tipo"),
    ]).then(([reinosRes, relRes]) => {
      setReinos(reinosRes.data ?? []);
      if (relRes.error?.code === "42P01") {
        setNoTabla(true);
      } else {
        const raw = (relRes.data ?? []) as ReinoRelacionRaw[];
        setRelaciones(raw.map((r) => ({
          id: r.id,
          reino_a_id: r.reino_a_id,
          reino_b_id: r.reino_b_id,
          tipo: r.tipo,
          descripcion: r.descripcion,
          reino_a_nombre: Array.isArray(r.reino_a) ? (r.reino_a[0]?.nombre ?? null) : null,
          reino_b_nombre: Array.isArray(r.reino_b) ? (r.reino_b[0]?.nombre ?? null) : null,
        })));
      }
      setLoading(false);
    });
  }, []);

  const filtradas = useMemo(
    () => filtroTipo === "todos" ? relaciones : relaciones.filter((r) => r.tipo === filtroTipo),
    [relaciones, filtroTipo],
  );

  if (loading) return <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Cargando…</p>;

  if (noTabla) {
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} style={{ color: "hsl(45 90% 55%)", flexShrink: 0 }} />
          <div>
            <p className="text-xs font-black" style={{ color: "var(--primary)" }}>La tabla de relaciones políticas aún no existe</p>
            <p className="mt-1 text-[11px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
              Ejecutá esta migración en el SQL Editor de Supabase:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl p-4 text-[10px] leading-5" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)", color: "color-mix(in srgb, var(--primary) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 10%, transparent)" }}>{`CREATE TABLE reino_relaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reino_a_id uuid NOT NULL REFERENCES reinos(id) ON DELETE CASCADE,
  reino_b_id uuid NOT NULL REFERENCES reinos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('alianza','comercio','conflicto','tratado')),
  descripcion text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_relation CHECK (reino_a_id <> reino_b_id)
);
CREATE INDEX idx_reino_relaciones_a ON reino_relaciones(reino_a_id);
CREATE INDEX idx_reino_relaciones_b ON reino_relaciones(reino_b_id);`}</pre>
          </div>
        </div>
      </div>
    );
  }

  const TIPOS = ["todos", "alianza", "comercio", "conflicto", "tratado"];

  const tipoIcon = (tipo: string) => {
    if (tipo === "alianza")   return <Handshake size={13} className="text-emerald-500" />;
    if (tipo === "comercio")  return <ShoppingCart size={13} className="text-blue-400" />;
    if (tipo === "conflicto") return <Swords size={13} className="text-red-400" />;
    return <Crown size={13} style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }} />;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Reinos */}
      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          Reinos ({reinos.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {reinos.map((r) => (
            <span key={r.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: "color-mix(in srgb, var(--primary) 8%, transparent)", color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>
              <Crown size={9} /> {r.nombre}
            </span>
          ))}
        </div>
      </div>

      {/* Filtro */}
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => {
          const sel = filtroTipo === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFiltroTipo(t)}
              className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest capitalize transition-colors"
              style={{
                background: sel ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                color: sel ? "var(--primary)" : "color-mix(in srgb, var(--primary) 40%, transparent)",
                border: `1px solid ${sel ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--primary) 10%, transparent)"}`,
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Relaciones */}
      {filtradas.length === 0 ? (
        <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          {relaciones.length === 0 ? "Aún no hay relaciones registradas." : "Sin relaciones de este tipo."}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((rel) => (
            <div key={rel.id} className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
              <div className="flex items-center gap-2">
                {tipoIcon(rel.tipo)}
                <span className="text-[10px] font-black uppercase tracking-widest capitalize" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>
                  {rel.tipo}
                </span>
              </div>
              <p className="text-xs font-black" style={{ color: "var(--primary)" }}>
                {rel.reino_a_nombre ?? rel.reino_a_id}
                <span className="mx-1.5 opacity-30">↔</span>
                {rel.reino_b_nombre ?? rel.reino_b_id}
              </p>
              {rel.descripcion && (
                <p className="text-[11px] leading-4" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>{rel.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Subsección: Objetos ────────────────────────────────────────────────────

function SubseccionObjetos() {
  const [items, setItems]     = useState<ItemEscritor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState("");
  const [activo, setActivo]   = useState<ItemEscritor | null>(null);

  useEffect(() => {
    supabase
      .from("items")
      .select("id, nombre, tipo, descripcion, rareza")
      .order("nombre")
      .limit(200)
      .then(({ data }) => { setItems(data ?? []); setLoading(false); });
  }, []);

  const filtrados = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) => it.nombre.toLowerCase().includes(q) || (it.tipo ?? "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{
            borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
            background: "color-mix(in srgb, var(--primary) 4%, transparent)",
          }}
        >
          <Search size={13} style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar objeto…"
            className="flex-1 bg-transparent text-xs font-bold outline-none"
            style={{ color: "var(--primary)" }}
          />
        </div>
        {loading ? (
          <p className="px-1 text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Cargando…</p>
        ) : (
          <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 200px)" }}>
            {filtrados.map((it) => {
              const selected = activo?.id === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setActivo(selected ? null : it)}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                  style={{
                    background: selected ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                    color: selected ? "var(--primary)" : "color-mix(in srgb, var(--primary) 65%, transparent)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-black">{it.nombre}</p>
                      <RarezaPill rareza={it.rareza} />
                    </div>
                    {it.tipo && (
                      <p className="truncate text-[10px] font-bold capitalize" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>{it.tipo}</p>
                    )}
                  </div>
                  <ChevronRight size={12} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div>
        {!activo ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border" style={{ borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
            <p className="text-[11px] font-bold" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              Seleccioná un objeto para ver sus detalles
            </p>
          </div>
        ) : (
          <DetalleItem item={activo} />
        )}
      </div>
    </div>
  );
}

function DetalleItem({ item }: { item: ItemEscritor }) {
  const [materiales, setMateriales]   = useState<{ nombre: string; proporcion?: number }[]>([]);
  const [propiedades, setPropiedades] = useState<{ propiedad: string; valor: unknown }[]>([]);
  const [loading, setLoading]         = useState(true);

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
    <div className="flex flex-col gap-4 rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-black" style={{ color: "var(--primary)" }}>{item.nombre}</p>
            <RarezaPill rareza={item.rareza} />
          </div>
          {item.tipo && (
            <p className="text-[11px] font-bold capitalize" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)" }}>{item.tipo}</p>
          )}
        </div>
        <Package size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
      </div>
      {item.descripcion && (
        <p className="text-[12px] leading-5" style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)" }}>{item.descripcion}</p>
      )}
      {loading ? (
        <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>Cargando…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              <Gem size={10} /> Materiales
            </p>
            {materiales.length === 0 ? (
              <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Sin datos</p>
            ) : (
              <div className="flex flex-col gap-1">
                {materiales.map((m, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                    <span className="text-xs font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>{m.nombre}</span>
                    {m.proporcion != null && <span className="text-[10px] font-black" style={{ color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>{m.proporcion}%</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>
              <Sparkles size={10} /> Propiedades
            </p>
            {propiedades.length === 0 ? (
              <p className="text-[11px]" style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)" }}>Sin datos</p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {propiedades.map((p, i) => (
                  <div key={i} className="rounded-lg px-2.5 py-1.5" style={{ background: "color-mix(in srgb, var(--primary) 5%, transparent)" }}>
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }}>{p.propiedad}</p>
                    <p className="text-xs font-bold" style={{ color: "color-mix(in srgb, var(--primary) 65%, transparent)" }}>{String(p.valor)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

const NAV: { key: Subseccion; label: string; icon: React.ReactNode }[] = [
  { key: "materiales", label: "Materiales",  icon: <Gem size={14} /> },
  { key: "politica",   label: "Política",    icon: <Globe size={14} /> },
  { key: "objetos",    label: "Objetos",     icon: <Package size={14} /> },
];

export function EscritorSection() {
  const [subseccion, setSubseccion] = useState<Subseccion>("materiales");

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-5">
        <p className={PAGE_TITLE_CLS}>Escritor / Creador</p>
        <p className="mt-1 text-[12px]" style={{ color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
          Consultá materiales, relaciones políticas y objetos del mundo sin tocar datos técnicos.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {NAV.map((n) => {
          const active = subseccion === n.key;
          return (
            <button
              key={n.key}
              type="button"
              onClick={() => setSubseccion(n.key)}
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-colors"
              style={{
                background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "color-mix(in srgb, var(--primary) 4%, transparent)",
                color: active ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, transparent)",
                border: `1px solid ${active ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "color-mix(in srgb, var(--primary) 8%, transparent)"}`,
              }}
            >
              {n.icon}
              {n.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {subseccion === "materiales" && <SubseccionMateriales />}
      {subseccion === "politica"   && <SubseccionPolitica />}
      {subseccion === "objetos"    && <SubseccionObjetos />}
    </div>
  );
}

export default EscritorSection;
