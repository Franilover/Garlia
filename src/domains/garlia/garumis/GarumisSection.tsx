"use client";

/**
 * GarumisSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Tablas Supabase usadas:
 *   garumis, garumi_originales, garumi_evoluciones, garumi_rasgos
 */

import { Leaf, GitBranch, Plus, Sparkles, ChevronLeft, Loader2, GitMerge } from "lucide-react";
import React, { useEffect, useState } from "react";

import { supabase } from "@/infra/supabase/supabase";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Original {
  id: string;
  nombre: string;
  descripcion: string | null;
  rasgo_comun: string | null;
  estado: string;
}

interface Rasgo {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
}

interface Garumi {
  id: string;
  nombre: string;
  nombre_cientifico: string | null;
  original_id: string | null;
  etapa_evolutiva: string | null;
  descripcion: string | null;
  estado: string;
}

interface Evolucion {
  id: string;
  garumi_origen_id: string | null;
  garumi_destino_id: string | null;
  original_id: string | null;
  tipo_evolucion: string | null;
  descripcion: string | null;
  origen_nombre?: string | null;
  destino_nombre?: string | null;
  original_nombre?: string | null;
}

type SubseccionKey = "catalogo" | "arbol" | "originales";

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useOriginales() {
  const [data, setData] = useState<Original[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from("garumi_originales")
      .select("id, nombre, descripcion, rasgo_comun, estado")
      .order("nombre")
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Original[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  return { originales: data, loading };
}

function useRasgosPorOriginal(originalId: string | null) {
  const [data, setData] = useState<Rasgo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originalId) { setData([]); return; }
    let cancelado = false;
    setLoading(true);
    void supabase
      .from("garumi_rasgos")
      .select("id, nombre, descripcion, tipo")
      .eq("original_id", originalId)
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Rasgo[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [originalId]);

  return { rasgos: data, loading };
}

function useGarumis(originalId?: string | null) {
  const [data, setData] = useState<Garumi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    let query = supabase
      .from("garumis")
      .select("id, nombre, nombre_cientifico, original_id, etapa_evolutiva, descripcion, estado");
    if (originalId) query = query.eq("original_id", originalId);
    void query.order("nombre").then(({ data: rows }) => {
      if (cancelado) return;
      setData((rows ?? []) as Garumi[]);
      setLoading(false);
    });
    return () => { cancelado = true; };
  }, [originalId]);

  return { garumis: data, loading };
}

function useRasgosPorGarumi(garumiId: string | null) {
  const [data, setData] = useState<Rasgo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!garumiId) { setData([]); return; }
    let cancelado = false;
    setLoading(true);
    void supabase
      .from("garumi_rasgos")
      .select("id, nombre, descripcion, tipo")
      .eq("garumi_id", garumiId)
      .then(({ data: rows }) => {
        if (cancelado) return;
        setData((rows ?? []) as Rasgo[]);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, [garumiId]);

  return { rasgos: data, loading };
}

function useEvoluciones() {
  const [data, setData] = useState<Evolucion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from("garumi_evoluciones")
      .select(`
        id, garumi_origen_id, garumi_destino_id, original_id, tipo_evolucion, descripcion,
        origen:garumis!garumi_evoluciones_garumi_origen_id_fkey(nombre),
        destino:garumis!garumi_evoluciones_garumi_destino_id_fkey(nombre),
        original:garumi_originales!garumi_evoluciones_original_id_fkey(nombre)
      `)
      .then(({ data: rows }) => {
        if (cancelado) return;
        const mapped: Evolucion[] = (rows ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          garumi_origen_id: r.garumi_origen_id as string | null,
          garumi_destino_id: r.garumi_destino_id as string | null,
          original_id: r.original_id as string | null,
          tipo_evolucion: r.tipo_evolucion as string | null,
          descripcion: r.descripcion as string | null,
          origen_nombre: (r.origen as { nombre: string } | null)?.nombre ?? null,
          destino_nombre: (r.destino as { nombre: string } | null)?.nombre ?? null,
          original_nombre: (r.original as { nombre: string } | null)?.nombre ?? null,
        }));
        setData(mapped);
        setLoading(false);
      });
    return () => { cancelado = true; };
  }, []);

  return { evoluciones: data, loading };
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={18} strokeWidth={2} className="animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <p className="py-8 text-center" style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", fontSize: 12 }}>
      {mensaje}
    </p>
  );
}

function RasgoChip({ nombre, tipo }: { nombre: string; tipo?: string | null }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 font-semibold"
      style={{
        borderRadius: "var(--radius-btn)",
        background: "color-mix(in srgb, var(--primary) 8%, transparent)",
        border: "var(--border-width) solid color-mix(in srgb, var(--primary) 15%, transparent)",
        color: "color-mix(in srgb, var(--primary) 70%, transparent)",
        fontSize: 10,
        letterSpacing: "0.04em",
      }}
    >
      {tipo && (
        <span style={{ color: "color-mix(in srgb, var(--primary) 40%, transparent)", marginRight: 4 }}>
          {tipo} ·{" "}
        </span>
      )}
      {nombre}
    </span>
  );
}

// ── Sub-vistas ────────────────────────────────────────────────────────────────

function FichaGarumi({ garumi, onClose }: { garumi: Garumi; onClose: () => void }) {
  const { rasgos, loading } = useRasgosPorGarumi(garumi.id);

  return (
    <div
      className="flex flex-col gap-4 p-5"
      style={{
        borderRadius: "var(--radius-card)",
        border: "var(--border-width) solid color-mix(in srgb, var(--primary) 14%, transparent)",
        background: "color-mix(in srgb, var(--primary) 3%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black uppercase tracking-widest" style={{ fontSize: 13, color: "var(--primary)" }}>
            {garumi.nombre}
          </p>
          {garumi.nombre_cientifico && (
            <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 45%, transparent)", fontStyle: "italic" }}>
              {garumi.nombre_cientifico}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 transition-all flex-shrink-0"
          style={{
            borderRadius: "var(--radius-btn)",
            background: "color-mix(in srgb, var(--primary) 7%, transparent)",
            color: "color-mix(in srgb, var(--primary) 55%, transparent)",
            fontSize: 10,
            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
          }}
        >
          <ChevronLeft size={11} /> cerrar
        </button>
      </div>

      {garumi.etapa_evolutiva && (
        <RasgoChip nombre={garumi.etapa_evolutiva} tipo="etapa" />
      )}

      {garumi.descripcion && (
        <p className="leading-relaxed" style={{ fontSize: 12, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
          {garumi.descripcion}
        </p>
      )}

      <div>
        <p className="font-black uppercase tracking-widest mb-2" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
          Rasgos
        </p>
        {loading ? (
          <Spinner />
        ) : rasgos.length === 0 ? (
          <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Sin rasgos registrados</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {rasgos.map((r) => <RasgoChip key={r.id} nombre={r.nombre} tipo={r.tipo} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function VistaCatalogo({ originales }: { originales: Original[] }) {
  const [filtroOriginal, setFiltroOriginal] = useState<string | null>(null);
  const { garumis, loading } = useGarumis(filtroOriginal);
  const [garumiActivo, setGarumiActivo] = useState<Garumi | null>(null);

  const nombreOriginal = (id: string | null) =>
    originales.find((o) => o.id === id)?.nombre ?? "—";

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[{ id: null, nombre: "Todos" }, ...originales].map((o) => (
          <button
            key={o.id ?? "todos"}
            type="button"
            onClick={() => { setFiltroOriginal(o.id); setGarumiActivo(null); }}
            className="px-3 py-1 font-black uppercase tracking-widest transition-all"
            style={{
              borderRadius: "var(--radius-btn)",
              fontSize: 10,
              background: filtroOriginal === o.id
                ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                : "color-mix(in srgb, var(--primary) 5%, transparent)",
              color: "var(--primary)",
              border: "var(--border-width) solid color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          >
            {o.nombre}
          </button>
        ))}
      </div>

      {garumiActivo && (
        <FichaGarumi garumi={garumiActivo} onClose={() => setGarumiActivo(null)} />
      )}

      {loading ? (
        <Spinner />
      ) : garumis.length === 0 ? (
        <EmptyState mensaje="No hay Garumis registrados todavía." />
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {garumis.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGarumiActivo(g.id === garumiActivo?.id ? null : g)}
              className="text-left flex flex-col gap-1.5 p-3.5 transition-all"
              style={{
                borderRadius: "var(--radius-card)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                background: garumiActivo?.id === g.id
                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : "color-mix(in srgb, var(--primary) 3%, transparent)",
              }}
              onMouseEnter={(e) => {
                if (garumiActivo?.id === g.id) return;
                (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 6%, transparent)";
              }}
              onMouseLeave={(e) => {
                if (garumiActivo?.id === g.id) return;
                (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 3%, transparent)";
              }}
            >
              <p className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
                {g.nombre}
              </p>
              {g.nombre_cientifico && (
                <p style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)", fontStyle: "italic" }}>
                  {g.nombre_cientifico}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-0.5">
                {g.original_id && <RasgoChip nombre={nombreOriginal(g.original_id)} tipo="linaje" />}
                {g.etapa_evolutiva && <RasgoChip nombre={g.etapa_evolutiva} tipo="etapa" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VistaOriginales({ originales, loading }: { originales: Original[]; loading: boolean }) {
  const [activoId, setActivoId] = useState<string | null>(null);
  const { rasgos, loading: loadingRasgos } = useRasgosPorOriginal(activoId);
  const { garumis: descendientes } = useGarumis(activoId);

  if (loading) return <Spinner />;
  if (originales.length === 0) return <EmptyState mensaje="No hay Originales registrados." />;

  return (
    <div className="flex flex-col gap-3">
      {originales.map((o) => {
        const abierto = activoId === o.id;
        return (
          <div
            key={o.id}
            style={{
              borderRadius: "var(--radius-card)",
              border: "var(--border-width) solid color-mix(in srgb, var(--primary) 14%, transparent)",
              background: abierto
                ? "color-mix(in srgb, var(--primary) 5%, transparent)"
                : "color-mix(in srgb, var(--primary) 2%, transparent)",
              overflow: "hidden",
              transition: "background 0.15s",
            }}
          >
            <button
              type="button"
              onClick={() => setActivoId(abierto ? null : o.id)}
              className="flex items-center justify-between px-4 py-3 w-full text-left"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={13} strokeWidth={2} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span className="font-black uppercase tracking-widest" style={{ fontSize: 12, color: "var(--primary)" }}>
                  {o.nombre}
                </span>
                {o.estado === "borrador" && (
                  <span className="font-semibold uppercase" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>
                    Borrador
                  </span>
                )}
              </div>
              <ChevronLeft
                size={13}
                strokeWidth={2}
                style={{
                  color: "color-mix(in srgb, var(--primary) 40%, transparent)",
                  transform: abierto ? "rotate(-90deg)" : "rotate(180deg)",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              />
            </button>

            {abierto && (
              <div className="px-4 pb-4 flex flex-col gap-3">
                {o.descripcion && (
                  <p className="leading-relaxed" style={{ fontSize: 12, color: "color-mix(in srgb, var(--primary) 60%, transparent)" }}>
                    {o.descripcion}
                  </p>
                )}

                {o.rasgo_comun && (
                  <div>
                    <p className="font-black uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                      Rasgo heredado
                    </p>
                    <RasgoChip nombre={o.rasgo_comun} />
                  </div>
                )}

                <div>
                  <p className="font-black uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                    Rasgos del Original
                  </p>
                  {loadingRasgos ? (
                    <Spinner />
                  ) : rasgos.length === 0 ? (
                    <p style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 35%, transparent)" }}>Sin rasgos adicionales</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rasgos.map((r) => <RasgoChip key={r.id} nombre={r.nombre} tipo={r.tipo} />)}
                    </div>
                  )}
                </div>

                {descendientes.length > 0 && (
                  <div>
                    <p className="font-black uppercase tracking-widest mb-1.5" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                      Especies descendientes ({descendientes.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {descendientes.map((d) => (
                        <span
                          key={d.id}
                          className="px-2 py-0.5 font-semibold"
                          style={{
                            borderRadius: "var(--radius-btn)",
                            background: "color-mix(in srgb, var(--primary) 6%, transparent)",
                            border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                            color: "color-mix(in srgb, var(--primary) 65%, transparent)",
                            fontSize: 10,
                          }}
                        >
                          {d.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VistaArbol({ originales, loadingOriginales }: { originales: Original[]; loadingOriginales: boolean }) {
  const { evoluciones, loading } = useEvoluciones();
  const [filtroOriginal, setFiltroOriginal] = useState<string | null>(null);

  const evolucionesFiltradas = filtroOriginal
    ? evoluciones.filter((e) => e.original_id === filtroOriginal)
    : evoluciones;

  return (
    <div className="flex flex-col gap-4">
      {!loadingOriginales && originales.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[{ id: null, nombre: "Todos los linajes" }, ...originales].map((o) => (
            <button
              key={o.id ?? "todos"}
              type="button"
              onClick={() => setFiltroOriginal(o.id)}
              className="px-3 py-1 font-black uppercase tracking-widest transition-all"
              style={{
                borderRadius: "var(--radius-btn)",
                fontSize: 10,
                background: filtroOriginal === o.id
                  ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                  : "color-mix(in srgb, var(--primary) 5%, transparent)",
                color: "var(--primary)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 18%, transparent)",
              }}
            >
              {o.nombre}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : evolucionesFiltradas.length === 0 ? (
        <EmptyState mensaje="No hay evoluciones registradas todavía." />
      ) : (
        <div className="flex flex-col gap-2">
          {evolucionesFiltradas.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderRadius: "var(--radius-card)",
                border: "var(--border-width) solid color-mix(in srgb, var(--primary) 11%, transparent)",
                background: "color-mix(in srgb, var(--primary) 2%, transparent)",
              }}
            >
              <div className="flex flex-col gap-0.5 min-w-0" style={{ flex: "1 1 0" }}>
                {e.original_nombre && !e.garumi_origen_id && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={10} strokeWidth={2} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span className="font-black uppercase tracking-widest truncate" style={{ fontSize: 10, color: "var(--primary)" }}>
                      {e.original_nombre}
                    </span>
                  </div>
                )}
                {e.origen_nombre && (
                  <span className="font-semibold truncate" style={{ fontSize: 11, color: "color-mix(in srgb, var(--primary) 70%, transparent)" }}>
                    {e.origen_nombre}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <GitMerge size={13} strokeWidth={1.5} style={{ color: "color-mix(in srgb, var(--primary) 30%, transparent)" }} />
                {e.tipo_evolucion && (
                  <span className="font-semibold uppercase" style={{ fontSize: 9, color: "color-mix(in srgb, var(--primary) 35%, transparent)", letterSpacing: "0.06em" }}>
                    {e.tipo_evolucion}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5 min-w-0" style={{ flex: "1 1 0" }}>
                {e.destino_nombre && (
                  <span className="font-black uppercase tracking-widest truncate" style={{ fontSize: 11, color: "var(--primary)" }}>
                    {e.destino_nombre}
                  </span>
                )}
                {e.descripcion && (
                  <span className="truncate" style={{ fontSize: 10, color: "color-mix(in srgb, var(--primary) 45%, transparent)" }}>
                    {e.descripcion}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const SUBSECCIONES: { key: SubseccionKey; label: string; descripcion: string; Icon: React.ElementType }[] = [
  {
    key: "catalogo",
    label: "Catálogo",
    descripcion: "Fichas de todas las especies Garumi con filtros por Original, etapa evolutiva y capacidades.",
    Icon: Leaf,
  },
  {
    key: "arbol",
    label: "Árbol de linajes",
    descripcion: "Visualización de cada Original y sus descendientes, con líneas evolutivas y ramificaciones.",
    Icon: GitBranch,
  },
  {
    key: "originales",
    label: "Originales",
    descripcion: "Fichas de Orumi, Varum y Nyru: naturaleza, rasgos de linaje y especies descendientes.",
    Icon: Sparkles,
  },
];

export function GarumisSection() {
  const [subseccion, setSubseccion] = useState<SubseccionKey | null>(null);
  const { originales, loading: loadingOriginales } = useOriginales();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg-main)" }}>
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Breadcrumb */}
        {subseccion && (
          <div className="flex items-center gap-2 mb-5">
            <button
              type="button"
              onClick={() => setSubseccion(null)}
              className="flex items-center gap-1.5 transition-all"
              style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              <ChevronLeft size={12} strokeWidth={2.5} />
              Garumis
            </button>
            <span style={{ color: "color-mix(in srgb, var(--primary) 25%, transparent)", fontSize: 11 }}>›</span>
            <span className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
              {SUBSECCIONES.find((s) => s.key === subseccion)?.label}
            </span>
          </div>
        )}

        {/* Menú principal */}
        {!subseccion && (
          <>
            <div className="mb-5">
              <button
                type="button"
                className="flex items-center gap-2 px-4 transition-all"
                style={{
                  height: 36,
                  borderRadius: "var(--radius-btn)",
                  background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "var(--primary)",
                  border: "var(--border-width) solid color-mix(in srgb, var(--primary) 18%, transparent)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 16%, transparent)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 10%, transparent)"; }}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span className="text-micro font-black uppercase tracking-widest">Nuevo Garumi</span>
              </button>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
              {SUBSECCIONES.map(({ key, label, descripcion, Icon }) => (
                <button
                  key={key}
                  type="button"
                  className="text-left flex flex-col gap-2 p-4 transition-all"
                  style={{
                    borderRadius: "var(--radius-card)",
                    border: "var(--border-width) solid color-mix(in srgb, var(--primary) 12%, transparent)",
                    background: "color-mix(in srgb, var(--primary) 4%, transparent)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--primary) 4%, transparent)"; }}
                  onClick={() => setSubseccion(key)}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} strokeWidth={2} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    <span className="font-black uppercase tracking-widest" style={{ fontSize: 11, color: "var(--primary)" }}>
                      {label}
                    </span>
                  </div>
                  <p style={{ color: "color-mix(in srgb, var(--primary) 55%, transparent)", fontSize: 11, lineHeight: 1.5 }}>
                    {descripcion}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Contenido de subsección */}
        {subseccion === "catalogo" && <VistaCatalogo originales={originales} />}
        {subseccion === "originales" && <VistaOriginales originales={originales} loading={loadingOriginales} />}
        {subseccion === "arbol" && <VistaArbol originales={originales} loadingOriginales={loadingOriginales} />}

      </div>
    </div>
  );
}
